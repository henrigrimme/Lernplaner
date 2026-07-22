import type { SqlConnection } from './db'
import type { CourseGroup } from './schema'

/** Echte SQL-Operationen für `course_groups` (Migration 0005) — Muster von `data/coursesRepo.ts`. */

export async function loadCourseGroups(conn: SqlConnection): Promise<CourseGroup[]> {
  return conn.select<CourseGroup>('SELECT * FROM course_groups ORDER BY sort_order, id')
}

export interface NewCourseGroupInput {
  parent_id: number | null
  name: string
  sort_order: number
}

export async function insertCourseGroup(conn: SqlConnection, input: NewCourseGroupInput): Promise<CourseGroup> {
  const result = await conn.execute('INSERT INTO course_groups (parent_id, name, sort_order) VALUES (?, ?, ?)', [
    input.parent_id,
    input.name,
    input.sort_order,
  ])
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function updateCourseGroupRow(conn: SqlConnection, id: number, changes: Partial<NewCourseGroupInput>): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewCourseGroupInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE course_groups SET ${setClause} WHERE id = ?`, [...fields.map((field) => changes[field]), id])
}

export async function deleteCourseGroupRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM course_groups WHERE id = ?', [id])
}

/** Weist ein Fach einem Ordner zu (`null` = kein Ordner, oberste Ebene). */
export async function setCourseGroupRow(conn: SqlConnection, courseId: number, groupId: number | null): Promise<void> {
  await conn.execute('UPDATE courses SET group_id = ? WHERE id = ?', [groupId, courseId])
}
