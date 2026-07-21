import type { StudyBlock } from './schema'
import type { ScheduledBlock } from '../domain/scheduling'
import type { ReplanResult } from '../domain/replanning'

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
 * „Plan übernehmen"-Schritt, bevor überhaupt ein Verlauf existiert — für
 * den Abgleich danach siehe `applyReplan` weiter unten.
 *
 * `startId` erlaubt fortlaufende IDs, wenn diese Funktion nicht auf einen
 * leeren Bestand trifft (siehe `applyReplan`).
 */
export function materializeStudyBlocks(scheduled: ScheduledBlock[], startId = 1): StudyBlock[] {
  return scheduled.map((block, i) => ({
    id: startId + i,
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

/**
 * Übernimmt das Ergebnis einer echten Neuplanung (`domain/replanning.ts`,
 * `replan()`) in den Bestand — erst nach Bestätigung durch den Nutzer
 * aufrufen (ADR-005), diese Funktion selbst prüft das nicht.
 *
 * Ersetzt genau die noch offenen `erstdurchgang`-Blöcke (verpasste wie
 * zukünftige) durch die neu berechneten — das sind exakt die Blöcke, die
 * `replan()` betrachtet hat (siehe dortiger Kommentar). Alles andere bleibt
 * unverändert: erledigte/gestrichene Blöcke (Verlauf), `verschoben`e
 * Blöcke, sowie **alle** `wiederholung`/`uebung`/`quiz`/`puffer`-Blöcke —
 * `replan()` fasst Wiederholungen bewusst nicht an (siehe dortiger
 * Kommentar zur Fortführungslücke), ein Löschen hier würde eine
 * unveränderte Wiederholung fälschlich verwerfen.
 */
export function applyReplan(existing: StudyBlock[], result: ReplanResult): StudyBlock[] {
  const kept = existing.filter((b) => !(b.kind === 'erstdurchgang' && b.status === 'offen'))
  const startId = kept.reduce((max, b) => Math.max(max, b.id), 0) + 1
  return [...kept, ...materializeStudyBlocks(result.blocks, startId)]
}
