import type { StudyBlock } from './schema'
import type { ScheduledBlock } from '../domain/scheduling'

/**
 * Reine Editierfunktionen für `study_blocks` (wie `courses.ts`/`topicTree.ts`):
 * kein Datenbankzugriff, keine Systemuhr — Zeitstempel kommen vom Aufrufer
 * (ARCHITECTURE.md „domain/ … kennt weder DB noch UI", gilt hier für die
 * `data/`-Schicht analog). Vor dem Tauri-Rahmen gibt es noch keine echten
 * `id`-Werte aus der Datenbank — `materializeStudyBlocks` vergibt sie
 * fortlaufend, kompatibel mit dem späteren `AUTOINCREMENT`-Verhalten.
 */

/**
 * Übernimmt eine frisch berechnete Terminierung (`ScheduledBlock[]`, siehe
 * `domain/scheduling.ts`/`domain/planBuilder.ts`) als neue `StudyBlock`-
 * Zeilen mit Status `offen`.
 *
 * **Bewusst einfach:** ersetzt den gesamten bisherigen Bestand, statt ihn
 * mit dem neu berechneten Plan abzugleichen (kein Merge nach Status/id).
 * Ein Abgleich, der bereits erledigte/gestrichene Blöcke erhält und nur den
 * Rest neu einplant, ist genau die Aufgabe der echten Neuplanung
 * (`domain/replanning.ts`, ADR-005) — die liefert dafür Diff und verlangt
 * eine Bestätigung. Diese Funktion ist nur der einmalige
 * „Plan übernehmen"-Schritt, bevor überhaupt ein Verlauf existiert.
 */
export function materializeStudyBlocks(scheduled: ScheduledBlock[]): StudyBlock[] {
  return scheduled.map((block, i) => ({
    id: i + 1,
    topic_id: block.topic_id,
    assessment_id: block.assessment_id,
    kind: block.kind,
    planned_date: block.planned_date,
    planned_minutes: block.planned_minutes,
    planned_order: block.planned_order,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
  }))
}

export interface CompleteStudyBlockInput {
  actualMinutes: number
  difficultyFeedback: -1 | 0 | 1
  completedAt: string
}

/** Markiert einen Block als erledigt, inkl. tatsächlicher Dauer und Schwierigkeits-Feedback. */
export function completeStudyBlock(blocks: StudyBlock[], id: number, input: CompleteStudyBlockInput): StudyBlock[] {
  return blocks.map((b) =>
    b.id === id
      ? {
          ...b,
          status: 'erledigt',
          actual_minutes: input.actualMinutes,
          difficulty_feedback: input.difficultyFeedback,
          completed_at: input.completedAt,
        }
      : b,
  )
}
