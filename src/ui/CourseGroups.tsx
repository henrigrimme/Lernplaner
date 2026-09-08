import { useState } from 'react'
import { buildCourseGroupTree, type CourseGroupTreeNode } from '../data/courseGroups'
import type { NewCourseGroupInput } from '../data/courseGroupsRepo'
import type { Course, CourseGroup } from '../data/schema'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Fach-Ordner verwalten (Migration 0005, Nutzerwunsch 2026-07-22: Fächer
 * gruppieren können, z. B. „3. Semester" > „Q1"/„Q2", weil manche
 * Klausuren mehrere Fächer gleichzeitig abdecken und die flache
 * Fach-Liste dafür unübersichtlich wird). Reine Präsentationskomponente
 * wie `CourseSetup`/`TopicTree` — jede Aktion geht über einen Callback
 * nach außen.
 *
 * **Nur noch die Ordner selbst** (Nutzerwunsch 2026-09-08, „einfacher und
 * simpler"): Anlegen, Umbenennen, Verschachteln, Löschen. Welches Fach in
 * welchen Ordner kommt, wird jetzt direkt in der Fach-Zeile in
 * `ui/CourseSetup.tsx` eingestellt (`<select>` je Fach) — die frühere
 * zweite Liste „Fächer ohne Ordner" mit eigenem Zuweisungs-Dropdown fiel
 * weg, weil man das Fach dort erneut suchen musste. Der Elternordner-
 * Auswahl erscheint nur, wenn es überhaupt mehr als einen Ordner gibt.
 */

export interface CourseGroupsProps {
  courseGroups: CourseGroup[]
  courses: Course[]
  onAdd: (input: NewCourseGroupInput) => void
  onRename: (id: number, name: string) => void
  onMove: (id: number, newParentId: number | null) => void
  onRemove: (id: number) => void
}

function flattenGroups(nodes: CourseGroupTreeNode[], depth = 0): { group: CourseGroupTreeNode; depth: number }[] {
  return nodes.flatMap((node) => [{ group: node, depth }, ...flattenGroups(node.children, depth + 1)])
}

export function CourseGroups({ courseGroups, courses, onAdd, onRename, onMove, onRemove }: CourseGroupsProps) {
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CourseGroup | null>(null)

  const tree = buildCourseGroupTree(courseGroups, courses.filter((c) => c.archived === 0))
  const flat = flattenGroups(tree)

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
        Ordner gruppieren Fächer in der Seitenleiste (auch verschachtelt, z. B. „3. Semester" &gt; „Q1") — praktisch,
        wenn eine Klausur mehrere Fächer abdeckt. Welches Fach in welchen Ordner kommt, stellst du oben in der
        Fächer-Liste je Fach ein.
      </p>

      {flat.length > 0 && (
        <ul>
          {flat.map(({ group, depth }) => (
            <li key={group.id} data-course-group-id={group.id} style={{ paddingLeft: depth * 16 }}>
              {renamingId === group.id ? (
                <>
                  <label>
                    Neuer Name
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      autoFocus
                    />
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
                  <span className="course-group-name">{group.name}</span>
                  {group.courses.length > 0 && (
                    <span className="course-group-contents">{group.courses.map((c) => c.name).join(', ')}</span>
                  )}
                  {courseGroups.length > 1 && (
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
                  )}
                  <button type="button" onClick={() => startRename(group)}>
                    Umbenennen
                  </button>
                  <button type="button" aria-label={`Ordner "${group.name}" löschen`} onClick={() => setPendingDelete(group)}>
                    Löschen
                  </button>
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
        {courseGroups.length > 0 && (
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
        )}
        <button type="submit">Ordner hinzufügen</button>
      </form>

      {pendingDelete && (
        <ConfirmDialog
          title="Ordner löschen"
          message={`Ordner "${pendingDelete.name}" wirklich löschen? Enthaltene Fächer werden nicht gelöscht, landen aber wieder in der obersten Ebene.`}
          onConfirm={() => {
            onRemove(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
