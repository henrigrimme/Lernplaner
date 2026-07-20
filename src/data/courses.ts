import type { Course } from './schema'

/**
 * Reine Editierfunktionen für Fächer (siehe DATA_MODEL.md „Kern"). Wie
 * `topicTree.ts`: kein Datenbankzugriff, keine Systemuhr — `createdAt`
 * kommt explizit vom Aufrufer, damit die Funktionen deterministisch
 * bleiben (ARCHITECTURE.md „domain/ … kennt weder DB noch UI").
 *
 * Vor dem Tauri-Rahmen (`tauri-plugin-sql`, siehe CONTEXT.md) gibt es noch
 * keine echten `id`/`created_at`-Werte aus der Datenbank — `nextId` vergibt
 * fortlaufende IDs innerhalb des lokalen Zustands, kompatibel mit dem
 * späteren `AUTOINCREMENT`-Verhalten (0001_init.sql), aber ohne DB-Zugriff.
 */

export interface NewCourseInput {
  name: string
  semester: string
  color: string
  priority: 1 | 2 | 3 | 4 | 5
  difficulty: 1 | 2 | 3 | 4 | 5
}

function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

export function addCourse(courses: Course[], input: NewCourseInput, createdAt: string): Course[] {
  const course: Course = { id: nextId(courses), ...input, archived: 0, created_at: createdAt }
  return [...courses, course]
}

export function updateCourse(
  courses: Course[],
  id: number,
  changes: Partial<NewCourseInput>,
): Course[] {
  return courses.map((c) => (c.id === id ? { ...c, ...changes } : c))
}

export function setCourseArchived(courses: Course[], id: number, archived: boolean): Course[] {
  return courses.map((c) => (c.id === id ? { ...c, archived: archived ? 1 : 0 } : c))
}

/** Entfernt ein Fach vollständig (z. B. eine Fehleingabe korrigieren) — kein sanftes Archivieren. */
export function removeCourse(courses: Course[], id: number): Course[] {
  return courses.filter((c) => c.id !== id)
}
