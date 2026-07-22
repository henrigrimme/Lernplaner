import type { Course, CourseGroup } from './schema'

/**
 * Reine Baum-Funktionen für `course_groups` (Migration 0005, Nutzerwunsch
 * 2026-07-22: Fächer in frei benannten Ordnern gruppieren können, z. B.
 * "3. Semester" > "Q1"/"Q2") — kein Datenbankzugriff, keine UI. Analog zu
 * `data/topicTree.ts`, aber deutlich einfacher: keine `weight`/`difficulty`,
 * die vererbt werden müssten, und Fächer selbst sind reine Blätter (ein
 * Fach kann kein anderes Fach enthalten, nur `Course.group_id` auf einen
 * Ordner zeigen).
 */

export interface CourseGroupTreeNode extends CourseGroup {
  children: CourseGroupTreeNode[]
  courses: Course[]
}

/** Baut den verschachtelten Ordnerbaum, jeder Knoten trägt seine direkt zugewiesenen Fächer. */
export function buildCourseGroupTree(groups: CourseGroup[], courses: Course[]): CourseGroupTreeNode[] {
  const nodesById = new Map<number, CourseGroupTreeNode>(groups.map((g) => [g.id, { ...g, children: [], courses: [] }]))
  const roots: CourseGroupTreeNode[] = []

  for (const group of groups) {
    const node = nodesById.get(group.id)!
    if (group.parent_id === null) {
      roots.push(node)
      continue
    }
    const parent = nodesById.get(group.parent_id)
    if (parent) parent.children.push(node)
    else roots.push(node) // Elternverweis ins Leere -> als eigene Wurzel zeigen statt zu verschwinden
  }

  for (const course of courses) {
    if (course.group_id === null) continue
    nodesById.get(course.group_id)?.courses.push(course)
  }

  const byName = (a: CourseGroup, b: CourseGroup) => a.sort_order - b.sort_order
  const sortRecursive = (nodes: CourseGroupTreeNode[]) => {
    nodes.sort(byName)
    for (const node of nodes) sortRecursive(node.children)
  }
  sortRecursive(roots)

  return roots
}

/** Fächer ohne Ordner (`group_id === null`) — erscheinen wie bisher direkt in der obersten Ebene. */
export function ungroupedCourses(courses: Course[]): Course[] {
  return courses.filter((c) => c.group_id === null)
}

function findGroup(groups: CourseGroup[], id: number): CourseGroup {
  const group = groups.find((g) => g.id === id)
  if (!group) throw new Error(`Ordner ${id} nicht gefunden`)
  return group
}

/** Alle Ordner-IDs, die von `id` erreicht werden (inklusive `id` selbst) — Zyklenschutz/Kaskaden-Löschung. */
function descendantIds(groups: CourseGroup[], id: number): Set<number> {
  const result = new Set<number>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const group of groups) {
      if (group.parent_id !== null && result.has(group.parent_id) && !result.has(group.id)) {
        result.add(group.id)
        grew = true
      }
    }
  }
  return result
}

export function renameCourseGroup(groups: CourseGroup[], id: number, name: string): CourseGroup[] {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Ordnername darf nicht leer sein')
  findGroup(groups, id)
  return groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g))
}

/** Verschiebt einen Ordner zu einem neuen Elternordner (oder zur Wurzel bei `null`). Verweigert Verschieben in den eigenen Teilbaum. */
export function moveCourseGroup(groups: CourseGroup[], id: number, newParentId: number | null): CourseGroup[] {
  findGroup(groups, id)
  if (newParentId !== null) {
    findGroup(groups, newParentId)
    if (descendantIds(groups, id).has(newParentId)) {
      throw new Error('Ein Ordner kann nicht in seinen eigenen Teilbaum verschoben werden')
    }
  }
  const siblingCount = groups.filter((g) => g.id !== id && g.parent_id === newParentId).length
  return groups.map((g) => (g.id === id ? { ...g, parent_id: newParentId, sort_order: siblingCount } : g))
}

/**
 * Löscht einen Ordner samt aller Unterordner (spiegelt `ON DELETE CASCADE`
 * auf `course_groups.parent_id`). Fächer selbst werden nie gelöscht — sie
 * fallen auf "kein Ordner" zurück (spiegelt `ON DELETE SET NULL` auf
 * `courses.group_id`).
 */
export function deleteCourseGroup(groups: CourseGroup[], courses: Course[], id: number): { groups: CourseGroup[]; courses: Course[] } {
  findGroup(groups, id)
  const toRemove = descendantIds(groups, id)
  return {
    groups: groups.filter((g) => !toRemove.has(g.id)),
    courses: courses.map((c) => (c.group_id !== null && toRemove.has(c.group_id) ? { ...c, group_id: null } : c)),
  }
}
