import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import {
  deleteCourseGroupRow,
  insertCourseGroup,
  loadCourseGroups,
  setCourseGroupRow,
  updateCourseGroupRow,
} from '../../src/data/courseGroupsRepo'
import { insertCourse, loadCourses } from '../../src/data/coursesRepo'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const, language: 'de' as const }

describe('courseGroupsRepo', () => {
  it('legt einen Ordner an und liefert ihn mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const group = await insertCourseGroup(conn, { parent_id: null, name: '3. Semester', sort_order: 0 })
    expect(group).toMatchObject({ id: 1, name: '3. Semester', parent_id: null, sort_order: 0 })
    expect(await loadCourseGroups(conn)).toEqual([group])
  })

  it('kaskadiert beim Löschen eines Elternordners auf Unterordner (ON DELETE CASCADE)', async () => {
    const conn = createTestConnection()
    const parent = await insertCourseGroup(conn, { parent_id: null, name: '3. Semester', sort_order: 0 })
    await insertCourseGroup(conn, { parent_id: parent.id, name: 'Q1', sort_order: 0 })

    await deleteCourseGroupRow(conn, parent.id)

    expect(await loadCourseGroups(conn)).toEqual([])
  })

  it('setzt group_id eines Fachs auf null zurück, wenn sein Ordner gelöscht wird (ON DELETE SET NULL)', async () => {
    const conn = createTestConnection()
    const group = await insertCourseGroup(conn, { parent_id: null, name: 'Q1', sort_order: 0 })
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    await setCourseGroupRow(conn, course.id, group.id)
    expect((await loadCourses(conn))[0]!.group_id).toBe(group.id)

    await deleteCourseGroupRow(conn, group.id)

    expect((await loadCourses(conn))[0]!.group_id).toBeNull()
  })

  it('aktualisiert Name/Eltern-Ordner/Reihenfolge per updateCourseGroupRow', async () => {
    const conn = createTestConnection()
    const group = await insertCourseGroup(conn, { parent_id: null, name: 'Alt', sort_order: 0 })

    await updateCourseGroupRow(conn, group.id, { name: 'Neu' })

    expect((await loadCourseGroups(conn))[0]!.name).toBe('Neu')
  })
})
