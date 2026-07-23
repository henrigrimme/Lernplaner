import {
  scheduleStudyBlocks,
  type ScheduleOptions,
  type ScheduledBlock,
  type SchedulingAssessment,
  type SchedulingTopic,
  type UnscheduledRemainder,
} from './scheduling'
import type { AvailabilityException, AvailabilityPattern, Blocker, RecurringBlocker, StudyBlock, StudyBlockKind } from '../data/schema'

/**
 * Neuberechnung und Diff (ARCHITECTURE.md „domain/"), nach ADR-005
 * („Umplanung als Vorschlag, nie automatisch"). Reine Funktionen, kein
 * Datenbankzugriff — der Aufrufer liest `study_blocks` und übergibt sie
 * hier, genau wie `scheduling.ts` weder DB noch UI noch KI kennt.
 *
 * **Was hier passiert, was nicht:** Dieses Modul berechnet den Plan neu
 * (`scheduleStudyBlocks` wiederverwendet) und liefert einen Diff zur
 * bisherigen Planung. Es **wendet nichts an** — Persistieren in
 * `study_blocks`/`plan_versions` und die Bestätigung durch den Nutzer sind
 * Sache der aufrufenden Stelle (`data/`, `ui/`), genau die Trennung, die
 * ADR-005 verlangt.
 *
 * **Rückstand** (CONTRIBUTING.md „Tests": „Rückstand mitten in der Phase")
 * entsteht aus echten Nutzungsdaten: `erledigt`e Blöcke zählen mit
 * `actual_minutes` (falls erfasst, sonst `planned_minutes`) auf den
 * ursprünglichen Bedarf an; `offen`/`verschoben` gebliebene Blöcke aus der
 * Vergangenheit zählen **nicht** als erledigt — genau ihre Minuten bilden
 * den Rückstand, den `remainingErstdurchgangNeed` zurückgibt.
 * `gestrichen`e Blöcke zählen weder zum Bedarf noch zum Erledigten (der
 * Nutzer hat das Thema bewusst abgewählt, siehe `StudyBlockStatus`).
 *
 * **Nicht Teil dieses Moduls:** Eine bereits abgeschlossene Wiederholung
 * fortführen, wenn der Erstdurchgang vor `from` bereits fertig war —
 * `scheduleStudyBlocks` leitet `wiederholung` intern immer aus dem noch
 * offenen `neededMinutes` eines Themas ab (siehe dortiger Kommentar); ist
 * der Erstdurchgang schon vollständig erledigt, taucht das Thema hier gar
 * nicht mehr auf und seine Wiederholung wird von `replan` nicht neu
 * eingeplant. Deshalb vergleicht `replan` bewusst nur `erstdurchgang`-Blöcke
 * im Diff — sonst würde eine unverändert weiterlaufende Wiederholung
 * fälschlich als „entfernt" erscheinen. Eine echte Fortführung bräuchte
 * zusätzlich den Tag des abgeschlossenen Erstdurchgangs als Eingabe: kommt,
 * falls im Alltag gebraucht (Phase 3 „Neuberechnung mit Diff-Ansicht"),
 * noch nicht gebaut.
 */

export interface RemainingNeed {
  topicId: number
  assessmentId: number
  /** Erstdurchgang-Minuten, die laut Verlauf noch offen sind. */
  minutes: number
}

/**
 * Restbedarf an Erstdurchgang-Zeit je Thema aus dem bisherigen Verlauf.
 * Summiert je Thema `planned_minutes` aller nicht gestrichenen
 * `erstdurchgang`-Blöcke als ursprünglichen Bedarf (das ist dieselbe Summe,
 * die einmal als `SchedulingTopic.neededMinutes` in die erste Planung
 * einging) und zieht davon das tatsächlich Erledigte ab. Themen ohne
 * Restbedarf (fertig oder komplett gestrichen) fehlen im Ergebnis.
 */
export function remainingErstdurchgangNeed(blocks: StudyBlock[]): RemainingNeed[] {
  const groups = new Map<number, { assessmentId: number; total: number; done: number }>()

  for (const block of blocks) {
    if (block.kind !== 'erstdurchgang') continue
    if (block.topic_id === null || block.assessment_id === null) continue
    if (block.status === 'gestrichen') continue

    const group = groups.get(block.topic_id) ?? {
      assessmentId: block.assessment_id,
      total: 0,
      done: 0,
    }
    group.total += block.planned_minutes
    if (block.status === 'erledigt') {
      group.done += block.actual_minutes ?? block.planned_minutes
    }
    groups.set(block.topic_id, group)
  }

  const result: RemainingNeed[] = []
  for (const [topicId, group] of groups) {
    const minutes = Math.max(0, group.total - group.done)
    if (minutes > 0) {
      result.push({ topicId, assessmentId: group.assessmentId, minutes })
    }
  }
  return result.sort((a, b) => a.topicId - b.topicId)
}

export type PlanDiffChange = 'neu' | 'entfernt' | 'verschoben' | 'dauer_geändert'

export interface PlanDiffSide {
  /** Aufsteigend sortierte, eindeutige Tage, auf die dieses Thema/diese Art verteilt ist. */
  dates: string[]
  /** Summe der Minuten über alle Blöcke dieses Themas/dieser Art. */
  minutes: number
}

