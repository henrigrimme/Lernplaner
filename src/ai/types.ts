import type { ExtractedDocument } from '../ingest/types'
import type { Topic } from '../data/schema'

/**
 * Austauschbare KI-Anbieter-Schnittstelle (ARCHITECTURE.md „ai/ —
 * austauschbar"). Ein Anbieterwechsel ist Konfiguration, kein Umbau — siehe
 * `ai/index.ts`.
 */
export interface AIProvider {
  refineTopics(doc: ExtractedDocument): Promise<TopicSuggestion[]>
  estimateDifficulty(topic: Topic, sample: string): Promise<number>
}

/** Eine von der KI vorgeschlagene Themenverfeinerung — vor der Nutzerprüfung (ARCHITECTURE.md „Datenfluss beim Import"). */
export interface TopicSuggestion {
  name: string
  parentName: string | null
  /** 1–5, wie `Topic.weight`/`Topic.difficulty` (siehe `data/schema.ts`). */
  weight: 1 | 2 | 3 | 4 | 5
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
