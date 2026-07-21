import { describe, expect, it } from 'vitest'
import { recordPlanVersion } from '../../src/data/planVersions'
import type { PlanVersion, StudyBlock } from '../../src/data/schema'

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

describe('recordPlanVersion', () => {
  it('speichert den Snapshot als JSON mit fortlaufender ID', () => {
    const snapshot = [block({ id: 1 })]
    const versions = recordPlanVersion([], 'Neuberechnung am 2026-08-10', snapshot, '2026-08-10T09:00:00Z')
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatchObject({
      id: 1,
      created_at: '2026-08-10T09:00:00Z',
      reason: 'Neuberechnung am 2026-08-10',
    })
    expect(JSON.parse(versions[0]!.snapshot_json)).toEqual(snapshot)
  })

  it('hängt an bestehende Fassungen an und zählt IDs weiter hoch', () => {
    const existing: PlanVersion[] = [{ id: 1, created_at: 'x', reason: 'erste', snapshot_json: '[]' }]
    const versions = recordPlanVersion(existing, 'zweite', [], 'y')
    expect(versions.map((v) => v.id)).toEqual([1, 2])
  })
})
