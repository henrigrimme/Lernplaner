import type { Assessment } from './schema'

/** Reine Editierfunktionen für Prüfungen — siehe `courses.ts` für das Muster. */

export type NewAssessmentInput = Omit<Assessment, 'id'>

function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

export function addAssessment(assessments: Assessment[], input: NewAssessmentInput): Assessment[] {
  return [...assessments, { id: nextId(assessments), ...input }]
}

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