export interface PlanDiffEntry {
  change: PlanDiffChange
  topicId: number
  assessmentId: number
  kind: StudyBlockKind
  before: PlanDiffSide | null
  after: PlanDiffSide | null
}

interface DiffableBlock {
  topic_id: number | null
  assessment_id: number | null
  kind: StudyBlockKind
  planned_date: string
  planned_minutes: number
}

interface Aggregate {
  topicId: number
  assessmentId: number
  kind: StudyBlockKind
  dates: Set<string>
  minutes: number
}

function aggregateByTopicAndKind(blocks: DiffableBlock[]): Map<string, Aggregate> {
  const map = new Map<string, Aggregate>()
  for (const block of blocks) {
    if (block.topic_id === null || block.assessment_id === null) continue
    const key = `${block.topic_id}:${block.kind}`
    const entry = map.get(key) ?? {
      topicId: block.topic_id,
      assessmentId: block.assessment_id,
      kind: block.kind,
      dates: new Set<string>(),
      minutes: 0,
    }
    entry.dates.add(block.planned_date)
    entry.minutes += block.planned_minutes
    map.set(key, entry)
  }
  return map
}

function sameDates(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const date of a) if (!b.has(date)) return false
  return true
}

function toSide(aggregate: Aggregate): PlanDiffSide {
  return { dates: [...aggregate.dates].sort(), minutes: aggregate.minutes }
}

/**
 * Vergleicht die bisherige Planung (noch offene, zukünftige Blöcke) mit
 * einer frisch berechneten. Aggregiert je Thema **und** Art (`kind`), nicht
 * Block für Block — `scheduleStudyBlocks` zerlegt einen Bedarf in
 * `sessionChunkMinutes`-Häppchen, deren genaue Anzahl/Reihenfolge für den
 * Nutzer keine sinnvolle Diff-Einheit wäre. Themen/Arten mit unveränderter
 * Tagesverteilung und Minutenzahl tauchen **nicht** im Ergebnis auf (kein
 * Rauschen im Diff).
 */
export function diffPlans(existingFutureBlocks: DiffableBlock[], newBlocks: ScheduledBlock[]): PlanDiffEntry[] {
  const before = aggregateByTopicAndKind(existingFutureBlocks)
  const after = aggregateByTopicAndKind(newBlocks)
  const keys = new Set([...before.keys(), ...after.keys()])
  const entries: PlanDiffEntry[] = []

  for (const key of keys) {
    const b = before.get(key)
    const a = after.get(key)

    if (b && !a) {
      entries.push({ change: 'entfernt', topicId: b.topicId, assessmentId: b.assessmentId, kind: b.kind, before: toSide(b), after: null })
    } else if (!b && a) {
      entries.push({ change: 'neu', topicId: a.topicId, assessmentId: a.assessmentId, kind: a.kind, before: null, after: toSide(a) })
    } else if (b && a) {
      if (!sameDates(b.dates, a.dates)) {
        entries.push({ change: 'verschoben', topicId: a.topicId, assessmentId: a.assessmentId, kind: a.kind, before: toSide(b), after: toSide(a) })
      } else if (b.minutes !== a.minutes) {
        entries.push({
          change: 'dauer_geändert',
          topicId: a.topicId,
          assessmentId: a.assessmentId,
          kind: a.kind,
          before: toSide(b),
          after: toSide(a),
        })
      }
      // sonst: unverändert, kein Eintrag.
    }
  }

  return entries.sort((x, y) => x.topicId - y.topicId || x.kind.localeCompare(y.kind))
}

export interface ReplanResult {
  blocks: ScheduledBlock[]
  unscheduled: UnscheduledRemainder[]
  diff: PlanDiffEntry[]
}

/**
 * Berechnet den Plan ab `from` aus dem bisherigen Verlauf neu und liefert
 * den Diff zur bisherigen Planung. Wendet nichts an (siehe Modul-Kommentar,
 * ADR-005) — `blocks`/`unscheduled`/`diff` sind ein Vorschlag, den die
 * aufrufende Stelle dem Nutzer zeigt und erst nach Bestätigung übernimmt.
 */
export function replan(
  existingBlocks: StudyBlock[],
  assessments: SchedulingAssessment[],
  from: string,
  pattern: AvailabilityPattern[],
  exceptions: AvailabilityException[],
  blockers: Blocker[],
  options: ScheduleOptions = {},
  recurringBlockers: RecurringBlocker[] = [],
): ReplanResult {
  const topics: SchedulingTopic[] = remainingErstdurchgangNeed(existingBlocks).map((need) => ({
    topicId: need.topicId,
    assessmentId: need.assessmentId,
    neededMinutes: need.minutes,
  }))

  const { blocks, unscheduled } = scheduleStudyBlocks(
    topics,
    assessments,
    from,
    pattern,
    exceptions,
    blockers,
    options,
    recurringBlockers,
  )

  // Kein Datumsfilter hier: ein "offen" gebliebener Block *vor* `from` ist
  // genau der Rückstand (verpasst, aber nicht erledigt/gestrichen) und muss
  // im Diff als "verschoben" auf sein neues Datum erscheinen, statt fälschlich
  // als "neu" — er war ja bereits Teil des bisherigen Plans.
  const pendingExisting = existingBlocks.filter((b) => b.kind === 'erstdurchgang' && b.status === 'offen')
  const diff = diffPlans(pendingExisting, blocks)

  return { blocks, unscheduled, diff }
}
