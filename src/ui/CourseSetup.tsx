import { useState } from 'react'
import type { NewCourseInput } from '../data/courses'
import type { Course } from '../data/schema'

/**
 * Fach-Setup: Fächer anlegen, bearbeiten, archivieren, löschen. Voraus-
 * setzung für `estimation.ts`/`capacity.ts`.
 *
 * Reine Präsentationskomponente wie `TopicTree` — kennt weder `data/
 * courses.ts` noch `data/coursesRepo.ts` direkt (anders als vor der
 * Persistenz-Härtung): jede Aktion geht über einen eigenen Callback
 * (`onAdd`/`onUpdate`/`onArchive`/`onRemove`) nach außen, weil der
 * Aufrufer (`App.tsx`) jetzt sowohl die echte Datenbank-Operation als auch
 * die lokale Zustandsänderung ausführen muss — ein einzelnes `onChange`
 * mit dem fertigen Array (wie zuvor) ließe offen, *welche* Änderung
 * passiert ist, und damit auch nicht, welche SQL-Operation dazu gehört.
 */

export interface CourseSetupProps {
  courses: Course[]
  onAdd: (input: NewCourseInput) => void
  onUpdate: (id: number, changes: Partial<NewCourseInput>) => void
  onArchive: (id: number, archived: boolean) => void
  onRemove: (id: number) => void
}

interface DraftCourse {
  name: string
  semester: string
  color: string
  priority: Course['priority']
  difficulty: Course['difficulty']
}

/** Kuratierte, benannte Fach-Farben statt freier Hex-Eingabe — jede
 * deutlich unterscheidbar von der Terrakotta-Akzentfarbe der App selbst
 * (DESIGN.md „One Accent Rule"), damit eine Fach-Farbe nie mit der
 * App-Akzentfarbe verwechselt wird. */
export const COURSE_COLORS: { name: string; hex: string }[] = [
  { name: 'Terrakotta', hex: '#c9754f' },
  { name: 'Ocker', hex: '#c2a02a' },
  { name: 'Olivgrün', hex: '#7c8b4a' },
  { name: 'Petrolblau', hex: '#3e6b6b' },
  { name: 'Taubenblau', hex: '#6e8cae' },
  { name: 'Pflaume', hex: '#8b5a7c' },
  { name: 'Bordeaux', hex: '#8c4a4a' },
  { name: 'Graphit', hex: '#5c5a55' },
]

const EMPTY_DRAFT: DraftCourse = { name: '', semester: '', color: '#c9754f', priority: 3, difficulty: 3 }

export function CourseSetup({ courses, onAdd, onUpdate, onArchive, onRemove }: CourseSetupProps) {
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
      onAdd({ ...draft, name: draft.name.trim(), semester: draft.semester.trim() })
    } else if (editingId !== null) {
      onUpdate(editingId, { ...draft, name: draft.name.trim() })
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
            <button type="button" onClick={() => onArchive(course.id, course.archived === 0)}>
              {course.archived === 0 ? 'Archivieren' : 'Wiederherstellen'}
            </button>
            <button type="button" onClick={() => onRemove(course.id)}>
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
            <span className="color-select">
              <span className="color-swatch" style={{ backgroundColor: draft.color }} aria-hidden="true" />
              <select value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })}>
                {COURSE_COLORS.map((c) => (
                  <option key={c.hex} value={c.hex}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            Priorität (1 = niedrig, 5 = hoch)
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
            Schwierigkeit (1 = leicht, 5 = schwer)
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
