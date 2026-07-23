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
/** `mixed` fehlt bewusst — das ist keine eigene Auswahl, sondern das
 * abgeleitete Ergebnis, wenn mehr als eine der Optionen unten angehakt ist
 * (siehe `deriveFormat`). */
const SELECTABLE_FORMATS: AssessmentFormat[] = ['mc', 'freitext', 'essay', 'rechnen', 'fallstudie', 'open_book']
const FORMAT_LABELS: Record<AssessmentFormat, string> = {
  mc: 'Multiple Choice',
  freitext: 'Freitext',
  essay: 'Essay',
  rechnen: 'Rechnen',
  fallstudie: 'Fallstudie',
  open_book: 'Open Book',
  mixed: 'Gemischt',
}

/**
 * `assessments.format` ist eine einzelne Spalte (DATA_MODEL.md), aber der
 * Nutzer soll mehrere Formate gleichzeitig ankreuzen können (z. B. eine
 * Klausur mit Rechen- UND Multiple-Choice-Teil) — bewusst kein
 * Migrations-/Datenmodell-Umbau auf ein Array dafür: bei genau einer
 * Auswahl wird direkt dieses Format gespeichert, bei mehreren `mixed`
 * (bereits bestehender Formatwert, `domain/estimation.ts`s
 * `EXAM_FORMAT_MULTIPLIER.mixed` deckt genau diesen Fall ab). Einzelne
 * Kombinationen (z. B. „nur Rechnen + Essay") werden dadurch nicht mehr
 * voneinander unterschieden — für die grobe Aufwandsschätzung reicht das,
 * eine genauere Abbildung wäre eine eigene, größere Änderung.
 */
function deriveFormat(selected: AssessmentFormat[]): AssessmentFormat {
  return selected.length === 1 ? selected[0]! : 'mixed'
}

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
  formats: AssessmentFormat[]
  openBook: boolean
  durationMinutes: string
}

const EMPTY_DRAFT: DraftAssessment = {
  type: 'klausur',
  title: '',
  date: '',
  weight: 3,
  formats: [],
  openBook: false,
  durationMinutes: '',
}

function toDraft(a: Assessment): DraftAssessment {
  return {
    type: a.type,
    title: a.title,
    date: a.date,
    weight: a.weight,
    // `mixed` in der DB könnte aus mehreren Formaten entstanden sein, die
    // hier nicht mehr einzeln bekannt sind (siehe `deriveFormat`-Kommentar)
    // — Checkboxen starten dann bewusst leer statt zu raten.
    formats: a.format === 'mixed' ? [] : [a.format],
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
    format: deriveFormat(d.formats),
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

  const toggleFormat = (format: AssessmentFormat, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      formats: checked ? [...prev.formats, format] : prev.formats.filter((f) => f !== format),
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.title.trim().length === 0 || draft.date.trim().length === 0 || draft.formats.length === 0) return

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
            <span>{a.title}</span> <span>({a.date})</span> <span>{a.type}</span> <span>{FORMAT_LABELS[a.format]}</span>
            <button type="button" onClick={() => startEdit(a)}>
              Bearbeiten
            </button>
            <button
              type="button"
              aria-label={`Prüfung "${a.title}" löschen`}
              onClick={() => {
                if (window.confirm(`Prüfung "${a.title}" wirklich löschen?`)) onRemove(a.id)
              }}
            >
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
          <fieldset className="segmented-fieldset">
            <legend>Format (mehrere möglich)</legend>
            <div className="segmented-options">
              {SELECTABLE_FORMATS.map((f) => (
                <label key={f}>
                  <input type="checkbox" checked={draft.formats.includes(f)} onChange={(e) => toggleFormat(f, e.target.checked)} />
                  {FORMAT_LABELS[f]}
                </label>
              ))}
            </div>
            {draft.formats.length === 0 && <p role="alert">Mindestens ein Format wählen.</p>}
          </fieldset>
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
            Hilfsmittel erlaubt
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
