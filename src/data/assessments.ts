import type { Assessment } from './schema'

/**
 * Reine Editierfunktionen für den lokalen Prüfungs-Zustand — siehe
 * `courses.ts` für das Muster und die Begründung: seit der
 * Persistenz-Härtung (`data/assessmentsRepo.ts`) übernehmen diese
 * Funktionen nur noch Änderungen mit bereits bekannter `id`
 * (Aktualisieren/Löschen). Neuanlegen liefert die echte `id` jetzt per
 * `AUTOINCREMENT` aus der Datenbank.
 */

export type NewAssessmentInput = Omit<Assessment, 'id'>

export function updateAssessment(
  assessments: Assessment[],
  id: number,
  changes: Partial<NewAssessmentInput>,
): Assessment[] {
  return assessments.map((a) => (a.id === id ? { ...a, ...changes } : a))
}

export function removeAssessment(assessments: Assessment[], id: number): Assessment[] {
  return assessments.filter((a) => a.id !== id)
}

/** Alle Prüfungen eines Fachs, aufsteigend nach Datum — für die „nächste Prüfung zuerst"-Anzeige. */
export function assessmentsByCourse(assessments: Assessment[], courseId: number): Assessment[] {
  return assessments
    .filter((a) => a.course_id === courseId)
    .sort((a, b) => a.date.localeCompare(b.date))
}
