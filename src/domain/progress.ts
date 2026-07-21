import type { StudyBlock } from '../data/schema'

/**
 * Fortschritt: mastery, Vorbereitungsgrad, nächster Schritt
 * (ARCHITECTURE.md „domain/"). Reine Funktionen über `study_blocks`, kein
 * Datenbankzugriff, keine Systemuhr — wie `capacity.ts`/`scheduling.ts`.
 *
 * Formeln wörtlich aus DATA_MODEL.md „Abgeleitete Werte" übernommen:
 * - `mastery` je Thema: aus `study_blocks` (erledigt, Feedback)
 * - Vorbereitungsgrad je Prüfung: Σ(mastery × weight) / Σ(weight)
 * - Nächster Schritt: max(weight × (1 − mastery))
 *
 * Bewusst nicht gespeichert (DATA_MODEL.md: „Speichern würde
 * Inkonsistenzen erzeugen, sobald ein Block nachträglich geändert wird") —
 * jeder Aufruf rechnet frisch aus dem aktuellen `study_blocks`-Bestand.
 */

/**
 * Wie stark Schwierigkeits-Feedback die reine Erledigungsquote nach oben
 * („zu leicht") bzw. unten („zu schwer") korrigiert. DATA_MODEL.md nennt
 * nur „aus study_blocks (erledigt, Feedback)", ohne Formel oder Gewicht —
 * dieser Wert ist erfunden, aber bewusst als benannte, leicht auffindbare
 * Konstante exportiert statt einer verstreuten Magic Number (gleiches
 * Vorgehen wie `EXAM_FORMAT_MULTIPLIER` in `estimation.ts`). Bei 0,15 kann
 * durchgängiges „zu schwer" die Erledigungsquote um bis zu 15 Prozentpunkte
 * drücken, „zu leicht" sie um ebenso viel anheben — bewusst klein, damit
 * Feedback die tatsächliche Erledigung nicht dominiert.
 */
export const FEEDBACK_MASTERY_WEIGHT = 0.15

/**
 * mastery eines einzelnen Themas aus seinen `study_blocks` (alle Arten,
 * nicht nur `erstdurchgang` — Übung/Quiz/Wiederholung zählen genauso zur
 * Beherrschung). `gestrichen`e Blöcke zählen weder zum Bedarf noch zum
 * Erledigten (Nutzer hat sie bewusst abgewählt, wie in `replanning.ts`).
 * `0`, solange nichts geplant ist — kein Fortschritt ohne Plan.
 */
export function computeTopicMastery(blocks: StudyBlock[]): number {
  const relevant = blocks.filter((b) => b.status !== 'gestrichen')
  const totalMinutes = relevant.reduce((sum, b) => sum + b.planned_minutes, 0)
  if (totalMinutes === 0) return 0

  const done = relevant.filter((b) => b.status === 'erledigt')
  const doneMinutes = done.reduce((sum, b) => sum + (b.actual_minutes ?? b.planned_minutes), 0)
  const completionRatio = doneMinutes / totalMinutes

  const feedbacks = done
    .map((b) => b.difficulty_feedback)
    .filter((f): f is -1 | 0 | 1 => f !== null)
  const avgFeedback =
    feedbacks.length === 0 ? 0 : feedbacks.reduce((sum: number, f) => sum + f, 0) / feedbacks.length

  return Math.min(1, Math.max(0, completionRatio - avgFeedback * FEEDBACK_MASTERY_WEIGHT))
}

/** mastery je `topic_id`, aus allen übergebenen Blöcken gruppiert. Themen ohne Block fehlen im Ergebnis. */
export function computeMasteryByTopic(blocks: StudyBlock[]): Map<number, number> {
  const byTopic = new Map<number, StudyBlock[]>()
  for (const block of blocks) {
    if (block.topic_id === null) continue
    const forTopic = byTopic.get(block.topic_id) ?? []
    forTopic.push(block)
    byTopic.set(block.topic_id, forTopic)
  }

  const result = new Map<number, number>()
  for (const [topicId, topicBlocks] of byTopic) {
    result.set(topicId, computeTopicMastery(topicBlocks))
  }
  return result
}

export interface ProgressTopic {
  topicId: number
  weight: 1 | 2 | 3 | 4 | 5
}

/**
 * Vorbereitungsgrad einer Prüfung: Σ(mastery × weight) / Σ(weight), über
 * `topics` — vom Aufrufer übergeben (i. d. R. alle Themen des Fachs dieser
 * Prüfung, siehe `ui/ProgressView.tsx`), nicht aus `study_blocks`
 * abgeleitet: ein Thema ohne jeden Block zählt bewusst mit `mastery = 0`
 * statt unsichtbar zu bleiben — sonst würde „noch nie angefangen" fälschlich
 * so aussehen wie „nicht relevant".
 *
 * `mastery` je Thema kommt nur aus Blöcken **dieser** `assessmentId` — ein
 * Thema, das für eine frühere Prüfung schon geübt wurde, aber für die
 * aktuelle noch keinen Block hat, zählt hier als `mastery = 0`. Bewusste
 * Vereinfachung (wie die „nächste bevorstehende Prüfung"-Wahl in
 * `planBuilder.ts`) — ein Thema müsste sonst über mehrere Prüfungen hinweg
 * verfolgt werden, wofür das Schema keine direkte Zuordnung vorsieht.
 *
 * `null`, wenn `topics` leer ist (kein Gewicht, durch das geteilt werden
 * könnte).
 */
export function computePreparedness(assessmentId: number, studyBlocks: StudyBlock[], topics: ProgressTopic[]): number | null {
  if (topics.length === 0) return null
  const masteryByTopic = computeMasteryByTopic(studyBlocks.filter((b) => b.assessment_id === assessmentId))

  let weightedSum = 0
  let weightSum = 0
  for (const topic of topics) {
    const mastery = masteryByTopic.get(topic.topicId) ?? 0
    weightedSum += mastery * topic.weight
    weightSum += topic.weight
  }
  return weightSum === 0 ? null : weightedSum / weightSum
}

export interface NextStepSuggestion {
  topicId: number
  /** weight × (1 − mastery) — je höher, desto dringender. */
  urgency: number
}

/**
 * Das Thema mit dem größten `weight × (1 − mastery)` — der nächste
 * sinnvolle Lernschritt für diese Prüfung. `null`, wenn `topics` leer ist.
 * Bei Gleichstand gewinnt das zuerst übergebene Thema (stabil, keine
 * versteckte Zufallsreihenfolge).
 */
export function suggestNextTopic(assessmentId: number, studyBlocks: StudyBlock[], topics: ProgressTopic[]): NextStepSuggestion | null {
  const masteryByTopic = computeMasteryByTopic(studyBlocks.filter((b) => b.assessment_id === assessmentId))

  let best: NextStepSuggestion | null = null
  for (const topic of topics) {
    const mastery = masteryByTopic.get(topic.topicId) ?? 0
    const urgency = topic.weight * (1 - mastery)
    if (!best || urgency > best.urgency) best = { topicId: topic.topicId, urgency }
  }
  return best
}
