import type { Chapter, ExtractedDocument } from '../ingest/types'
import type { DocumentType, Topic, TopicSection } from './schema'

/**
 * Verbindet `ingest/` (liefert `ExtractedDocument`) mit `data/` (SQLite-Schema,
 * siehe DATA_MODEL.md „Kern"). Schreibt `documents`, `topics`,
 * `topic_sections` — noch nicht `courses` (das entsteht vor dem Import, im
 * Fach-Setup, nicht Teil dieses Schritts).
 *
 * Bewusst keine feste Anbindung an `better-sqlite3` oder `tauri-plugin-sql`:
 * `SqlExecutor` ist die schmale Schnittstelle, die beide erfüllen können
 * (Tests laufen gegen `better-sqlite3`, siehe ARCHITECTURE.md „ai/" für das
 * gleiche Muster bei austauschbaren Anbindungen). Der eigentliche
 * Tauri-Rahmen kommt erst später (siehe CONTEXT.md Abschnitt 8).
 */
export interface SqlExecutor {
  /** Führt ein INSERT aus und liefert die neue `id` (AUTOINCREMENT). */
  run(sql: string, params: unknown[]): Promise<number>
}

export interface DocumentMeta {
  storedPath: string
  sha256: string
  docType: DocumentType
}

export interface ImportResult {
  documentId: number
  /** Ein Eintrag pro Kapitel, in Reihenfolge von `extracted.chapters`. */
  topicIds: number[]
}

/**
 * Jedes Kapitel wird 1:1 zu einem Thema (`topics`, `parent_id = NULL`) —
 * die Ingest-Pipeline erkennt aktuell nur Kapitel, keine Unterthemen. Eine
 * tiefere Gliederung ist eine spätere Erweiterung, kein Teil dieses Schritts.
 */
const DEFAULT_WEIGHT = 3
const DEFAULT_DIFFICULTY = 3

/** Legt ein importiertes Dokument samt Themenbaum in der Datenbank an. */
export async function importExtractedDocument(
  exec: SqlExecutor,
  courseId: number,
  extracted: ExtractedDocument,
  meta: DocumentMeta,
): Promise<ImportResult> {
  const documentId = await exec.run(
    `INSERT INTO documents
       (course_id, filename, stored_path, sha256, doc_type, pdf_pages, slide_count, unique_chars)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseId,
      extracted.filename,
      meta.storedPath,
      meta.sha256,
      meta.docType,
      extracted.pdfPages,
      extracted.slideCount,
      extracted.uniqueChars,
    ],
  )

  const topicIds: number[] = []
  for (const [index, chapter] of extracted.chapters.entries()) {
    topicIds.push(await importChapterAsTopic(exec, courseId, documentId, chapter, index))
  }

  return { documentId, topicIds }
}

/**
 * Ein Kapitel als Thema anlegen, plus die zugehörige `topic_section` (Seiten
 * im Dokument, Umfangsmaße). `chapter.slides` enthält nach `detectChapters`
 * nur Inhaltsfolien, keine Trennfolien (siehe `chapters.ts` `buildChapters`)
 * — Trennfolien tragen daher korrekt nichts zum Umfang bei.
 */
async function importChapterAsTopic(
  exec: SqlExecutor,
  courseId: number,
  documentId: number,
  chapter: Chapter,
  sortOrder: number,
): Promise<number> {
  const topicId = await exec.run(
    `INSERT INTO topics
       (course_id, parent_id, name, normalized_name, weight, difficulty, sort_order)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [courseId, chapter.title, chapter.normalized, DEFAULT_WEIGHT, DEFAULT_DIFFICULTY, sortOrder],
  )

  if (chapter.slides.length > 0) {
    const pageNumbers = chapter.slides.flatMap((slide) => slide.pageNumbers)
    const pageStart = Math.min(...pageNumbers)
    const pageEnd = Math.max(...pageNumbers)
    // Summe der Aufbau-bereinigten Zeichen je Folie — konsistent mit
    // `uniqueCharCount` in slides.ts, das ebenfalls über bereits gruppierte
    // Folien zählt, nicht über rohe Seiten.
    const uniqueChars = chapter.slides.reduce((sum, slide) => sum + slide.chars, 0)

    await exec.run(
      `INSERT INTO topic_sections
         (topic_id, document_id, page_start, page_end, unique_chars, slide_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [topicId, documentId, pageStart, pageEnd, uniqueChars, chapter.slides.length],
    )
  }

  return topicId
}

/**
 * Array-Variante von `importExtractedDocument`, für den Import direkt im
 * Browser vor dem Tauri-Rahmen (kein `tauri-plugin-sql`, `better-sqlite3`
 * ist reine Node-Testinfrastruktur und im Frontend-Bundle nicht nutzbar).
 * Dieselbe Kapitel-→-Thema-Zuordnung wie `importExtractedDocument`, aber
 * gegen lokale Arrays statt `SqlExecutor`, nach dem Muster von
 * `courses.ts`/`topicTree.ts` (`nextId` statt `AUTOINCREMENT`).
 *
 * `documentId` wird vom Aufrufer vergeben (kein `documents`-Zustand nötig,
 * solange die UI keine echte Dokumentenliste zeigt) — muss nur unter den
 * `topicSections` eindeutig sein.
 */
export function topicsFromExtractedDocument(
  extracted: ExtractedDocument,
  courseId: number,
  documentId: number,
  topics: Topic[],
  topicSections: TopicSection[],
): { topics: Topic[]; topicSections: TopicSection[] } {
  let nextTopicId = topics.reduce((max, t) => Math.max(max, t.id), 0) + 1
  let nextSectionId = topicSections.reduce((max, s) => Math.max(max, s.id), 0) + 1

  const newTopics: Topic[] = []
  const newSections: TopicSection[] = []

  extracted.chapters.forEach((chapter, index) => {
    const topicId = nextTopicId++
    newTopics.push({
      id: topicId,
      course_id: courseId,
      parent_id: null,
      name: chapter.title,
      normalized_name: chapter.normalized,
      weight: DEFAULT_WEIGHT,
      difficulty: DEFAULT_DIFFICULTY,
      sort_order: index,
      status: 'offen',
      manual_override: 0,
    })

    if (chapter.slides.length === 0) return
    const pageNumbers = chapter.slides.flatMap((slide) => slide.pageNumbers)
    newSections.push({
      id: nextSectionId++,
      topic_id: topicId,
      document_id: documentId,
      page_start: Math.min(...pageNumbers),
      page_end: Math.max(...pageNumbers),
      unique_chars: chapter.slides.reduce((sum, slide) => sum + slide.chars, 0),
      slide_count: chapter.slides.length,
    })
  })

  return { topics: [...topics, ...newTopics], topicSections: [...topicSections, ...newSections] }
}
