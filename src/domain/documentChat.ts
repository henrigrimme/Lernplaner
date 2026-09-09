import type { DocumentPage } from '../data/schema'

/**
 * „Chat mit den Unterlagen" (Nutzerwunsch 09.09.2026): wählt zu einer
 * Chat-Frage die passendsten Seiten aus dem persistenten Volltext-Index
 * (`document_pages`, Migration 0008) und bereitet sie als zitierbaren
 * Auszug für „Sven" auf.
 *
 * Reine Funktionen (ARCHITECTURE.md „domain/"), keine DB/KI/UI. Bewusst
 * **keine** Vektor-/Embedding-Suche und keine neue Bibliothek: ein
 * einfaches TF-IDF-Ranking über Wort-Teilstrings reicht für die
 * Materialmenge zweier Studierender (gleiche Abwägung wie in
 * `domain/search.ts`) und bleibt vollständig nachvollziehbar/testbar.
 */

export interface IndexedPassage {
  documentId: number
  courseId: number
  courseName: string
  filename: string
  page: number
  text: string
}

export interface RankedPassage extends IndexedPassage {
  score: number
}

export interface RankOptions {
  /** Höchstzahl zurückgegebener Passagen (Default 6). */
  limit?: number
  /** Höchstzahl Passagen aus demselben Dokument (Default 2) — sonst verdrängt ein einzelnes langes Dokument alle anderen. */
  maxPerDocument?: number
  /** Nur Passagen aus diesen Fächern berücksichtigen (leer/weggelassen = alle). */
  courseIds?: number[]
}

const DEFAULTS = { limit: 6, maxPerDocument: 2 } as const

/** Sehr häufige Füllwörter (DE + EN) — tragen nichts zur Relevanz bei. */
const STOPWORDS = new Set([
  'und', 'oder', 'aber', 'nicht', 'der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'ist', 'sind', 'war',
  'waren', 'wird', 'werden', 'wie', 'was', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches', 'für', 'von',
  'mit', 'auf', 'aus', 'bei', 'zum', 'zur', 'den', 'dem', 'des', 'im', 'in', 'am', 'an', 'als', 'auch', 'nur', 'noch',
  'schon', 'sich', 'man', 'kann', 'mir', 'mich', 'ich', 'du', 'er', 'es', 'sie', 'wir', 'ihr', 'bitte', 'mal', 'etwas',
  'the', 'a', 'an', 'and', 'or', 'but', 'not', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'for', 'with', 'on', 'in',
  'at', 'as', 'by', 'it', 'this', 'that', 'these', 'those', 'what', 'which', 'how', 'why', 'do', 'does', 'can', 'i',
  'you', 'me', 'my', 'we', 'us',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

/**
 * Rangfolge der Passagen zur `query`. TF-IDF: seltene Begriffe der Frage,
 * die in einer Passage (mehrfach) vorkommen, zählen am stärksten; lange
 * Passagen werden leicht gedämpft, damit sie nicht allein durch Masse
 * gewinnen. Passagen ohne einen einzigen Frage-Begriff fallen raus.
 */
export function rankPassages(query: string, passages: IndexedPassage[], options: RankOptions = {}): RankedPassage[] {
  const limit = options.limit ?? DEFAULTS.limit
  const maxPerDocument = options.maxPerDocument ?? DEFAULTS.maxPerDocument
  const courseFilter = options.courseIds && options.courseIds.length > 0 ? new Set(options.courseIds) : null

  const queryTerms = [...new Set(tokenize(query))]
  if (queryTerms.length === 0) return []

  const pool = courseFilter ? passages.filter((p) => courseFilter.has(p.courseId)) : passages
  if (pool.length === 0) return []

  const tokensByPassage = pool.map((p) => tokenize(p.text))

  // Dokumentfrequenz je Frage-Begriff (über den gefilterten Pool).
  const df = new Map<string, number>()
  for (const term of queryTerms) df.set(term, 0)
  for (const tokens of tokensByPassage) {
    const present = new Set(tokens)
    for (const term of queryTerms) if (present.has(term)) df.set(term, df.get(term)! + 1)
  }

  const n = pool.length
  const idf = new Map<string, number>()
  for (const term of queryTerms) idf.set(term, Math.log(1 + n / (1 + df.get(term)!)))

  const scored: RankedPassage[] = []
  for (let i = 0; i < pool.length; i++) {
    const tokens = tokensByPassage[i]!
    if (tokens.length === 0) continue
    const tf = new Map<string, number>()
    for (const token of tokens) if (idf.has(token)) tf.set(token, (tf.get(token) ?? 0) + 1)
    if (tf.size === 0) continue

    let raw = 0
    for (const [term, count] of tf) raw += (1 + Math.log(count)) * idf.get(term)!
    const score = raw / Math.log(2 + tokens.length)
    if (score <= 0) continue
    scored.push({ ...pool[i]!, score })
  }

  scored.sort((a, b) => b.score - a.score || a.documentId - b.documentId || a.page - b.page)

  const perDocument = new Map<number, number>()
  const result: RankedPassage[] = []
  for (const passage of scored) {
    if (result.length >= limit) break
    const used = perDocument.get(passage.documentId) ?? 0
    if (used >= maxPerDocument) continue
    perDocument.set(passage.documentId, used + 1)
    result.push(passage)
  }
  return result
}

/**
 * Baut den Auszugs-Block für den Chat-Kontext (`ai/prompts.ts`
 * `buildChatSystemPrompt` erklärt Sven, wie er ihn nutzt). Jeder Auszug
 * ist mit Fach, Dateiname und Seitenzahl versehen, damit Sven sauber
 * zitieren kann. Leerer String, wenn es keine Treffer gibt.
 */
export function formatExcerptsForPrompt(passages: RankedPassage[], maxCharsPerPassage = 1200): string {
  if (passages.length === 0) return ''
  const lines = [
    'AUSZÜGE AUS DEN UNTERLAGEN (aus den importierten Dokumenten des Nutzers, nach Relevanz zur letzten Frage):',
    'Nutze sie, wenn sie zur Frage passen, und zitiere die Quelle als (Dateiname, S. X).',
    'Decken die Auszüge die Frage nicht ab, sag das offen und rate nicht.',
    '',
  ]
  passages.forEach((p, i) => {
    const body = p.text.length > maxCharsPerPassage ? `${p.text.slice(0, maxCharsPerPassage)}…` : p.text
    lines.push(`[${i + 1}] Fach „${p.courseName}" — „${p.filename}", S. ${p.page}:`)
    lines.push(body)
    lines.push('')
  })
  return lines.join('\n').trimEnd()
}
