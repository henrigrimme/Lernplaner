import type { ExamTopicMatch } from '../ai/types'
import type { Topic } from '../data/schema'

/**
 * Reine Ableitung von Gewichtungsvorschlägen aus Altklausur-Häufigkeiten
 * (ROADMAP.md Phase 4 „Altklausur-Analyse → automatische Gewichtung").
 * Kennt weder DB noch UI noch KI (ARCHITECTURE.md „domain/") —
 * `ai/anthropicProvider.ts`/`ai/openaiProvider.ts` liefern die
 * `ExamTopicMatch[]`, hier wird nur noch gerechnet.
 *
 * **Nie automatisch angewendet** (ADR-005-Prinzip „Vorschlag, nie
 * automatisch", hier erstmals auf Themengewichte statt Planänderungen
 * übertragen): der Aufrufer (`ui/AltklausurAnalysis.tsx`) zeigt das
 * Ergebnis als Diff, `manual_override`-Themen werden nie einbezogen —
 * eine von Hand gesetzte Gewichtung darf keine Analyse überschreiben
 * (DATA_MODEL.md „Warum `manual_override` existiert").
 *
 * Schwelle bewusst konservativ: eine einzelne erkannte Frage zu einem
 * Thema ist noch kein Muster (Fehlklassifikation durch die KI ist nicht
 * ausgeschlossen) — erst ab drei Fragen in den analysierten Altklausuren
 * gilt ein Thema als „häufig geprüft" und wird um eine Stufe angehoben.
 * Ein Thema ohne Treffer wird nie abgewertet — Abwesenheit in den
 * analysierten Altklausuren ist kein Beleg dafür, dass es unwichtig ist
 * (es könnte in noch nicht importierten Altklausuren vorkommen).
 */
const FREQUENT_TOPIC_THRESHOLD = 3

export interface WeightSuggestion {
  topicId: number
  currentWeight: 1 | 2 | 3 | 4 | 5
  suggestedWeight: 1 | 2 | 3 | 4 | 5
  occurrences: number
}

export function suggestWeightAdjustments(topics: Topic[], matches: ExamTopicMatch[]): WeightSuggestion[] {
  const occurrencesByTopic = new Map(matches.map((m) => [m.topicId, m.occurrences]))
  const suggestions: WeightSuggestion[] = []

  for (const topic of topics) {
    if (topic.manual_override === 1) continue
    const occurrences = occurrencesByTopic.get(topic.id) ?? 0
    if (occurrences < FREQUENT_TOPIC_THRESHOLD) continue

    const suggestedWeight = Math.min(5, topic.weight + 1) as 1 | 2 | 3 | 4 | 5
    if (suggestedWeight === topic.weight) continue

    suggestions.push({ topicId: topic.id, currentWeight: topic.weight, suggestedWeight, occurrences })
  }

  return suggestions
}
