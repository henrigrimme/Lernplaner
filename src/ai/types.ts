import type { ExtractedDocument } from '../ingest/types'
import type { Topic } from '../data/schema'

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
  /** `sourceText` ist echter Belegtext (siehe `ingest/pdf.ts` `extractPageRangeText`) — nie frei erfunden, sonst ließe sich `questions.source_page` nicht rechtfertigen (DATA_MODEL.md). */
  generateQuestions(topicName: string, sourceText: string, count: number): Promise<QuestionSuggestion[]>
  /** Ordnet Altklausur-Text den übergebenen Themen zu — Grundlage für `domain/examWeighting.ts`. */
  classifyExamContent(topics: { id: number; name: string }[], examText: string): Promise<ExamTopicMatch[]>
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
 * `mc` (Multiple Choice): `prompt` enthält die Antwortoptionen als Text
 * (z. B. „…\nA) …\nB) …"), `answer` ist der Buchstabe der richtigen
 * Option. `freitext`: `answer` ist die Musterantwort, Bewertung erfolgt
 * durch Selbsteinschätzung wie bei den Karteikarten (`domain/quiz.ts`),
 * nicht durch Textvergleich — freie Antworten automatisch zu vergleichen
 * wäre unzuverlässig.
 */
export interface QuestionSuggestion {
  type: 'mc' | 'freitext'
  prompt: string
  answer: string
  explanation: string
  difficulty: 1 | 2 | 3 | 4 | 5
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
