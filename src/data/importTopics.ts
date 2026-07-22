import type { ExtractedDocument } from '../ingest/types'
import type { Document, DocumentType, Topic, TopicSection } from './schema'
import type { SqlConnection } from './db'
import type { TextTopicSuggestion } from '../ai/types'
import { normalizeForCompare } from '../ingest/extract'
import { insertDocument } from './documentsRepo'
import { insertTopic } from './topicsRepo'
import { insertTopicSection } from './topicSectionsRepo'

/**
 * Verbindet `ingest/` (liefert `ExtractedDocument`) mit `data/` (SQLite-Schema,
 * siehe DATA_MODEL.md „Kern"). Schreibt `documents`, `topics`,
 * `topic_sections` — noch nicht `courses` (das entsteht vor dem Import, im
 * Fach-Setup).
 *
 * Echte SQL-Operationen über `SqlConnection` (siehe `data/db.ts`) — jedes
 * Kapitel wird sequenziell eingefügt, die dabei von der Datenbank
 * vergebene echte `id` (`AUTOINCREMENT`) fließt direkt in die zugehörige
 * `topic_section` ein. Kein separates ID-Remapping nötig (anders als z. B.
 * beim Kurs-Import in `data/courseExport.ts`), weil hier nichts vorab
 * lokal mit geratenen IDs berechnet wird.
 *
 * **Ersetzt die frühere `SqlExecutor`/`importExtractedDocument`-Variante**
 * (nie tatsächlich angebunden, siehe CONTEXT.md „Persistenz-Härtung") —
 * `SqlExecutor` kannte nur `run()` (INSERT), `SqlConnection` kam erst mit
 * dem echten `tauri-plugin-sql`-Anschluss und bringt auch `select()` mit.
 * Ebenso ersetzt: die reine Array-Variante `topicsFromExtractedDocument`
 * (kein DB-Zugriff, geratene IDs) — jetzt, wo eine echte DB-Verbindung
 * beim Import zur Verfügung steht, braucht es diesen Zwischenschritt nicht
 * mehr.
 */

/**
 * SHA-256 des PDF-Inhalts als Hex-String, für `documents.sha256`
 * (DATA_MODEL.md „Kern"). Über `crypto.subtle` (Web-Crypto-API,
 * Browser-Standard, im Tauri-Webview wie im Vite-Dev-Server verfügbar) —
 * keine neue Abhängigkeit nötig.
 */
