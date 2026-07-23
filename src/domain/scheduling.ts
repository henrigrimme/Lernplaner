import { availableMinutesForDay, datesInRange } from './capacity'
import type { AvailabilityException, AvailabilityPattern, Blocker, RecurringBlocker, StudyBlockKind } from '../data/schema'

/**
 * Terminierung: weist Themen (aus `estimation.ts`) konkrete Tage zu, unter
 * Berücksichtigung der verfügbaren Zeit (`capacity.ts`) und mehrerer
 * paralleler Prüfungen. Reine Funktion, kein Datenbankzugriff
 * (ARCHITECTURE.md „domain/").
 *
 * **Verschränkung:** Themen mehrerer Fächer werden im Round-Robin auf einen
 * Tag verteilt (kleine Sitzungen je Thema, siehe `sessionChunkMinutes`)
 * statt ein Fach komplett vor dem nächsten abzuarbeiten — das entspricht
 * dem in der Lernforschung empfohlenen „interleaving" und passt zu „bis zu
 * 5 Klausuren parallel" (CONTEXT.md „Nutzer"). Innerhalb eines Tages haben
 * Themen mit näherem Prüfungstermin Vorrang (EDF — earliest deadline
 * first): sie stehen zuerst in der Rotation, bekommen ihre Zeit also auch
 * dann noch, wenn die Tageskapazität mittendrin ausgeht.
 *
 * **Wiederholung:** Nach dem Erstdurchgang eines Themas wird — mit
 * Mindestabstand `minReviewGapDays` — ein einzelner Wiederholungsblock
 * eingeplant (`reviewFraction` der ursprünglichen Zeit). Das ist **kein**
 * Spaced-Repetition-Algorithmus (FSRS kommt laut ROADMAP.md erst in
 * Phase 4, für Karteikarten/`reviews`, eine andere Tabelle) — nur ein
 * einzelner Auffrischungsblock vor der Prüfung.
 *
 * **Nicht Teil dieses Moduls:** Rückstand *mit bereits erledigten Blöcken*
 * neu einplanen und als Diff anzeigen (ADR-005 „nie automatisch anwenden")
 * — das ist `replanning.ts`, noch nicht gebaut. Diese Funktion kann aber
 * erneut mit einem späteren `from` und den noch offenen Themen aufgerufen
 * werden, um „ab heute neu planen" zu simulieren (siehe Tests) — nur ohne
 * die Diff-Anzeige und Nutzerbestätigung, die ADR-005 für die echte
 * Neuplanung verlangt.
 */

/**
 * Eine Sitzung dauert höchstens so lange — größere Themen verteilen sich
 * über mehrere Tage/Sitzungen. Final entschieden (Session vom 20.07.2026,
 * auf Nutzerwunsch): 45 Min. liegt mittig im Bereich, den die Pomodoro-
 * Recherche für Lernstoff nahelegt (35–50 Min., siehe CONTEXT.md
 * „Recherche: Pomodoro/Session-Timing") — kein exakt validierter Wert,
 * aber kein Blindschuss mehr. Über `ScheduleOptions.sessionChunkMinutes`
 * weiterhin überschreibbar, z. B. sobald Phase 3 einstellbare Presets
 * liefert.
 */
const DEFAULT_SESSION_CHUNK_MINUTES = 45

/**
 * Anteil der Erstdurchgang-Zeit, der als einzelner Wiederholungsblock
 * eingeplant wird. Final entschieden (siehe oben) — kein Bezug zu SM-2/FSRS
 * (die gelten für Karteikarten, siehe CONTEXT.md „Recherche: Spaced
 * Repetition"), sondern ein pragmatischer Auffrischer vor der Prüfung.
 * Über `ScheduleOptions.reviewFraction` überschreibbar.
 */
const DEFAULT_REVIEW_FRACTION = 0.3

/**
 * Mindestabstand zwischen Erstdurchgang-Ende und Wiederholung. Final
 * entschieden (siehe oben). Über `ScheduleOptions.minReviewGapDays`
 * überschreibbar.
 */
const DEFAULT_MIN_REVIEW_GAP_DAYS = 3

export interface SchedulingTopic {
  topicId: number
  assessmentId: number
  /** Aus `estimateMinutes` (Erstdurchgang), siehe `estimation.ts`. */
  neededMinutes: number
}

export interface SchedulingAssessment {
  id: number
  /** ISO-Datum, der Prüfungstag selbst wird nicht mehr verplant (wie `capacity.ts`s `to`). */
  date: string
}

export interface ScheduledBlock {
  topic_id: number
  assessment_id: number
  kind: StudyBlockKind
  planned_date: string
  planned_minutes: number
  /** Reihenfolge innerhalb des Tages, bei 0 beginnend. */
  planned_order: number
}

export interface UnscheduledRemainder {
  topicId: number
  assessmentId: number
  kind: StudyBlockKind
  minutes: number
}

export interface ScheduleResult {
  blocks: ScheduledBlock[]
  /** Zeit, die nicht mehr untergebracht wurde — Grundlage für einen Streichvorschlag in der UI. */
  unscheduled: UnscheduledRemainder[]
}

