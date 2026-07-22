import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { deleteAssessmentRow, insertAssessment, loadAssessments, updateAssessmentRow } from '../../src/data/assessmentsRepo'
import { insertCourse } from '../../src/data/coursesRepo'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const, language: 'de' as const }

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

describe('assessmentsRepo', () => {
  it('legt eine Prüfung an und liefert sie mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const assessment = await insertAssessment(conn, { ...INPUT, course_id: course.id })
    expect(assessment).toMatchObject({ id: 1, ...INPUT, course_id: course.id })
    expect(await loadAssessments(conn)).toEqual([assessment])
  })

  it('vergibt fortlaufende AUTOINCREMENT-ids für mehrere Prüfungen', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    await insertAssessment(conn, { ...INPUT, course_id: course.id })
    const second = await insertAssessment(conn, { ...INPUT, course_id: course.id, title: 'Zwischenklausur' })
    expect(second.id).toBe(2)
  })

  it('aktualisiert nur die angegebenen Felder', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const assessment = await insertAssessment(conn, { ...INPUT, course_id: course.id })
    await updateAssessmentRow(conn, assessment.id, { date: '2026-10-20' })
    const [updated] = await loadAssessments(conn)
    expect(updated).toMatchObject({ date: '2026-10-20', title: 'Endklausur' })
  })

  it('löscht eine Prüfung vollständig', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const assessment = await insertAssessment(conn, { ...INPUT, course_id: course.id })
    await deleteAssessmentRow(conn, assessment.id)
    expect(await loadAssessments(conn)).toEqual([])
  })

  it('kaskadiert beim Löschen des zugehörigen Fachs (ON DELETE CASCADE)', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    await insertAssessment(conn, { ...INPUT, course_id: course.id })
    await conn.execute('DELETE FROM courses WHERE id = ?', [course.id])
    expect(await loadAssessments(conn)).toEqual([])
  })
})
