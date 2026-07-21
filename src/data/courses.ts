import type { Course } from './schema'

/**
 * Reine Editierfunktionen für den lokalen Fächer-Zustand (siehe
 * DATA_MODEL.md „Kern"). Kein Datenbankzugriff, keine Systemuhr.
 *
 * Seit der Persistenz-Härtung (`data/coursesRepo.ts`, `tauri-plugin-sql`,
 * siehe CONTEXT.md) übernehmen diese Funktionen nur noch Änderungen, bei
 * denen die `id` bereits feststeht (Aktualisieren/Archivieren/Löschen).
 * Neuanlegen braucht keine reine Funktion mehr: die echte `id` kommt jetzt
 * per `AUTOINCREMENT` aus der Datenbank (`coursesRepo.insertCourse`),
 * lokales Raten einer `id` (wie früher `addCourse`/`nextId` hier) wäre
 * jetzt falsch statt nur vorläufig.
 */

export interface NewCourseInput {
  name: string
  semester: string
  color: string
  priority: 1 | 2 | 3 | 4 | 5
  difficulty: 1 | 2 | 3 | 4 | 5
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
