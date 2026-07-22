import { describe, expect, it } from 'vitest'
import {
  buildCourseGroupTree,
  deleteCourseGroup,
  moveCourseGroup,
  renameCourseGroup,
  ungroupedCourses,
} from '../../src/data/courseGroups'
import type { Course, CourseGroup } from '../../src/data/schema'

function group(overrides: Partial<CourseGroup> & { id: number }): CourseGroup {
  return { parent_id: null, name: `Ordner ${overrides.id}`, sort_order: 0, ...overrides }
}

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: `Fach ${overrides.id}`,
    semester: 'WS26',
    color: '#000',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
    group_id: null,
    ...overrides,
  }
}

describe('buildCourseGroupTree', () => {
  it('verschachtelt Ordner nach parent_id, sortiert nach sort_order, und hängt zugewiesene Fächer an', () => {
    const groups = [
      group({ id: 1, name: '3. Semester', sort_order: 0 }),
      group({ id: 2, name: 'Q2', parent_id: 1, sort_order: 1 }),
      group({ id: 3, name: 'Q1', parent_id: 1, sort_order: 0 }),
    ]
    const courses = [course({ id: 10, name: 'Microeconomics', group_id: 3 }), course({ id: 11, name: 'Money & Banking', group_id: 2 })]

    const tree = buildCourseGroupTree(groups, courses)

    expect(tree.map((n) => n.name)).toEqual(['3. Semester'])
    expect(tree[0]!.children.map((n) => n.name)).toEqual(['Q1', 'Q2'])
    expect(tree[0]!.children[0]!.courses.map((c) => c.name)).toEqual(['Microeconomics'])
    expect(tree[0]!.children[1]!.courses.map((c) => c.name)).toEqual(['Money & Banking'])
  })

  it('zeigt einen Ordner mit ins Leere zeigendem parent_id als eigene Wurzel statt zu verschwinden', () => {
    const groups = [group({ id: 1, parent_id: 999 })]
    const tree = buildCourseGroupTree(groups, [])
    expect(tree.map((n) => n.id)).toEqual([1])
  })
})

describe('ungroupedCourses', () => {
  it('liefert nur Fächer ohne group_id', () => {
    const courses = [course({ id: 1, group_id: null }), course({ id: 2, group_id: 5 })]
    expect(ungroupedCourses(courses).map((c) => c.id)).toEqual([1])
  })
})

describe('renameCourseGroup', () => {
  it('benennt um und trimmt', () => {
    const groups = [group({ id: 1, name: 'Alt' })]
    expect(renameCourseGroup(groups, 1, '  Neu  ')[0]!.name).toBe('Neu')
  })

  it('wirft bei leerem Namen', () => {
    const groups = [group({ id: 1 })]
    expect(() => renameCourseGroup(groups, 1, '   ')).toThrow()
  })
})

describe('moveCourseGroup', () => {
  it('verschiebt in einen anderen Ordner und nummeriert unter den neuen Geschwistern nach', () => {
    const groups = [group({ id: 1 }), group({ id: 2 }), group({ id: 3, parent_id: 2, sort_order: 0 })]
    const moved = moveCourseGroup(groups, 1, 2)
    expect(moved.find((g) => g.id === 1)!.parent_id).toBe(2)
    expect(moved.find((g) => g.id === 1)!.sort_order).toBe(1) // nach dem bereits vorhandenen Kind (id 3)
  })

  it('verweigert das Verschieben in den eigenen Teilbaum', () => {
    const groups = [group({ id: 1 }), group({ id: 2, parent_id: 1 })]
    expect(() => moveCourseGroup(groups, 1, 2)).toThrow()
  })
})

describe('deleteCourseGroup', () => {
  it('löscht den Ordner samt Unterordnern kaskadiert, lässt zugewiesene Fächer aber nur "ordnerlos" werden', () => {
    const groups = [group({ id: 1 }), group({ id: 2, parent_id: 1 })]
    const courses = [course({ id: 10, group_id: 2 })]

    const result = deleteCourseGroup(groups, courses, 1)

    expect(result.groups).toEqual([])
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0]!.group_id).toBeNull()
  })
})
