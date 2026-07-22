import { useState } from 'react'
import { buildCourseGroupTree, ungroupedCourses, type CourseGroupTreeNode } from '../data/courseGroups'
import type { NewCourseGroupInput } from '../data/courseGroupsRepo'
import type { Course, CourseGroup } from '../data/schema'

/**
 * Fach-Ordner verwalten (Migration 0005, Nutzerwunsch 2026-07-22: Fächer
 * gruppieren können, z. B. „3. Semester" > „Q1"/„Q2", weil manche
 * Klausuren mehrere Fächer gleichzeitig abdecken und die flache
 * Fach-Liste dafür unübersichtlich wird). Reine Präsentationskomponente
 * wie `CourseSetup`/`TopicTree` — jede Aktion geht über einen Callback
 * nach außen.
 *
 * Bewusst keine Drag-&-Drop-Zuweisung (wie schon `TopicTree.tsx`
 * begründet: tastaturbedienbar, keine neue Laufzeit-Abhängigkeit) —
 * Fächer werden stattdessen per Dropdown einem Ordner zugewiesen, direkt
 * unter der (flachen) Liste der noch nicht zugewiesenen Fächer.
 */

export interface CourseGroupsProps {
  courseGroups: CourseGroup[]
  courses: Course[]
  onAdd: (input: NewCourseGroupInput) => void
  onRename: (id: number, name: string) => void
  onMove: (id: number, newParentId: number | null) => void
  onRemove: (id: number) => void
  onAssignCourse: (courseId: number, groupId: number | null) => void
}

function flattenGroups(nodes: CourseGroupTreeNode[], depth = 0): { group: CourseGroupTreeNode; depth: number }[] {
  return nodes.flatMap((node) => [{ group: node, depth }, ...flattenGroups(node.children, depth + 1)])
}

export function CourseGroups({ courseGroups, courses, onAdd, onRename, onMove, onRemove, onAssignCourse }: CourseGroupsProps) {
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const tree = buildCourseGroupTree(courseGroups, courses.filter((c) => c.archived === 0))
  const flat = flattenGroups(tree)
  const activeCourses = courses.filter((c) => c.archived === 0)
  const unassigned = ungroupedCourses(activeCourses)

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim().length === 0) return
    const siblingCount = courseGroups.filter((g) => g.parent_id === newParentId).length
    onAdd({ parent_id: newParentId, name: newName.trim(), sort_order: siblingCount })
    setNewName('')
    setNewParentId(null)
  }

  const startRename = (group: CourseGroup) => {
    setRenamingId(group.id)
    setRenameDraft(group.name)
  }

  const submitRename = (id: number) => {
    if (renameDraft.trim().length === 0) return
    onRename(id, renameDraft)
    setRenamingId(null)
  }

  return (
    <section aria-label="Fach-Ordner">
      <h2>Ordner</h2>
      <p>
        Fächer lassen sich in frei benannten Ordnern gruppieren, auch verschachtelt (z. B. „3. Semester" &gt; „Q1") —
        praktisch, wenn eine Klausur mehrere Fächer gleichzeitig abdeckt.
      </p>

      {flat.length > 0 && (
        <ul>
          {flat.map(({ group, depth }) => (
            <li key={group.id} data-course-group-id={group.id} style={{ paddingLeft: depth * 16 }}>
              {renamingId === group.id ? (
                <>
                  <label>
                    Neuer Name
                    <input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
                  </label>
                  <button type="button" onClick={() => submitRename(group.id)}>
                    Speichern
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)}>
                    Abbrechen
                  </button>
                </>
              ) : (
                <>
                  <span>{group.name}</span>
                  <label>
                    Verschieben nach
                    <select
                      value={group.parent_id ?? ''}
                      onChange={(e) => onMove(group.id, e.target.value === '' ? null : Number(e.target.value))}
                    >
                      <option value="">— oberste Ebene —</option>
                      {courseGroups
                        .filter((g) => g.id !== group.id)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => startRename(group)}>
                    Umbenennen
                  </button>
                  <button type="button" onClick={() => onRemove(group.id)}>
                    Löschen
                  </button>
                  {group.courses.length > 0 && (
                    <ul>
                      {group.courses.map((course) => (
                        <li key={course.id}>
                          <span>{course.name}</span>
                          <button type="button" onClick={() => onAssignCourse(course.id, null)}>
                            Aus Ordner entfernen
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submitAdd} aria-label="Neuer Ordner">
        <label>
          Name
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z. B. 3. Semester" />
        </label>
        <label>
          Übergeordneter Ordner (optional)
          <select value={newParentId ?? ''} onChange={(e) => setNewParentId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">— oberste Ebene —</option>
            {courseGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Ordner hinzufügen</button>
      </form>

      {courseGroups.length > 0 && unassigned.length > 0 && (
        <>
          <h3>Fächer ohne Ordner</h3>
          <ul>
            {unassigned.map((course) => (
              <li key={course.id}>
                <span>{course.name}</span>
                <label>
                  In Ordner verschieben
                  <select value="" onChange={(e) => e.target.value !== '' && onAssignCourse(course.id, Number(e.target.value))}>
                    <option value="">— auswählen —</option>
                    {courseGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