export async function computeSha256(data: Uint8Array): Promise<string> {
  // Kopie in einen frischen, garantiert echten ArrayBuffer — data.buffer
  // könnte laut TS-DOM-Typisierung ein SharedArrayBuffer sein, den
  // crypto.subtle.digest nicht akzeptiert.
  const copy = new Uint8Array(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', copy)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export interface DocumentMeta {
  /** Realer Pfad unter `$APPDATA/documents/` — siehe `documentsRepo.ts` `NewDocumentInput.stored_path`-Kommentar. */
  storedPath: string
  sha256: string
  docType: DocumentType
  /** Nur bei `docType === 'sonstiges'` gesetzt — vom Nutzer frei eingegebene Bezeichnung. */
  docTypeLabel: string | null
}

export interface PersistedImport {
  document: Document
  /** Ein Eintrag pro Kapitel, in Reihenfolge von `extracted.chapters`. */
  topics: Topic[]
  topicSections: TopicSection[]
}

/**
 * Jedes Kapitel wird 1:1 zu einem Thema (`topics`, `parent_id = NULL`) —
 * die Ingest-Pipeline erkennt aktuell nur Kapitel, keine Unterthemen. Eine
 * tiefere Gliederung ist eine spätere Erweiterung.
 */
const DEFAULT_WEIGHT = 3
const DEFAULT_DIFFICULTY = 3

/**
 * Legt ein importiertes Dokument samt Themenbaum in der Datenbank an.
 * `chapter.slides` enthält nach `detectChapters` nur Inhaltsfolien, keine
 * Trennfolien (siehe `chapters.ts` `buildChapters`) — Trennfolien tragen
 * daher korrekt nichts zum Umfang bei, ein Kapitel ohne Folien bekommt
 * keine `topic_section`.
 *
 * `parentTopicId`: beim Ordner-Import (`App.tsx` `importFolder`,
 * `ensureFolderTopicPath` unten) hängen die aus den PDF-Kapiteln
 * entstehenden Themen unter dem Ordner-Thema des Unterordners, in dem die
 * Datei lag — sonst (Einzeldatei-Import) bleibt es wie bisher bei
 * `parent_id = null`.
 */
export async function persistExtractedDocument(
  conn: SqlConnection,
  courseId: number,
  extracted: ExtractedDocument,
  meta: DocumentMeta,
  importedAt: string,
  parentTopicId: number | null = null,
): Promise<PersistedImport> {
  const document = await insertDocument(
    conn,
    {
      course_id: courseId,
      filename: extracted.filename,
      stored_path: meta.storedPath,
      sha256: meta.sha256,
      doc_type: meta.docType,
      doc_type_label: meta.docTypeLabel,
      pdf_pages: extracted.pdfPages,
      slide_count: extracted.slideCount,
      unique_chars: extracted.uniqueChars,
    },
    importedAt,
  )

  const topics: Topic[] = []
  const topicSections: TopicSection[] = []

  for (const [index, chapter] of extracted.chapters.entries()) {
    const topic = await insertTopic(conn, {
      course_id: courseId,
      parent_id: parentTopicId,
      name: chapter.title,
      normalized_name: chapter.normalized,
      weight: DEFAULT_WEIGHT,
      difficulty: DEFAULT_DIFFICULTY,
      sort_order: index,
      status: 'offen',
      manual_override: 0,
    })
    topics.push(topic)

    if (chapter.slides.length === 0) continue
    const pageNumbers = chapter.slides.flatMap((slide) => slide.pageNumbers)
    // Summe der Aufbau-bereinigten Zeichen je Folie — konsistent mit
    // `uniqueCharCount` in slides.ts, das ebenfalls über bereits gruppierte
    // Folien zählt, nicht über rohe Seiten.
    const section = await insertTopicSection(conn, {
      topic_id: topic.id,
      document_id: document.id,
      page_start: Math.min(...pageNumbers),
      page_end: Math.max(...pageNumbers),
      unique_chars: chapter.slides.reduce((sum, slide) => sum + slide.chars, 0),
      slide_count: chapter.slides.length,
    })
    topicSections.push(section)
  }

  return { document, topics, topicSections }
}

/**
 * Legt ein Dokument an, dessen Themen nicht deterministisch aus
 * Folienstruktur, sondern von der KI direkt aus dem Volltext erkannt
 * wurden (ADR-015 „Zusammenfassungen") — z. B. von Studierenden selbst
 * verfasste Zusammenfassungen ohne einheitlichen Aufbau, bei denen
 * `ingest/chapters.ts`s folienbasierte Erkennung nicht greift. Jeder
 * Themenvorschlag trägt seinen Seitenbereich bereits selbst (anders als
 * `persistExtractedDocument`, wo er aus den Folien der Kapitelgruppe
 * folgt). `slide_count` ist immer 0 — der Formel-Zuschlag pro Folie
 * (ADR-004) gilt für Diagramme/Grafiken auf Folien, nicht für
 * Fließtext-Seiten einer Zusammenfassung.
 */
export async function persistAiDetectedDocument(
  conn: SqlConnection,
  courseId: number,
  filename: string,
  meta: DocumentMeta,
  pdfPages: number,
  uniqueCharsByTopic: { suggestion: TextTopicSuggestion; uniqueChars: number }[],
  importedAt: string,
  parentTopicId: number | null = null,
): Promise<PersistedImport> {
  const document = await insertDocument(
    conn,
    {
      course_id: courseId,
      filename,
      stored_path: meta.storedPath,
      sha256: meta.sha256,
      doc_type: meta.docType,
      doc_type_label: meta.docTypeLabel,
      pdf_pages: pdfPages,
      slide_count: 0,
      unique_chars: uniqueCharsByTopic.reduce((sum, t) => sum + t.uniqueChars, 0),
    },
    importedAt,
  )

  const topics: Topic[] = []
  const topicSections: TopicSection[] = []

  for (const [index, { suggestion, uniqueChars }] of uniqueCharsByTopic.entries()) {
    const topic = await insertTopic(conn, {
      course_id: courseId,
      parent_id: parentTopicId,
      name: suggestion.name,
      normalized_name: normalizeForCompare(suggestion.name),
      weight: suggestion.weight,
      difficulty: DEFAULT_DIFFICULTY,
      sort_order: index,
      status: 'offen',
      manual_override: 0,
    })
    topics.push(topic)

    const section = await insertTopicSection(conn, {
      topic_id: topic.id,
      document_id: document.id,
      page_start: suggestion.pageStart,
      page_end: suggestion.pageEnd,
      unique_chars: uniqueChars,
      slide_count: 0,
    })
    topicSections.push(section)
  }

  return { document, topics, topicSections }
}

/**
 * Löst eine Ordner-Pfadkette (z. B. `["Consumer Theory", "Budget"]`, aus
 * `File.webkitRelativePath` beim Ordner-Import — siehe `App.tsx`
 * `importFolder`) in eine Kette verschachtelter Themen auf: jeder
 * Ordnername wird zu einem Thema, `parent_id` bildet die Verschachtelung
 * ab. Der vom Nutzer bereits angelegte Ordner wird damit wörtlich als
 * Themenbaum übernommen — anders als die folienbasierte Kapitelerkennung
 * (`persistExtractedDocument`), die nur eine Ebene kennt, ist hier durch
 * `topics.parent_id` (DATA_MODEL.md) beliebige Tiefe bereits vorgesehen.
 *
 * Wiederverwendet ein bereits vorhandenes Thema mit demselben Namen unter
 * demselben Elternthema (`normalizeForCompare`, wie bei der
 * Kapitel-Fuzzy-Zusammenführung in `ingest/chapters.ts`) — sonst würde
 * jede Datei im selben Unterordner (oder ein späterer erneuter
 * Ordner-Import über denselben Kursordner) ein eigenes Duplikat-Thema
 * anlegen. `existingTopics` muss dafür sowohl die bereits in der DB
 * stehenden als auch die in diesem Import-Durchlauf schon neu angelegten
 * Ordner-Themen enthalten (`App.tsx` reicht dafür laufend die erweiterte
 * Liste durch).
 *
 * `manual_override = 0`: der Ordnername kommt zwar vom Nutzer (er hat den
 * Ordner so benannt), ist aber eine automatische Import-Entscheidung,
 * keine nachträgliche Bearbeitung im Themenbaum — dieselbe Konvention wie
 * bei den übrigen Import-Themen oben (`data/topicTree.ts`
 * „manual_override" markiert ausschließlich UI-Bearbeitungen).
 */
export async function ensureFolderTopicPath(
  conn: SqlConnection,
  courseId: number,
  existingTopics: Topic[],
  folderNames: string[],
): Promise<{ topicId: number; createdTopics: Topic[] }> {
  if (folderNames.length === 0) throw new Error('ensureFolderTopicPath erwartet mindestens einen Ordnernamen')

  const createdTopics: Topic[] = []
  let pool = existingTopics
  let parentId: number | null = null
  let topicId: number | null = null

  for (const name of folderNames) {
    const normalized = normalizeForCompare(name)
    const existing = pool.find(
      (t) => t.course_id === courseId && t.parent_id === parentId && t.normalized_name === normalized,
    )
    if (existing) {
      topicId = existing.id
      parentId = existing.id
      continue
    }

    const siblingCount = pool.filter((t) => t.course_id === courseId && t.parent_id === parentId).length
    const topic = await insertTopic(conn, {
      course_id: courseId,
      parent_id: parentId,
      name,
      normalized_name: normalized,
      weight: DEFAULT_WEIGHT,
      difficulty: DEFAULT_DIFFICULTY,
      sort_order: siblingCount,
      status: 'offen',
      manual_override: 0,
    })
    createdTopics.push(topic)
    pool = [...pool, topic]
    topicId = topic.id
    parentId = topic.id
  }

  return { topicId: topicId!, createdTopics }
}
