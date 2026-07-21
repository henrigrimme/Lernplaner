import type { SqlConnection } from './db'
import type { PaperStep } from './schema'
import type { NewPaperStepInput } from './paperSteps'

/**
 * Echte SQL-Operationen für `paper_steps` über `SqlConnection` (siehe
 * `data/db.ts`) — das Async-Pendant zu den reinen Array-Funktionen in
 * `data/paperSteps.ts`, analog zu `coursesRepo.ts`/`courses.ts`.
 */

export async function loadPaperSteps(conn: SqlConnection): Promise<PaperStep[]> {
  return conn.select<PaperStep>('SELECT * FROM paper_steps ORDER BY id')
}

export async function insertPaperStep(conn: SqlConnection, input: NewPaperStepInput): Promise<PaperStep> {
  const result = await conn.execute(
    'INSERT INTO paper_steps (assessment_id, title, due_date, status, notes) VALUES (?, ?, ?, ?, ?)',
    [input.assessment_id, input.title, input.due_date, input.status, input.notes],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function updatePaperStepRow(
  conn: SqlConnection,
  id: number,
  changes: Partial<NewPaperStepInput>,
): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewPaperStepInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE paper_steps SET ${setClause} WHERE id = ?`, [
    ...fields.map((field) => changes[field]),
    id,
  ])
}

export async function deletePaperStepRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM paper_steps WHERE id = ?', [id])
}
