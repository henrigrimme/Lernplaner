import { describe, expect, it } from 'vitest'
import { diffPlans, remainingErstdurchgangNeed, replan } from '../../src/domain/replanning'
import type { ScheduledBlock } from '../../src/domain/scheduling'
import type { AvailabilityPattern, RecurringBlocker, StudyBlock } from '../../src/data/schema'

// Montag=1 ... Sonntag=0, wie in capacity.test.ts/scheduling.test.ts.
const DAILY_60: AvailabilityPattern[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday: weekday as AvailabilityPattern['weekday'],
  minutes: 60,
}))

function block(overrides: Partial<StudyBlock>): StudyBlock {
  return {
    id: 1,
    topic_id: 1,
    assessment_id: 1,
    kind: 'erstdurchgang',
    planned_date: '2026-08-03',
    planned_minutes: 45,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

describe('remainingErstdurchgangNeed', () => {
  it('zieht Erledigtes vom ursprünglichen Bedarf ab (actual_minutes, falls erfasst)', () => {
    const blocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 40 }),
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 45, status: 'offen' }),
      block({ id: 3, planned_date: '2026-08-05', planned_minutes: 30, status: 'offen' }),
    ]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([
      { topicId: 1, assessmentId: 1, minutes: 80 }, // 120 gesamt - 40 erledigt
    ])
  })

  it('fällt auf planned_minutes zurück, wenn actual_minutes fehlt', () => {
    const blocks = [block({ planned_minutes: 45, status: 'erledigt', actual_minutes: null })]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([])
  })

  // CONTRIBUTING.md: "Rückstand mitten in der Phase" — ein verpasster,
  // nicht erledigter Block aus der Vergangenheit bleibt im Bedarf.
  it('zählt einen verpassten (nicht erledigten) Block aus der Vergangenheit weiterhin als Bedarf', () => {
    const blocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 45, status: 'offen' }), // verpasst, liegt in der Vergangenheit
    ]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([{ topicId: 1, assessmentId: 1, minutes: 45 }])
  })

  it('ignoriert gestrichene Blöcke vollständig (weder Bedarf noch erledigt)', () => {
    const blocks = [
      block({ id: 1, planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, planned_minutes: 45, status: 'gestrichen' }),
    ]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([])
  })

  it('lässt ein vollständig erledigtes Thema aus dem Ergebnis weg', () => {
    const blocks = [block({ planned_minutes: 45, status: 'erledigt', actual_minutes: 45 })]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([])
  })

  it('ignoriert wiederholung-Blöcke und Blöcke ohne Thema', () => {
    const blocks = [
      block({ kind: 'wiederholung', planned_minutes: 20, status: 'offen' }),
      block({ id: 2, topic_id: null, planned_minutes: 20, status: 'offen' }),
    ]
    expect(remainingErstdurchgangNeed(blocks)).toEqual([])
  })
})

describe('diffPlans', () => {
  const newBlock = (overrides: Partial<ScheduledBlock>): ScheduledBlock => ({
    topic_id: 1,
    assessment_id: 1,
    kind: 'erstdurchgang',
    planned_date: '2026-08-10',
    planned_minutes: 45,
    planned_order: 0,
    ...overrides,
  })

  it('meldet keinen Eintrag, wenn Tage und Minuten je Thema/Art unverändert sind', () => {
    const before = [block({ planned_date: '2026-08-10', planned_minutes: 45 })]
    const after = [newBlock({ planned_date: '2026-08-10', planned_minutes: 45 })]
    expect(diffPlans(before, after)).toEqual([])
  })

  it('erkennt ein neu hinzugekommenes Thema', () => {
    const after = [newBlock({ topic_id: 2, assessment_id: 2 })]
    const diff = diffPlans([], after)
    expect(diff).toEqual([
      {
        change: 'neu',
        topicId: 2,
        assessmentId: 2,
        kind: 'erstdurchgang',
        before: null,
        after: { dates: ['2026-08-10'], minutes: 45 },
      },
    ])
  })

  it('erkennt ein entferntes Thema', () => {
    const before = [block({ planned_date: '2026-08-10', planned_minutes: 45 })]
    const diff = diffPlans(before, [])
    expect(diff).toEqual([
      {
        change: 'entfernt',
        topicId: 1,
        assessmentId: 1,
        kind: 'erstdurchgang',
        before: { dates: ['2026-08-10'], minutes: 45 },
        after: null,
      },
    ])
  })

  it('erkennt eine Verschiebung auf andere Tage bei gleicher Minutenzahl', () => {
    const before = [block({ planned_date: '2026-08-10', planned_minutes: 45 })]
    const after = [newBlock({ planned_date: '2026-08-15', planned_minutes: 45 })]
    const diff = diffPlans(before, after)
    expect(diff).toEqual([
      {
        change: 'verschoben',
        topicId: 1,
        assessmentId: 1,
        kind: 'erstdurchgang',
        before: { dates: ['2026-08-10'], minutes: 45 },
        after: { dates: ['2026-08-15'], minutes: 45 },
      },
    ])
  })

  it('erkennt eine geänderte Dauer bei gleichen Tagen', () => {
    const before = [block({ planned_date: '2026-08-10', planned_minutes: 45 })]
    const after = [newBlock({ planned_date: '2026-08-10', planned_minutes: 30 })]
    const diff = diffPlans(before, after)
    expect(diff).toEqual([
      {
        change: 'dauer_geändert',
        topicId: 1,
        assessmentId: 1,
        kind: 'erstdurchgang',
        before: { dates: ['2026-08-10'], minutes: 45 },
        after: { dates: ['2026-08-10'], minutes: 30 },
      },
    ])
  })

  it('aggregiert mehrere Chunks desselben Themas zu einem Eintrag', () => {
    const before = [block({ id: 1, planned_date: '2026-08-10', planned_minutes: 45 })]
    const after = [
      newBlock({ planned_date: '2026-08-10', planned_minutes: 20, planned_order: 0 }),
      newBlock({ planned_date: '2026-08-11', planned_minutes: 25, planned_order: 0 }),
    ]
    const diff = diffPlans(before, after)
    expect(diff).toEqual([
      {
        change: 'verschoben',
        topicId: 1,
        assessmentId: 1,
        kind: 'erstdurchgang',
        before: { dates: ['2026-08-10'], minutes: 45 },
        after: { dates: ['2026-08-10', '2026-08-11'], minutes: 45 },
      },
    ])
  })
})

