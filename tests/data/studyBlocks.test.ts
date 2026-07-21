import { describe, expect, it } from 'vitest'
import { applyReplan, completeStudyBlock, materializeStudyBlocks } from '../../src/data/studyBlocks'
import type { ScheduledBlock } from '../../src/domain/scheduling'
import type { ReplanResult } from '../../src/domain/replanning'
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

describe('materializeStudyBlocks', () => {
  it('vergibt fortlaufende IDs und Status "offen"', () => {
    const scheduled: ScheduledBlock[] = [
      { topic_id: 1, assessment_id: 1, kind: 'erstdurchgang', planned_date: '2026-08-03', planned_minutes: 45, planned_order: 0 },
      { topic_id: 2, assessment_id: 1, kind: 'erstdurchgang', planned_date: '2026-08-03', planned_minutes: 30, planned_order: 1 },
    ]
    const blocks = materializeStudyBlocks(scheduled)
    expect(blocks.map((b) => b.id)).toEqual([1, 2])
    expect(blocks.every((b) => b.status === 'offen')).toBe(true)
    expect(blocks.every((b) => b.actual_minutes === null && b.completed_at === null && b.difficulty_feedback === null)).toBe(
      true,
    )
  })

  it('übernimmt Datum, Minuten und Art unverändert', () => {
    const scheduled: ScheduledBlock[] = [
      { topic_id: 1, assessment_id: 1, kind: 'wiederholung', planned_date: '2026-08-10', planned_minutes: 20, planned_order: 0 },
    ]
    const [block] = materializeStudyBlocks(scheduled)
    expect(block).toMatchObject({
      topic_id: 1,
      assessment_id: 1,
      kind: 'wiederholung',
      planned_date: '2026-08-10',
      planned_minutes: 20,
      planned_order: 0,
    })
  })

  it('vergibt IDs ab startId, wenn angegeben', () => {
    const scheduled: ScheduledBlock[] = [
      { topic_id: 1, assessment_id: 1, kind: 'erstdurchgang', planned_date: '2026-08-03', planned_minutes: 45, planned_order: 0 },
    ]
    const blocks = materializeStudyBlocks(scheduled, 10)
    expect(blocks.map((b) => b.id)).toEqual([10])
  })
})

describe('completeStudyBlock', () => {
  const blocks: StudyBlock[] = [
    {
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
    },
    {
      id: 2,
      topic_id: 2,
      assessment_id: 1,
      kind: 'erstdurchgang',
      planned_date: '2026-08-03',
      planned_minutes: 30,
      planned_order: 1,
      status: 'offen',
      actual_minutes: null,
      completed_at: null,
      difficulty_feedback: null,
    },
  ]

  it('setzt Status, Dauer und Feedback nur beim passenden Block', () => {
    const result = completeStudyBlock(blocks, 1, { actualMinutes: 50, difficultyFeedback: 1, completedAt: '2026-08-03T10:00:00Z' })
    expect(result[0]).toMatchObject({
      status: 'erledigt',
      actual_minutes: 50,
      difficulty_feedback: 1,
      completed_at: '2026-08-03T10:00:00Z',
    })
    expect(result[1]).toEqual(blocks[1]) // unverändert
  })
})

describe('applyReplan', () => {
  function replanResult(overrides: Partial<ReplanResult> = {}): ReplanResult {
    return { blocks: [], unscheduled: [], diff: [], ...overrides }
  }

  it('ersetzt offene erstdurchgang-Blöcke durch die neu berechneten, mit auf den Bestand aufbauenden IDs', () => {
    const existing = [
      block({ id: 1, status: 'erledigt', actual_minutes: 45 }), // bleibt erhalten -> id 1 ist vergeben
      block({ id: 2, planned_minutes: 45 }), // wird ersetzt
    ]
    const result = replanResult({
      blocks: [
        { topic_id: 1, assessment_id: 1, kind: 'erstdurchgang', planned_date: '2026-08-15', planned_minutes: 45, planned_order: 0 },
      ],
    })
    const updated = applyReplan(existing, result)
    expect(updated).toHaveLength(2)
    expect(updated[0]).toEqual(existing[0]) // erledigter Block unverändert
    expect(updated[1]).toMatchObject({ id: 2, planned_date: '2026-08-15', status: 'offen' }) // neue ID knüpft an den Bestand an
  })

  it('lässt erledigte, gestrichene und verschobene Blöcke unverändert', () => {
    const existing = [
      block({ id: 1, status: 'erledigt', actual_minutes: 40 }),
      block({ id: 2, status: 'gestrichen' }),
      block({ id: 3, status: 'verschoben' }),
    ]
    const updated = applyReplan(existing, replanResult())
    expect(updated).toEqual(existing)
  })

  it('lässt wiederholung/uebung/quiz/puffer-Blöcke unverändert, auch wenn "offen"', () => {
    const existing = [
      block({ id: 1, kind: 'wiederholung' }),
      block({ id: 2, kind: 'uebung' }),
      block({ id: 3, kind: 'quiz' }),
      block({ id: 4, kind: 'puffer' }),
    ]
    const updated = applyReplan(existing, replanResult())
    expect(updated).toEqual(existing)
  })
})
