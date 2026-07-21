import { describe, expect, it } from 'vitest'
import { assessmentsByCourse, removeAssessment, updateAssessment } from '../../src/data/assessments'
import type { Assessment } from '../../src/data/schema'

const INPUT = {
  course_id: 1,
  type: 'klausur' as const,
  title: 'Endklausur',
  date: '2026-10-15',
  weight: 5 as const,
  format: 'mixed' as const,
  open_book: 0 as const,
  duration_minutes: 90,
}

function assessmentFixture(overrides: Partial<Assessment> = {}): Assessment {
  return { id: 1, ...INPUT, ...overrides }
}

describe('updateAssessment', () => {
  it('ändert nur die angegebenen Felder', () => {
    const result = updateAssessment([assessmentFixture()], 1, { date: '2026-10-20' })
    expect(result[0]).toMatchObject({ date: '2026-10-20', title: 'Endklausur' })
  })
})

describe('removeAssessment', () => {
  it('entfernt die Prüfung', () => {
    expect(removeAssessment([assessmentFixture()], 1)).toEqual([])
  })
})

describe('assessmentsByCourse', () => {
  it('filtert nach Fach und sortiert nach Datum', () => {
    const assessments: Assessment[] = [
      assessmentFixture({ id: 1, course_id: 1, date: '2026-10-20' }),
      assessmentFixture({ id: 2, course_id: 2, date: '2026-10-05' }),
      assessmentFixture({ id: 3, course_id: 1, date: '2026-10-10' }),
    ]
    const result = assessmentsByCourse(assessments, 1)
    expect(result.map((a) => a.id)).toEqual([3, 1])
  })
})
