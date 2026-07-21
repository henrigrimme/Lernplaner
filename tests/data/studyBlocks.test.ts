import { describe, expect, it } from 'vitest'
import { completeStudyBlock, materializeStudyBlocks } from '../../src/data/studyBlocks'
import type { ScheduledBlock } from '../../src/domain/scheduling'
import type { StudyBlock } from '../../src/data/schema'

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