export interface ScheduleOptions {
  sessionChunkMinutes?: number
  reviewFraction?: number
  minReviewGapDays?: number
}

interface TopicState {
  topicId: number
  assessmentId: number
  examDate: string
  erstNeeded: number
  reviewNeeded: number
  firstPassDoneOn: string | null
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (new Date(`${b}T00:00:00.000Z`).getTime() - new Date(`${a}T00:00:00.000Z`).getTime()) / msPerDay,
  )
}

/** Welche Phase an diesem Tag für dieses Thema dran ist — `null`, wenn keine Zeit mehr gebraucht wird. */
function activePhase(
  state: TopicState,
  date: string,
  minReviewGapDays: number,
): { kind: StudyBlockKind; remaining: number } | null {
  if (date >= state.examDate) return null
  if (state.erstNeeded > 0) return { kind: 'erstdurchgang', remaining: state.erstNeeded }
  if (
    state.reviewNeeded > 0 &&
    state.firstPassDoneOn !== null &&
    daysBetween(state.firstPassDoneOn, date) >= minReviewGapDays
  ) {
    return { kind: 'wiederholung', remaining: state.reviewNeeded }
  }
  return null
}

export function scheduleStudyBlocks(
  topics: SchedulingTopic[],
  assessments: SchedulingAssessment[],
  from: string,
  pattern: AvailabilityPattern[],
  exceptions: AvailabilityException[],
  blockers: Blocker[],
  options: ScheduleOptions = {},
  // Ans Ende gestellt (nicht vor `options`), damit bestehende Aufrufer mit
  // `options` als siebtem Positionsargument unverändert funktionieren
  // (Migration 0006, Nutzerwunsch "wiederkehrende Tages-Blocker").
  recurringBlockers: RecurringBlocker[] = [],
): ScheduleResult {
  const sessionChunkMinutes = options.sessionChunkMinutes ?? DEFAULT_SESSION_CHUNK_MINUTES
  const reviewFraction = options.reviewFraction ?? DEFAULT_REVIEW_FRACTION
  const minReviewGapDays = options.minReviewGapDays ?? DEFAULT_MIN_REVIEW_GAP_DAYS

  const examDateById = new Map(assessments.map((a) => [a.id, a.date]))
  const states: TopicState[] = topics
    .filter((t) => t.neededMinutes > 0)
    .map((t) => {
      const examDate = examDateById.get(t.assessmentId)
      if (!examDate) throw new Error(`Keine Prüfung mit id ${t.assessmentId} gefunden`)
      return {
        topicId: t.topicId,
        assessmentId: t.assessmentId,
        examDate,
        erstNeeded: t.neededMinutes,
        reviewNeeded: Math.round(t.neededMinutes * reviewFraction),
        firstPassDoneOn: null,
      }
    })

  if (states.length === 0) return { blocks: [], unscheduled: [] }

  const horizon = states.reduce((latest, s) => (s.examDate > latest ? s.examDate : latest), states[0]!.examDate)
  const blocks: ScheduledBlock[] = []

  for (const date of datesInRange(from, horizon)) {
    let dayRemaining = availableMinutesForDay(date, pattern, exceptions, blockers, recurringBlockers)
    if (dayRemaining <= 0) continue

    // EDF: nähere Prüfungstermine zuerst in der Rotation, stabil nach topicId.
    const ordered = [...states].sort(
      (a, b) => a.examDate.localeCompare(b.examDate) || a.topicId - b.topicId,
    )

    let order = 0
    let progressedInRound = true
    while (dayRemaining > 0 && progressedInRound) {
      progressedInRound = false
      for (const state of ordered) {
        if (dayRemaining <= 0) break
        const phase = activePhase(state, date, minReviewGapDays)
        if (!phase) continue

        const chunk = Math.min(sessionChunkMinutes, phase.remaining, dayRemaining)
        if (chunk <= 0) continue

        blocks.push({
          topic_id: state.topicId,
          assessment_id: state.assessmentId,
          kind: phase.kind,
          planned_date: date,
          planned_minutes: chunk,
          planned_order: order++,
        })

        if (phase.kind === 'erstdurchgang') {
          state.erstNeeded -= chunk
          if (state.erstNeeded === 0) state.firstPassDoneOn = date
        } else {
          state.reviewNeeded -= chunk
        }
        dayRemaining -= chunk
        progressedInRound = true
      }
    }
  }

  const unscheduled: UnscheduledRemainder[] = []
  for (const state of states) {
    if (state.erstNeeded > 0) {
      unscheduled.push({
        topicId: state.topicId,
        assessmentId: state.assessmentId,
        kind: 'erstdurchgang',
        minutes: state.erstNeeded,
      })
    }
    // Eine nie erreichte Wiederholung (Erstdurchgang unvollständig oder zu
    // knapp vor der Prüfung) zählt nicht als Defizit — sie war ohnehin nur
    // ein Zusatzangebot, kein zugesicherter Bedarf wie der Erstdurchgang.
  }

  return { blocks, unscheduled }
}
