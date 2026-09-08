import { useEffect, useState } from 'react'
import { buildCourseGroupTree, ungroupedCourses, type CourseGroupTreeNode } from '../data/courseGroups'
import type { Course, CourseGroup } from '../data/schema'

/**
 * Der Fach-/Ordner-Baum in der Seitenleiste (Migration 0005). Ordner sind
 * anklickbare Zwischenüberschriften mit vorangestelltem Ordner-Symbol
 * (wie Claude-Projekte); ein Klick klappt den Ordner **ein oder aus**
 * (Nutzerwunsch 2026-09-08). Fächer darunter sind wie bisher
 * `app-nav-item`-Buttons.
 *
 * Der Ein-/Ausklapp-Zustand lebt lokal hier und in `localStorage` (reine
 * Geräte-UI-Präferenz wie Sidebar-Breite/Theme in `App.tsx` — muss nicht
 * zwischen den zwei Nutzern geteilt werden und ist auch ohne `getDb()`
 * verfügbar). Kein Callback nach außen: `App.tsx` interessiert nur die
 * Fach-Auswahl (`onSelectCourse`), nicht welcher Ordner offen ist.
 */

const COLLAPSED_GROUPS_KEY = 'lernplaner.collapsedGroups'

function readCollapsed(): Set<number> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_GROUPS_KEY)
    const ids = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(ids) ? ids.filter((x): x is number => typeof x === 'number') : [])
  } catch {
    return new Set()
  }
}

export interface SidebarCourseTreeProps {
  courseGroups: CourseGroup[]
  courses: Course[]
  /** `null`, wenn gerade kein Fach hervorgehoben werden soll (anderer Bereich sichtbar). */
  activeCourseId: number | null
  onSelectCourse: (id: number) => void
}

export function SidebarCourseTree({ courseGroups, courses, activeCourseId, onSelectCourse }: SidebarCourseTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(readCollapsed)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...collapsed]))
    } catch {
      /* privater Modus o. Ä. — nicht kritisch, Zustand gilt dann nur für die Sitzung */
    }
  }, [collapsed])

  const toggle = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeCourses = courses.filter((c) => c.archived === 0)
  const tree = buildCourseGroupTree(courseGroups, activeCourses)
  const loose = ungroupedCourses(activeCourses)

  const courseButton = (course: Course, depth: number) => (
    <button
      key={`course-${course.id}`}
      type="button"
      className="app-nav-item"
      style={{ paddingLeft: 12 + depth * 12 }}
      aria-current={activeCourseId === course.id ? 'page' : undefined}
      onClick={() => onSelectCourse(course.id)}
      title={course.name}
    >
      <span className="app-nav-item-label">{course.name}</span>
    </button>
  )

  const renderNodes = (nodes: CourseGroupTreeNode[], depth: number): React.ReactNode[] =>
    nodes.flatMap((node) => {
      const isCollapsed = collapsed.has(node.id)
      const childCount = node.courses.length + node.children.length
      return [
        <button
          key={`group-${node.id}`}
          type="button"
          className="app-nav-group"
          style={{ paddingLeft: 12 + depth * 12 }}
          aria-expanded={!isCollapsed}
          onClick={() => toggle(node.id)}
          title={childCount === 0 ? `${node.name} (leer)` : node.name}
        >
          <span className={`app-nav-group-caret${isCollapsed ? ' is-collapsed' : ''}`} aria-hidden="true" />
          <span className="app-nav-group-icon" aria-hidden="true" />
          <span className="app-nav-group-name">{node.name}</span>
        </button>,
        ...(isCollapsed
          ? []
          : [
              ...node.courses.map((course) => courseButton(course, depth + 1)),
              ...renderNodes(node.children, depth + 1),
            ]),
      ]
    })

  return (
    <div className="app-nav">
      {renderNodes(tree, 0)}
      {loose.map((course) => courseButton(course, 0))}
    </div>
  )
}
