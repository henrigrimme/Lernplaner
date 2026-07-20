import { describe, expect, it } from 'vitest'
import { addCourse, removeCourse, setCourseArchived, updateCourse } from '../../src/data/courses'
import type { Course } from '../../src/data/schema'

const INPUT = { name: 'Microeconomics', semester: 'WS25', color: '#3366ff', priority: 3, difficulty: 3 } as const

describe('addCourse', () => {
  it('vergibt fortlaufende IDs und setzt archived=0', () => {
    const withOne = addCourse([], INPUT, '2026-07-20T00:00:00.000Z')
    expect(withOne[0]).toMatchObject({ id: 1, archived: 0, created_at: '2026-07-20T00:00:00.000Z' })

    const withTwo = addCourse(withOne, { ...INPUT, name: 'Money & Banking' }, '2026-07-20T00:00:00.000Z')
    expect(withTwo[1]!.id).toBe(2)
  })

  it('vergibt eine ID nach der höchsten bestehenden, auch nach Löschungen', () => {
    const courses: Course[] = [{ id: 5, ...INPUT, archived: 0, created_at: 'x' }]
    const result = addCourse(courses, INPUT, 'x')
    expect(result[1]!.id).toBe(6)
  })
})

describe('updateCourse', () => {
  it('ändert nur die angegebenen Felder', () => {
    const courses = addCourse([], INPUT, 'x')
    const result = updateCourse(courses, 1, { priority: 5 })
    expect(result[0]).toMatchObject({ priority: 5, name: 'Microeconomics' })
  })
})

describe('setCourseArchived', () => {
  it('archiviert und entarchiviert', () => {
    const courses = addCourse([], INPUT, 'x')
    expect(setCourseArchived(courses, 1, true)[0]!.archived).toBe(1)
    expect(setCourseArchived(setCourseArchived(courses, 1, true), 1, false)[0]!.archived).toBe(0)
  })
})

describe('removeCourse', () => {
  it('entfernt das Fach vollständig', () => {
    const courses = addCourse([], INPUT, 'x')
    expect(removeCourse(courses, 1)).toEqual([])
  })
})
