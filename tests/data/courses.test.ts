import { describe, expect, it } from 'vitest'
import { removeCourse, setCourseArchived, updateCourse } from '../../src/data/courses'
import type { Course } from '../../src/data/schema'

function courseFixture(overrides: Partial<Course> = {}): Course {
  return {
    id: 1,
    name: 'Microeconomics',
    semester: 'WS25',
    color: '#3366ff',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
    group_id: null,
    ...overrides,
  }
}

describe('updateCourse', () => {
  it('ändert nur die angegebenen Felder', () => {
    const result = updateCourse([courseFixture()], 1, { priority: 5 })
    expect(result[0]).toMatchObject({ priority: 5, name: 'Microeconomics' })
  })
})

describe('setCourseArchived', () => {
  it('archiviert und entarchiviert', () => {
    const courses = [courseFixture()]
    expect(setCourseArchived(courses, 1, true)[0]!.archived).toBe(1)
    expect(setCourseArchived(setCourseArchived(courses, 1, true), 1, false)[0]!.archived).toBe(0)
  })
})

describe('removeCourse', () => {
  it('entfernt das Fach vollständig', () => {
    expect(removeCourse([courseFixture()], 1)).toEqual([])
  })
})
