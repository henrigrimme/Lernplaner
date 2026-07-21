import { useState } from 'react'
import { assessmentsByCourse } from '../data/assessments'
import type { Assessment, AssessmentFormat, AssessmentType, Course } from '../data/schema'
import type { NewAssessmentInput } from '../data/assessments'

/**
 * Prüfungs-Setup für ein Fach: Klausuren/Paper/Präsentationen anlegen,
 * bearbeiten, löschen. Liefert `assessment.format`/`weight`/`date`, die
 * `estimation.ts`/`capacity.ts` für eine echte Rechnung brauchen.
 *
 * Reine Präsentationskomponente wie `CourseSetup`/`TopicTree` — kennt wie
 * `CourseSetup` seit der Persistenz-Härtung `data/assessmentsRepo.ts`
 * nicht direkt: jede Aktion geht über einen eigenen Callback
 * (`onAdd`/`onUpdate`/`onRemove`) nach außen, siehe dortiger Kommentar zur
 * Begründung.
 */

const TYPES: AssessmentType[] = ['klausur', 'paper', 'praesentation']
const FORMATS: AssessmentFormat[] = ['mc', 'freitext', 'essay', 'rechnen', 'fallstudie', 'open_book', 'mixed']

export interface AssessmentSetupProps {
  course: Course
  assessments: Assessment[]
  onAdd: (input: NewAssessmentInput) => void
  onUpdate: (id: number, changes: Partial<NewAssessmentInput>) => void
  onRemove: (id: number) => void
}

interface DraftAssessment {
  type: AssessmentType
  title: string
  date: string
  weight: Assessment['weight']
  format: AssessmentFormat
  openBook: boolean
  durationMinutes: string
}

const EMPTY_DRAFT: DraftAssessment = {
  type: 'klausur',
  title: '',
  date: '',
  weight: 3,
  format: 'mixed',
  openBook: false,
  durationMinutes: '',
}

function toDraft(a: Assessment): DraftAssessment {
  return {
    type: a.type,
    title: a.title,
    date: a.date,
    weight: a.weight,
    format: a.format,
    openBook: a.open_book === 1,
    durationMinutes: a.duration_minutes === null ? '' : String(a.duration_minutes),
  }
}

function fromDraft(courseId: number, d: DraftAssessment): Omit<Assessment, 'id'> {
  return {
    course_id: courseId,
    type: d.type,
    title: d.title.trim(),
    date: d.date,
    weight: d.weight,
    format: d.format,
    open_book: d.openBook ? 1 : 0,
    duration_minutes: d.durationMinutes.trim() === '' ? null : Number(d.durationMinutes),
  }
}

export function AssessmentSetup({ course, assessments, onAdd, onUpdate, onRemove }: AssessmentSetupProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftAssessment>(EMPTY_DRAFT)

  const forCourse = assessmentsByCourse(assessments, course.id)

  const startAdd = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(-1)
  }
  const startEdit = (a: Assessment) => {
    setDraft(toDraft(a))
    setEditingId(a.id)
  }
  const cancel = () => setEditingId(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.title.trim().length === 0 || draft.date.trim().length === 0) return

    if (editingId === -1) {
      onAdd(fromDraft(course.id, draft))
    } else if (editingId !== null) {
      const { course_id: _courseId, ...changes } = fromDraft(course.id, draft)
      onUpdate(editingId, changes)
    }
    setEditingId(null)
  }

  return (
    <section aria-label={`Prüfungen: ${course.name}`}>
      <h3>Prüfungen — {course.name}</h3>
      <ul>
        {forCourse.map((a) => (
          <li key={a.id} data-assessment-id={a.id}>
            <span>{a.title}</span> <span>({a.date})</span> <span>{a.type}</span> <span>{a.format}</span>
            <button type="button" onClick={() => startEdit(a)}>
              Bearbeiten
            </button>
            <button type="button" onClick={() => onRemove(a.id)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {editingId === null ? (
        <button type="button" onClick={startAdd}>
          Prüfung hinzufügen
        </button>
      ) : (
        <form onSubmit={submit} aria-label={editingId === -1 ? 'Neue Prüfung' : 'Prüfung bearbeiten'}>
          <label>
            Titel
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </label>
          <label>
            Prüfungsdatum
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              required
            />
          </label>
          <label>
            Art
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as AssessmentType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Format
            <select
              value={draft.format}
              onChange={(e) => setDraft({ ...draft, format: e.target.value as AssessmentFormat })}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gewicht
            <select
              value={draft.weight}
              onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) as Assessment['weight'] })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.openBook}
              onChange={(e) => setDraft({ ...draft, openBook: e.target.checked })}
            />
            Open Book
          </label>
          <label>
            Dauer (Minuten, optional)
            <input
              type="number"
              min={0}
              value={draft.durationMinutes}
              onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
            />
          </label>
          <button type="submit">Speichern</button>
          <button type="button" onClick={cancel}>
            Abbrechen
          </button>
        </form>
      )}
    </section>
  )
}
