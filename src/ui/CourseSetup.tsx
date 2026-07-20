import { useState } from 'react'
import { addCourse, removeCourse, setCourseArchived, updateCourse } from '../data/courses'
import type { Course } from '../data/schema'

/**
 * Fach-Setup: Fächer anlegen, bearbeiten, archivieren, löschen. Voraus-
 * setzung für `estimation.ts`/`capacity.ts`, die bisher nur mit
 * synthetischen Testdaten laufen (siehe CONTEXT.md „Als Nächstes").
 *
 * Reine Präsentationskomponente wie `TopicTree` — Logik lebt in
 * `data/courses.ts`, `onChange` reicht den neuen Zustand nach außen.
 * `createdAt` kommt von außen (kein `Date.now()` in der Komponente), damit
 * die Zeitquelle an einer einzigen, austauschbaren Stelle bleibt.
 */

export interface CourseSetupProps {
  courses: Course[]
  onChange: (courses: Course[]) => void
  now: () => string
}

interface DraftCourse {
  name: string
  semester: string
  color: string
  priority: Course['priority']
  difficulty: Course['difficulty']
}

const EMPTY_DRAFT: DraftCourse = { name: '', semester: '', color: '#4f46e5', priority: 3, difficulty: 3 }

export function CourseSetup({ courses, onChange, now }: CourseSetupProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftCourse>(EMPTY_DRAFT)
  const [showArchived, setShowArchived] = useState(false)

  const visible = courses.filter((c) => showArchived || c.archived === 0)

  const startAdd = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(-1)
  }
  const startEdit = (course: Course) => {
    setDraft({
      name: course.name,
      semester: course.semester,
      color: course.color,
      priority: course.priority,
      difficulty: course.difficulty,
    })
    setEditingId(course.id)
  }
  const cancel = () => setEditingId(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.name.trim().length === 0 || draft.semester.trim().length === 0) return

    if (editingId === -1) {
      onChange(addCourse(courses, { ...draft, name: draft.name.trim(), semester: draft.semester.trim() }, now()))
    } else if (editingId !== null) {
      onChange(updateCourse(courses, editingId, { ...draft, name: draft.name.trim() }))
    }
    setEditingId(null)
  }

  return (
    <section aria-label="Fach-Setup">
      <h2>Fächer</h2>
      <label>
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Archivierte anzeigen
      </label>

      <ul>
        {visible.map((course) => (
          <li key={course.id} data-course-id={course.id}>
            <span>{course.name}</span> <span>({course.semester})</span>
            {course.archived === 1 && <span> — archiviert</span>}
            <button type="button" onClick={() => startEdit(course)}>
              Bearbeiten
            </button>
            <button type="button" onClick={() => onChange(setCourseArchived(courses, course.id, course.archived === 0))}>
              {course.archived === 0 ? 'Archivieren' : 'Wiederherstellen'}
            </button>
            <button type="button" onClick={() => onChange(removeCourse(courses, course.id))}>
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {editingId === null ? (
        <button type="button" onClick={startAdd}>
          Fach hinzufügen
        </button>
      ) : (
        <form onSubmit={submit} aria-label={editingId === -1 ? 'Neues Fach' : 'Fach bearbeiten'}>
          <label>
            Name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </label>
          <label>
            Semester
            <input value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })} required />
          </label>
          <label>
            Farbe
            <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          </label>
          <label>
            Priorität
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) as Course['priority'] })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Schwierigkeit
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: Number(e.target.value) as Course['difficulty'] })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
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
