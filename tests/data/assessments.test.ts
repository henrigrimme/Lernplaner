import { describe, expect, it } from 'vitest'
import {
  addAssessment,
  assessmentsByCourse,
  removeAssessment,
  updateAssessment,
} from '../../src/data/assessments'
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

describe('addAssessment', () => {
  it('vergibt fortlaufende IDs', () => {
    const result = addAssessment(addAssessment([], INPUT), INPUT)
    expect(result.map((a) => a.id)).toEqual([1, 2])
  })
})

describe('updateAssessment', () => {
  it('ändert nur die angegebenen Felder', () => {
    const assessments = addAssessment([], INPUT)
    const result = updateAssessment(assessments, 1, { date: '2026-10-20' })
    expect(result[0]).toMatchObject({ date: '2026-10-20', title: 'Endklausur' })
  })
})

describe('removeAssessment', () => {
  it('entfernt die Prüfung', () => {
    expect(removeAssessment(addAssessment([], INPUT), 1)).toEqual([])
  })
})

describe('assessmentsByCourse', () => {
  it('filtert nach Fach und sortiert nach Datum', () => {
    const assessments: Assessment[] = [
      { id: 1, ...INPUT, course_id: 1, date: '2026-10-20' },
      { id: 2, ...INPUT, course_id: 2, date: '2026-10-05' },
      { id: 3, ...INPUT, course_id: 1, date: '2026-10-10' },
    ]
    const result = assessmentsByCourse(assessments, 1)
    expect(result.map((a) => a.id)).toEqual([3, 1])
  })
})
