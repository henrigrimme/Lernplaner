import type { SqlConnection } from './db'
import type { Course } from './schema'
import type { NewCourseInput } from './courses'

/**
 * Echte SQL-Operationen für `courses` über `SqlConnection` (siehe
 * `data/db.ts`) — das Async-Pendant zu den reinen Array-Funktionen in
 * `data/courses.ts`, die weiterhin für Änderungen mit bereits bekannter
 * `id` (Update/Archivieren/Löschen) den lokalen Zustand nachziehen (siehe
 * `App.tsx`). `insertCourse` liefert die echte, von der Datenbank
 * vergebene `id` (`AUTOINCREMENT`) zurück, statt sie zu raten.
 *
 * Getestet über `tests/data/testConnection.ts` (echtes SQL gegen
 * `better-sqlite3`, keine Mocks) — nicht gegen die echte Tauri-IPC-Bridge,
 * die lässt sich nicht per Vitest ansprechen (siehe `data/db.ts`).
 */

export async function loadCourses(conn: SqlConnection): Promise<Course[]> {
  return conn.select<Course>('SELECT * FROM courses ORDER BY id')
}

export async function insertCourse(conn: SqlConnection, input: NewCourseInput, createdAt: string): Promise<Course> {
  const result = await conn.execute(
    'INSERT INTO courses (name, semester, color, priority, difficulty, archived, created_at, language) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [input.name, input.semester, input.color, input.priority, input.difficulty, createdAt, input.language],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input, archived: 0, created_at: createdAt, group_id: null }
}

export async function updateCourseRow(conn: SqlConnection, id: number, changes: Partial<NewCourseInput>): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewCourseInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE courses SET ${setClause} WHERE id = ?`, [...fields.map((field) => changes[field]), id])
}

export async function setCourseArchivedRow(conn: SqlConnection, id: number, archived: boolean): Promise<void> {
  await conn.execute('UPDATE courses SET archived = ? WHERE id = ?', [archived ? 1 : 0, id])
}

export async function deleteCourseRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM courses WHERE id = ?', [id])
}