describe('replan', () => {
  // CONTRIBUTING.md: "Rückstand mitten in der Phase" — Kernszenario dieses Moduls.
  it('holt einen verpassten Erstdurchgang-Block auf und zeigt ihn als Verschiebung im Diff', () => {
    const existingBlocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      // Zweiter Block war für den 04.08. geplant, wurde aber verpasst (heute ist der 10.08.).
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 45, status: 'offen' }),
    ]

    const result = replan(
      existingBlocks,
      [{ id: 1, date: '2026-08-24' }],
      '2026-08-10',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )

    expect(result.unscheduled).toEqual([])
    expect(result.blocks.every((b) => b.planned_date >= '2026-08-10')).toBe(true)
    expect(result.blocks.reduce((sum, b) => sum + b.planned_minutes, 0)).toBe(45)

    // Der verpasste Block (04.08., noch "offen") ist Teil der alten Zukunftsplanung
    // und wird im Diff als "verschoben" auf den neuen Tag markiert.
    expect(result.diff).toEqual([
      {
        change: 'verschoben',
        topicId: 1,
        assessmentId: 1,
        kind: 'erstdurchgang',
        before: { dates: ['2026-08-04'], minutes: 45 },
        after: expect.objectContaining({ minutes: 45 }),
      },
    ])
  })

  it('reicht wiederkehrende Tages-Blocker an scheduleStudyBlocks weiter (weniger Kapazität, mehr Tage)', () => {
    const existingBlocks = [block({ id: 2, planned_date: '2026-08-04', planned_minutes: 120, status: 'offen' })]
    const lunchDaily: RecurringBlocker[] = [0, 1, 2, 3, 4, 5, 6].map((weekday, id) => ({
      id: id + 1,
      weekday: weekday as RecurringBlocker['weekday'],
      starts_at: '12:00',
      ends_at: '12:30',
      label: 'Mittagspause',
    }))

    const withoutBlocker = replan(existingBlocks, [{ id: 1, date: '2026-08-24' }], '2026-08-10', DAILY_60, [], [], {
      reviewFraction: 0,
    })
    const withBlocker = replan(
      existingBlocks,
      [{ id: 1, date: '2026-08-24' }],
      '2026-08-10',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
      lunchDaily,
    )

    const daysUsed = (blocks: typeof withBlocker.blocks) => new Set(blocks.map((b) => b.planned_date)).size
    expect(daysUsed(withBlocker.blocks)).toBeGreaterThan(daysUsed(withoutBlocker.blocks))
    expect(withBlocker.blocks.reduce((sum, b) => sum + b.planned_minutes, 0)).toBe(120)
  })

  it('lässt ein bereits vollständig erledigtes Thema unverändert (kein Diff-Eintrag, kein neuer Block)', () => {
    const existingBlocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
    ]
    const result = replan(existingBlocks, [{ id: 1, date: '2026-08-24' }], '2026-08-10', DAILY_60, [], [], {
      reviewFraction: 0,
    })
    expect(result.blocks).toEqual([])
    expect(result.diff).toEqual([])
  })

  it('meldet weiterhin ein Defizit, wenn auch nach der Neuberechnung zu wenig Zeit bleibt', () => {
    const existingBlocks = [block({ id: 1, planned_date: '2026-08-03', planned_minutes: 300, status: 'offen' })]
    const result = replan(
      existingBlocks,
      [{ id: 1, date: '2026-08-05' }], // nur noch wenig Zeit bis zur Prüfung
      '2026-08-04',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )
    expect(result.unscheduled.length).toBeGreaterThan(0)
  })
})
