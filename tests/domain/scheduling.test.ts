import { describe, expect, it } from 'vitest'
import { scheduleStudyBlocks } from '../../src/domain/scheduling'
import type { AvailabilityPattern, RecurringBlocker } from '../../src/data/schema'

// Montag=1 ... Sonntag=0, wie in capacity.test.ts.
const DAILY_60: AvailabilityPattern[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday: weekday as AvailabilityPattern['weekday'],
  minutes: 60,
}))

describe('scheduleStudyBlocks', () => {
  it('verteilt ein Thema über mehrere Tage/Sitzungen, in Chunks von sessionChunkMinutes', () => {
    const result = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 100 }],
      [{ id: 1, date: '2026-08-10' }],
      '2026-08-03', // Montag
      DAILY_60,
      [],
      [],
      { sessionChunkMinutes: 45, reviewFraction: 0, minReviewGapDays: 3 },
    )

    const erst = result.blocks.filter((b) => b.kind === 'erstdurchgang')
    expect(erst.reduce((sum, b) => sum + b.planned_minutes, 0)).toBe(100)
    expect(erst.every((b) => b.planned_minutes <= 45)).toBe(true)
    expect(result.unscheduled).toEqual([])
  })

  it('verschränkt mehrere Themen am selben Tag, statt eins komplett abzuarbeiten', () => {
    const result = scheduleStudyBlocks(
      [
        { topicId: 1, assessmentId: 1, neededMinutes: 200 },
        { topicId: 2, assessmentId: 2, neededMinutes: 200 },
      ],
      [
        { id: 1, date: '2026-08-20' },
        { id: 2, date: '2026-08-20' },
      ],
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { sessionChunkMinutes: 30, reviewFraction: 0 },
    )

    const firstDay = result.blocks.filter((b) => b.planned_date === '2026-08-03')
    const topicsOnFirstDay = new Set(firstDay.map((b) => b.topic_id))
    // Beide Themen kommen am ersten Tag dran (Round-Robin), nicht nur eins.
    expect(topicsOnFirstDay.size).toBe(2)
  })

  // CONTRIBUTING.md: "fünf parallele Prüfungen"
  it('plant fünf parallele Prüfungen bei ausreichender Kapazität vollständig ein', () => {
    const topics = Array.from({ length: 5 }, (_, i) => ({
      topicId: i + 1,
      assessmentId: i + 1,
      neededMinutes: 120,
    }))
    const assessments = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      date: '2026-08-24', // 3 Wochen Vorlauf
    }))

    const result = scheduleStudyBlocks(topics, assessments, '2026-08-03', DAILY_60, [], [], {
      reviewFraction: 0,
    })

    expect(result.unscheduled).toEqual([])
    for (const topic of topics) {
      const total = result.blocks
        .filter((b) => b.topic_id === topic.topicId && b.kind === 'erstdurchgang')
        .reduce((sum, b) => sum + b.planned_minutes, 0)
      expect(total).toBe(120)
    }
  })

  // CONTRIBUTING.md: "weniger Zeit als Stoff" / "Kapazität reicht nicht -> Streichvorschlag"
  it('meldet nicht untergebrachte Minuten, wenn die Kapazität nicht reicht', () => {
    const result = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 300 }],
      [{ id: 1, date: '2026-08-05' }], // Mo 03. + Di 04. = 120 Minuten verfügbar
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )

    expect(result.unscheduled).toEqual([
      { topicId: 1, assessmentId: 1, kind: 'erstdurchgang', minutes: 180 },
    ])
  })

  it('bevorzugt bei knapper Kapazität das Thema mit näherem Prüfungstermin (EDF)', () => {
    const result = scheduleStudyBlocks(
      [
        { topicId: 1, assessmentId: 1, neededMinutes: 60 }, // dringend
        { topicId: 2, assessmentId: 2, neededMinutes: 60 }, // mehr Zeit
      ],
      [
        { id: 1, date: '2026-08-04' }, // morgen fällig
        { id: 2, date: '2026-08-24' },
      ],
      '2026-08-03', // nur 1 Tag mit 60 Minuten vor Prüfung 1
      DAILY_60,
      [],
      [],
      { sessionChunkMinutes: 60, reviewFraction: 0 },
    )

    const day1 = result.blocks.filter((b) => b.planned_date === '2026-08-03')
    expect(day1).toHaveLength(1)
    expect(day1[0]!.topic_id).toBe(1) // das dringendere Thema bekommt den einzigen Slot
  })

  it('plant eine Wiederholung nach dem Mindestabstand ein', () => {
    const result = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 60 }],
      [{ id: 1, date: '2026-08-24' }],
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { sessionChunkMinutes: 60, reviewFraction: 0.5, minReviewGapDays: 3 },
    )

    const review = result.blocks.filter((b) => b.kind === 'wiederholung')
    expect(review).toHaveLength(1)
    expect(review[0]!.planned_minutes).toBe(30) // 50% von 60
    // Erstdurchgang war am 03.08. fertig; Wiederholung frühestens 3 Tage später.
    expect(review[0]!.planned_date >= '2026-08-06').toBe(true)
  })

  // CONTRIBUTING.md: "verschobener Prüfungstermin"
  it('plant bei einem späteren Prüfungstermin über mehr Tage, ohne Defizit', () => {
    const topics = [{ topicId: 1, assessmentId: 1, neededMinutes: 300 }]
    const knapp = scheduleStudyBlocks(topics, [{ id: 1, date: '2026-08-05' }], '2026-08-03', DAILY_60, [], [], {
      reviewFraction: 0,
    })
    const verschoben = scheduleStudyBlocks(topics, [{ id: 1, date: '2026-08-13' }], '2026-08-03', DAILY_60, [], [], {
      reviewFraction: 0,
    })

    expect(knapp.unscheduled.length).toBeGreaterThan(0)
    expect(verschoben.unscheduled).toEqual([])
  })

  // CONTRIBUTING.md: "neues Material nachträglich importiert"
  it('plant ein nachträglich hinzugefügtes Thema mit ein, ohne die bestehenden zu verdrängen', () => {
    const assessments = [{ id: 1, date: '2026-08-24' }]
    const before = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 120 }],
      assessments,
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )
    const after = scheduleStudyBlocks(
      [
        { topicId: 1, assessmentId: 1, neededMinutes: 120 },
        { topicId: 2, assessmentId: 1, neededMinutes: 60 }, // neu importiertes Thema
      ],
      assessments,
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )

    expect(before.unscheduled).toEqual([])
    expect(after.unscheduled).toEqual([])
    const topic1Total = after.blocks
      .filter((b) => b.topic_id === 1)
      .reduce((sum, b) => sum + b.planned_minutes, 0)
    expect(topic1Total).toBe(120) // unverändert trotz neuem Thema 2
  })

  // "Rückstand mitten in der Phase" — nicht als echte Neuplanung (das ist
  // replanning.ts), aber die Funktion unterstützt "ab heute mit dem Rest
  // neu rechnen", siehe Modul-Kommentar.
  it('kann mit späterem "from" und reduziertem Restbedarf für Rückstand neu rechnen', () => {
    const assessments = [{ id: 1, date: '2026-08-24' }]
    // Angenommen: 40 von 120 Minuten wurden schon erledigt, heute ist der 10.08.
    const result = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 80 }],
      assessments,
      '2026-08-10',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )
    expect(result.unscheduled).toEqual([])
    const total = result.blocks.reduce((sum, b) => sum + b.planned_minutes, 0)
    expect(total).toBe(80)
    expect(result.blocks.every((b) => b.planned_date >= '2026-08-10')).toBe(true)
  })

  it('wirft bei einer unbekannten assessmentId', () => {
    expect(() =>
      scheduleStudyBlocks(
        [{ topicId: 1, assessmentId: 999, neededMinutes: 60 }],
        [],
        '2026-08-03',
        DAILY_60,
        [],
        [],
      ),
    ).toThrow(/999/)
  })

  it('ignoriert Themen ohne Bedarf (0 Minuten)', () => {
    const result = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 0 }],
      [{ id: 1, date: '2026-08-10' }],
      '2026-08-03',
      DAILY_60,
      [],
      [],
    )
    expect(result.blocks).toEqual([])
    expect(result.unscheduled).toEqual([])
  })

  it('berücksichtigt wiederkehrende Tages-Blocker bei der Terminierung (weniger Zeit pro Tag)', () => {
    // Mit einer 30-minütigen täglichen Mittagspause bleiben pro Tag nur noch
    // 30 statt 60 Minuten übrig -> mehr Tage nötig, um denselben Bedarf zu decken.
    const lunchDaily: RecurringBlocker[] = [0, 1, 2, 3, 4, 5, 6].map((weekday, id) => ({
      id: id + 1,
      weekday: weekday as RecurringBlocker['weekday'],
      starts_at: '12:00',
      ends_at: '12:30',
      label: 'Mittagspause',
    }))

    const withoutBlocker = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 120 }],
      [{ id: 1, date: '2026-08-10' }],
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
    )
    const withBlocker = scheduleStudyBlocks(
      [{ topicId: 1, assessmentId: 1, neededMinutes: 120 }],
      [{ id: 1, date: '2026-08-10' }],
      '2026-08-03',
      DAILY_60,
      [],
      [],
      { reviewFraction: 0 },
      lunchDaily,
    )

    const daysUsed = (blocks: typeof withoutBlocker.blocks) => new Set(blocks.map((b) => b.planned_date)).size
    expect(daysUsed(withBlocker.blocks)).toBeGreaterThan(daysUsed(withoutBlocker.blocks))
    // Der Gesamtbedarf wird trotzdem vollständig untergebracht, nur über mehr Tage verteilt.
    expect(withBlocker.blocks.reduce((sum, b) => sum + b.planned_minutes, 0)).toBe(120)
    expect(withBlocker.unscheduled).toEqual([])
  })
})
