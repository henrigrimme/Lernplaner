import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import {
  deleteCourseRow,
  insertCourse,
  loadCourses,
  setCourseArchivedRow,
  updateCourseRow,
} from '../../src/data/coursesRepo'

const INPUT = { name: 'Microeconomics', semester: 'WS25', color: '#3366ff', priority: 3 as const, difficulty: 3 as const }

describe('coursesRepo', () => {
  it('legt ein Fach an und liefert es mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, INPUT, '2026-07-21T00:00:00.000Z')
    expect(course).toMatchObject({ id: 1, ...INPUT, archived: 0, created_at: '2026-07-21T00:00:00.000Z' })
    expect(await loadCourses(conn)).toEqual([course])
  })

  it('vergibt fortlaufende AUTOINCREMENT-ids für mehrere Fächer', async () => {
    const conn = createTestConnection()
    await insertCourse(conn, INPUT, 'x')
    const second = await insertCourse(conn, { ...INPUT, name: 'Money & Banking' }, 'x')
    expect(second.id).toBe(2)
  })

  it('aktualisiert nur die angegebenen Felder', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, INPUT, 'x')
    await updateCourseRow(conn, course.id, { priority: 5 })
    const [updated] = await loadCourses(conn)
    expect(updated).toMatchObject({ priority: 5, name: 'Microeconomics' })
  })

  it('tut nichts bei leeren changes', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, INPUT, 'x')
    await updateCourseRow(conn, course.id, {})
    expect(await loadCourses(conn)).toEqual([course])
  })

  it('archiviert und entarchiviert', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, INPUT, 'x')
    await setCourseArchivedRow(conn, course.id, true)
    expect((await loadCourses(conn))[0]!.archived).toBe(1)
    await setCourseArchivedRow(conn, course.id, false)
    expect((await loadCourses(conn))[0]!.archived).toBe(0)
  })

  it('löscht ein Fach vollständig', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, INPUT, 'x')
    await deleteCourseRow(conn, course.id)
    expect(await loadCourses(conn)).toEqual([])
  })
})
