import { describe, expect, it } from 'vitest'
import {
  buildDailyOverviewNotification,
  buildDueSoonNotification,
  computeDueNotifications,
  DEFAULT_DUE_SOON_DAYS,
} from '../../src/domain/notifications'
import type { Assessment, StudyBlock, Topic } from '../../src/data/schema'

function block(overrides: Partial<StudyBlock> & { id: number }): StudyBlock {
  return {
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

function topic(id: number, name: string): Pick<Topic, 'id' | 'name'> {
  return { id, name }
}

function assessment(overrides: Partial<Assessment> & { title: string; date: string }): Pick<Assessment, 'title' | 'date'> {
  return overrides
}

describe('buildDailyOverviewNotification', () => {
  it('liefert null, wenn kein offener Block für heute existiert', () => {
    expect(buildDailyOverviewNotification([], [])).toBeNull()
    expect(buildDailyOverviewNotification([block({ id: 1, status: 'erledigt' })], [])).toBeNull()
  })

  it('fasst Anzahl, Minuten und eindeutige Themennamen zusammen', () => {
    const blocks = [
      block({ id: 1, topic_id: 1, planned_minutes: 45 }),
      block({ id: 2, topic_id: 2, planned_minutes: 30 }),
      block({ id: 3, topic_id: 1, planned_minutes: 20 }), // gleiches Thema wie Block 1
    ]
    const topics = [topic(1, 'Consumer Theory'), topic(2, 'Producer Theory')]
    const result = buildDailyOverviewNotification(blocks, topics)
    expect(result).toEqual({
      kind: 'tagesuebersicht',
      title: 'Heute im Lernplan',
      body: '3 Lernblöcke, 95 Minuten geplant: Consumer Theory, Producer Theory',
    })
  })

  it('ignoriert erledigte/gestrichene Blöcke', () => {
    const blocks = [block({ id: 1, status: 'erledigt' }), block({ id: 2, status: 'gestrichen' })]
    expect(buildDailyOverviewNotification(blocks, [])).toBeNull()
  })
})

describe('buildDueSoonNotification', () => {
  it('liefert null ohne Prüfung innerhalb der Frist', () => {
    const result = buildDueSoonNotification('2026-08-01', [assessment({ title: 'Endklausur', date: '2026-08-20' })])
    expect(result).toBeNull()
  })

  it('meldet eine Prüfung innerhalb der Standardfrist (3 Tage)', () => {
    const result = buildDueSoonNotification('2026-08-01', [assessment({ title: 'Endklausur', date: '2026-08-03' })])
    expect(result).toEqual({
      kind: 'faelligkeit',
      title: 'Prüfung bald fällig',
      body: 'Endklausur (2026-08-03)',
    })
  })

  it('ignoriert eine Prüfung, die schon vergangen ist', () => {
    const result = buildDueSoonNotification('2026-08-05', [assessment({ title: 'Endklausur', date: '2026-08-03' })])
    expect(result).toBeNull()
  })

  it('meldet mehrere fällige Prüfungen, sortiert nach Datum', () => {
    const result = buildDueSoonNotification('2026-08-01', [
      assessment({ title: 'Später', date: '2026-08-03' }),
      assessment({ title: 'Früher', date: '2026-08-02' }),
    ])
    expect(result).toEqual({
      kind: 'faelligkeit',
      title: 'Prüfungen bald fällig',
      body: 'Früher (2026-08-02), Später (2026-08-03)',
    })
  })

  it('respektiert eine übergebene abweichende Frist', () => {
    const inDefault = buildDueSoonNotification('2026-08-01', [assessment({ title: 'X', date: '2026-08-05' })])
    expect(inDefault).toBeNull() // außerhalb der Standardfrist (3 Tage)
    const withLongerWindow = buildDueSoonNotification('2026-08-01', [assessment({ title: 'X', date: '2026-08-05' })], 7)
    expect(withLongerWindow).not.toBeNull()
    expect(DEFAULT_DUE_SOON_DAYS).toBe(3)
  })
})

describe('computeDueNotifications', () => {
  it('kombiniert beide Arten, wenn beide zutreffen und noch nicht gezeigt wurden', () => {
    const result = computeDueNotifications({
      today: '2026-08-01',
      studyBlocksToday: [block({ id: 1, topic_id: 1 })],
      topics: [topic(1, 'Consumer Theory')],
      assessments: [assessment({ title: 'Endklausur', date: '2026-08-02' })],
      alreadyShownToday: new Set(),
    })
    expect(result.map((r) => r.kind)).toEqual(['tagesuebersicht', 'faelligkeit'])
  })

  it('lässt eine bereits heute gezeigte Art aus', () => {
    const result = computeDueNotifications({
      today: '2026-08-01',
      studyBlocksToday: [block({ id: 1 })],
      topics: [],
      assessments: [assessment({ title: 'Endklausur', date: '2026-08-02' })],
      alreadyShownToday: new Set(['tagesuebersicht']),
    })
    expect(result.map((r) => r.kind)).toEqual(['faelligkeit'])
  })

  it('liefert ein leeres Array, wenn beide Arten schon gezeigt wurden oder nichts zutrifft', () => {
    const result = computeDueNotifications({
      today: '2026-08-01',
      studyBlocksToday: [],
      topics: [],
      assessments: [],
      alreadyShownToday: new Set(),
    })
    expect(result).toEqual([])
  })
})
