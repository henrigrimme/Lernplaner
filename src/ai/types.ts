import type { ExtractedDocument } from '../ingest/types'
import type { CourseLanguage, Topic } from '../data/schema'

/** Vom Nutzer wählbare Zielschwierigkeit für generierte Quizfragen (`ui/QuizSetup.tsx`). */
export type QuizDifficulty = 'einfach' | 'mittel' | 'schwer'

/**
 * Austauschbare KI-Anbieter-Schnittstelle (ARCHITECTURE.md „ai/ —
 * austauschbar"). Ein Anbieterwechsel ist Konfiguration, kein Umbau — siehe
 * `ai/index.ts`. `generateQuestions`/`classifyExamContent` tragen
 * Quiz-Generierung/Probeklausur-Simulation und Altklausur-Analyse
 * (ROADMAP.md Phase 4) — die beiden ursprünglich in ARCHITECTURE.md nur
 * angekündigten „später"-Methoden.
 */
export interface AIProvider {
  refineTopics(doc: ExtractedDocument): Promise<TopicSuggestion[]>
  estimateDifficulty(topic: Topic, sample: string): Promise<number>
  /**
   * `sourceText` ist echter Belegtext (siehe `ingest/pdf.ts`
   * `extractPageRangeText`) — nie frei erfunden, sonst ließe sich
   * `questions.source_page` nicht rechtfertigen (DATA_MODEL.md).
   * `difficulty` steuert den Anspruch der generierten Fragen (Nutzerwunsch
   * 2026-07-22, vorher nicht wählbar). `language`: Fragen/Erklärungen
   * entstehen in der Sprache des Fachs (`Course.language`, Migration
   * 0004) — unabhängig von der (immer deutschen) App-Oberfläche selbst.
   */
  generateQuestions(
    topicName: string,
    sourceText: string,
    count: number,
    difficulty: QuizDifficulty,
    language: CourseLanguage,
  ): Promise<QuestionSuggestion[]>
  /** Ordnet Altklausur-Text den übergebenen Themen zu — Grundlage für `domain/examWeighting.ts`. */
  classifyExamContent(topics: { id: number; name: string }[], examText: string): Promise<ExamTopicMatch[]>
  /**
   * Erkennt Themen samt Seitenbereich direkt aus dem Volltext (ADR-015)
   * — für Dokumente ohne einheitliche Struktur (Zusammenfassungen von
   * Studierenden, jede anders aufgebaut), bei denen die folienbasierte
   * Kapitelerkennung (`ingest/chapters.ts`) nicht greift. `pages` trägt
   * echten Seitentext (`ingest/pdf.ts` `readPages`), keine erfundenen
   * Inhalte.
   */
  detectTopicsFromText(pages: { pageNumber: number; text: string }[]): Promise<TextTopicSuggestion[]>
}

/** Welche `AIProvider`-Implementierung gerade aktiv ist (siehe `ai/index.ts`). */
export type AIProviderKind = 'anthropic' | 'openai'

/** Eine von der KI vorgeschlagene Themenverfeinerung — vor der Nutzerprüfung (ARCHITECTURE.md „Datenfluss beim Import"). */
export interface TopicSuggestion {
  name: string
  parentName: string | null
  /** 1–5, wie `Topic.weight`/`Topic.difficulty` (siehe `data/schema.ts`). */
  weight: 1 | 2 | 3 | 4 | 5
}

/**
 * Eine generierte Quizfrage vor dem Speichern (`data/questionsRepo.ts`
 * fügt `source_document_id`/`source_page` hinzu, die der Aufrufer schon
 * kennt — die KI selbst kennt nur den ihr übergebenen Textausschnitt).
 * `mc` (Multiple Choice): `options` trägt die Antwortoptionen als eigenes
 * Array (Nutzerwunsch 2026-07-22, vorher als Text in `prompt` eingebettet
 * — `ui/QuizSession.tsx` konnte die Antwort dadurch nur als Freitext
 * abfragen, nicht anklickbar machen), `answer` ist der Buchstabe der
 * richtigen Option (unverändert, referenziert `options` per Index:
 * "A" → `options[0]`). `freitext`: `answer` ist die Musterantwort,
 * Bewertung erfolgt durch Selbsteinschätzung wie bei den Karteikarten
 * (`domain/quiz.ts`), nicht durch Textvergleich — freie Antworten
 * automatisch zu vergleichen wäre unzuverlässig.
 */
export interface QuestionSuggestion {
  type: 'mc' | 'freitext'
  prompt: string
  /** Nur bei `type === 'mc'` gesetzt. */
  options?: string[]
  answer: string
  explanation: string
  difficulty: 1 | 2 | 3 | 4 | 5
}

/**
 * Ein aus Volltext erkanntes Thema (ADR-015) — anders als
 * `TopicSuggestion` (verfeinert bereits bekannte Folien-Kapitel) enthält
 * dies den Seitenbereich selbst, weil bei Zusammenfassungen keine
 * deterministische Kapitelerkennung vorausgeht. Bewusst ohne
 * `parentName`/Hierarchie — dieselbe Einschränkung wie bei
 * `data/importTopics.ts` „Jedes Kapitel wird 1:1 zu einem Thema".
 */
export interface TextTopicSuggestion {
  name: string
  pageStart: number
  pageEnd: number
  weight: 1 | 2 | 3 | 4 | 5
}

/** Wie oft ein Thema im analysierten Altklausur-Text vorkam (`domain/examWeighting.ts`). */
export interface ExamTopicMatch {
  topicId: number
  occurrences: number
}

/** Tokenverbrauch eines einzelnen KI-Aufrufs — Grundlage für `ai_usage`/ADR-007. */
export interface AIUsage {
  operation: string
  inputTokens: number
  outputTokens: number
  costEur: number
}

/** Wird nach jedem Aufruf aufgerufen, damit der Aufrufer in `ai_usage` protokollieren kann (siehe `data/aiUsageRepo.ts`). */
export type AIUsageListener = (usage: AIUsage) => void
