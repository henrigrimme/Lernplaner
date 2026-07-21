import type { SqlConnection } from './db'
import type { Assessment } from './schema'
import type { NewAssessmentInput } from './assessments'

/**
 * Echte SQL-Operationen für `assessments` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 3, nach demselben Muster
 * wie `data/coursesRepo.ts`. `insertAssessment` liefert die echte
 * `AUTOINCREMENT`-`id` zurück statt sie zu raten.
 *
 * Getestet über `tests/data/testConnection.ts` (echtes SQL gegen
 * `better-sqlite3`, keine Mocks) — nicht gegen die echte Tauri-IPC-Bridge.
 */

export async function loadAssessments(conn: SqlConnection): Promise<Assessment[]> {
  return conn.select<Assessment>('SELECT * FROM assessments ORDER BY id')
}

export async function insertAssessment(conn: SqlConnection, input: NewAssessmentInput): Promise<Assessment> {
  const result = await conn.execute(
    `INSERT INTO assessments (course_id, type, title, date, weight, format, open_book, duration_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.course_id,
      input.type,
      input.title,
      input.date,
      input.weight,
      input.format,
      input.open_book,
      input.duration_minutes,
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function updateAssessmentRow(
  conn: SqlConnection,
  id: number,
  changes: Partial<NewAssessmentInput>,
): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewAssessmentInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE assessments SET ${setClause} WHERE id = ?`, [...fields.map((field) => changes[field]), id])
}

export async function deleteAssessmentRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM assessments WHERE id = ?', [id])
}
