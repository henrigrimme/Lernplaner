import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { deletePaperStepRow, insertPaperStep, loadPaperSteps, updatePaperStepRow } from '../../src/data/paperStepsRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertAssessment } from '../../src/data/assessmentsRepo'
import type { SqlConnection } from '../../src/data/db'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }

const ASSESSMENT_INPUT = {
  course_id: 1,
  type: 'paper' as const,
  title: 'Term Paper',
  date: '2026-10-20',
  weight: 5 as const,
  format: 'freitext' as const,
  open_book: 1 as const,
  duration_minutes: null,
}

const INPUT = {
  assessment_id: 1,
  title: 'Literaturrecherche',
  due_date: '2026-09-15',
  status: 'offen' as const,
  notes: null,
}

async function seedAssessment(conn: SqlConnection) {
  const course = await insertCourse(conn, COURSE_INPUT, 'x')
  return insertAssessment(conn, { ...ASSESSMENT_INPUT, course_id: course.id })
}

describe('paperStepsRepo', () => {
  it('legt einen Teilschritt an und liefert ihn mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const assessment = await seedAssessment(conn)
    const step = await insertPaperStep(conn, { ...INPUT, assessment_id: assessment.id })
    expect(step).toMatchObject({ id: 1, ...INPUT, assessment_id: assessment.id })
    expect(await loadPaperSteps(conn)).toEqual([step])
  })

  it('aktualisiert nur die angegebenen Felder', async () => {
    const conn = createTestConnection()
    const assessment = await seedAssessment(conn)
    const step = await insertPaperStep(conn, { ...INPUT, assessment_id: assessment.id })
    await updatePaperStepRow(conn, step.id, { status: 'erledigt' })
    const [updated] = await loadPaperSteps(conn)
    expect(updated).toMatchObject({ status: 'erledigt', title: 'Literaturrecherche' })
  })

  it('löscht einen Teilschritt vollständig', async () => {
    const conn = createTestConnection()
    const assessment = await seedAssessment(conn)
    const step = await insertPaperStep(conn, { ...INPUT, assessment_id: assessment.id })
    await deletePaperStepRow(conn, step.id)
    expect(await loadPaperSteps(conn)).toEqual([])
  })

  it('kaskadiert beim Löschen der zugehörigen Prüfung (ON DELETE CASCADE)', async () => {
    const conn = createTestConnection()
    const assessment = await seedAssessment(conn)
    await insertPaperStep(conn, { ...INPUT, assessment_id: assessment.id })
    const { deleteAssessmentRow } = await import('../../src/data/assessmentsRepo')
    await deleteAssessmentRow(conn, assessment.id)
    expect(await loadPaperSteps(conn)).toEqual([])
  })
})
