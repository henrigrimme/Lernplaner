import { describe, expect, it } from 'vitest'
import {
  computeMasteryByTopic,
  computePreparedness,
  computeTopicMastery,
  FEEDBACK_MASTERY_WEIGHT,
  suggestNextTopic,
} from '../../src/domain/progress'
import type { StudyBlock } from '../../src/data/schema'

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

describe('computeTopicMastery', () => {
  it('liefert 0, wenn nichts geplant ist', () => {
    expect(computeTopicMastery([])).toBe(0)
  })

  it('liefert 0, solange nichts erledigt ist', () => {
    expect(computeTopicMastery([block({ id: 1, status: 'offen' })])).toBe(0)
  })

  it('liefert 1 bei vollständiger Erledigung ohne Feedback', () => {
    expect(computeTopicMastery([block({ id: 1, status: 'erledigt', actual_minutes: 45 })])).toBe(1)
  })

  it('berechnet die Erledigungsquote über mehrere Blöcke', () => {
    const blocks = [
      block({ id: 1, planned_minutes: 40, status: 'erledigt', actual_minutes: 40 }),
      block({ id: 2, planned_minutes: 60, status: 'offen' }),
    ]
    expect(computeTopicMastery(blocks)).toBeCloseTo(40 / 100)
  })

  it('ignoriert gestrichene Blöcke vollständig (weder Bedarf noch erledigt)', () => {
    const blocks = [
      block({ id: 1, planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, planned_minutes: 100, status: 'gestrichen' }),
    ]
    expect(computeTopicMastery(blocks)).toBe(1) // die gestrichenen 100 Min. zählen nicht als Bedarf
  })

  it('drückt die mastery bei "zu schwer"-Feedback', () => {
    const blocks = [block({ id: 1, status: 'erledigt', actual_minutes: 45, difficulty_feedback: 1 })]
    expect(computeTopicMastery(blocks)).toBeCloseTo(1 - FEEDBACK_MASTERY_WEIGHT)
  })

  it('hebt die mastery bei "zu leicht"-Feedback an, aber nie über 1', () => {
    const blocks = [block({ id: 1, status: 'erledigt', actual_minutes: 45, difficulty_feedback: -1 })]
    expect(computeTopicMastery(blocks)).toBe(1) // vollständig erledigt, Anhebung wird bei 1 gekappt
  })

  it('fällt auf planned_minutes zurück, wenn actual_minutes fehlt', () => {
    const blocks = [block({ id: 1, status: 'erledigt', actual_minutes: null })]
    expect(computeTopicMastery(blocks)).toBe(1)
  })
})

describe('computeMasteryByTopic', () => {
  it('gruppiert nach topic_id und ignoriert Blöcke ohne Thema', () => {
    const blocks = [
      block({ id: 1, topic_id: 1, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, topic_id: 2, planned_minutes: 100, status: 'offen' }),
      block({ id: 3, topic_id: null }),
    ]
    const result = computeMasteryByTopic(blocks)
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(0)
    expect(result.has(3)).toBe(false)
  })
})

describe('computePreparedness', () => {
  it('liefert null ohne Themen', () => {
    expect(computePreparedness(1, [], [])).toBeNull()
  })

  it('zählt ein Thema ohne jeden Block als mastery 0, statt es zu ignorieren', () => {
    const preparedness = computePreparedness(1, [], [{ topicId: 1, weight: 3 }])
    expect(preparedness).toBe(0)
  })

  it('gewichtet mastery je Thema mit dessen weight', () => {
    const blocks = [
      block({ id: 1, topic_id: 1, assessment_id: 1, status: 'erledigt', actual_minutes: 45 }), // mastery 1
      block({ id: 2, topic_id: 2, assessment_id: 1, status: 'offen' }), // mastery 0
    ]
    const topics = [
      { topicId: 1, weight: 1 as const },
      { topicId: 2, weight: 4 as const },
    ]
    // (1*1 + 0*4) / (1+4) = 0.2
    expect(computePreparedness(1, blocks, topics)).toBeCloseTo(0.2)
  })

  it('berücksichtigt nur Blöcke der übergebenen assessmentId', () => {
    const blocks = [block({ id: 1, topic_id: 1, assessment_id: 2, status: 'erledigt', actual_minutes: 45 })]
    const preparedness = computePreparedness(1, blocks, [{ topicId: 1, weight: 3 }])
    expect(preparedness).toBe(0) // Block gehört zu einer anderen Prüfung
  })
})

describe('suggestNextTopic', () => {
  it('liefert null ohne Themen', () => {
    expect(suggestNextTopic(1, [], [])).toBeNull()
  })

  it('schlägt das Thema mit dem größten weight * (1 - mastery) vor', () => {
    const blocks = [
      block({ id: 1, topic_id: 1, assessment_id: 1, status: 'erledigt', actual_minutes: 45 }), // mastery 1, urgency 0
    ]
    const topics = [
      { topicId: 1, weight: 5 as const }, // schon fertig -> urgency 0
      { topicId: 2, weight: 2 as const }, // noch nichts gemacht -> urgency 2
    ]
    expect(suggestNextTopic(1, blocks, topics)).toEqual({ topicId: 2, urgency: 2 })
  })

  it('bevorzugt bei Gleichstand das zuerst übergebene Thema', () => {
    const topics = [
      { topicId: 1, weight: 3 as const },
      { topicId: 2, weight: 3 as const },
    ]
    expect(suggestNextTopic(1, [], topics)).toEqual({ topicId: 1, urgency: 3 })
  })
})
