import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarCourseTree } from '../../src/ui/SidebarCourseTree'
import type { Course, CourseGroup } from '../../src/data/schema'

function group(overrides: Partial<CourseGroup> & { id: number }): CourseGroup {
  return { parent_id: null, name: `Ordner ${overrides.id}`, sort_order: 0, ...overrides }
}

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: `Fach ${overrides.id}`,
    semester: 'WS26',
    color: '#000',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
    group_id: null,
    instructions: '',
    ...overrides,
  }
}

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('SidebarCourseTree', () => {
  it('zeigt Ordner mit ihren Fächern und lose Fächer', () => {
    render(
      <SidebarCourseTree
        courseGroups={[group({ id: 1, name: '3. Semester' })]}
        courses={[course({ id: 10, name: 'Micro', group_id: 1 }), course({ id: 11, name: 'Lose', group_id: null })]}
        activeCourseId={null}
        onSelectCourse={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /3\. Semester/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Micro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lose' })).toBeInTheDocument()
  })

  it('klappt einen Ordner beim Klick ein und wieder aus', async () => {
    const user = userEvent.setup()
    render(
      <SidebarCourseTree
        courseGroups={[group({ id: 1, name: '3. Semester' })]}
        courses={[course({ id: 10, name: 'Micro', group_id: 1 })]}
        activeCourseId={null}
        onSelectCourse={vi.fn()}
      />,
    )
    const folder = screen.getByRole('button', { name: /3\. Semester/ })

    await user.click(folder)
    expect(folder).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Micro' })).not.toBeInTheDocument()

    await user.click(folder)
    expect(folder).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Micro' })).toBeInTheDocument()
  })

  it('merkt sich den eingeklappten Zustand über einen Neuaufbau (localStorage)', async () => {
    const user = userEvent.setup()
    const props = {
      courseGroups: [group({ id: 7, name: 'Q1' })],
      courses: [course({ id: 10, name: 'Micro', group_id: 7 })],
      activeCourseId: null,
      onSelectCourse: vi.fn(),
    }
    const { unmount } = render(<SidebarCourseTree {...props} />)
    await user.click(screen.getByRole('button', { name: /Q1/ }))
    unmount()

    render(<SidebarCourseTree {...props} />)
    expect(screen.getByRole('button', { name: /Q1/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Micro' })).not.toBeInTheDocument()
  })

  it('ruft onSelectCourse mit der Fach-id auf', async () => {
    const user = userEvent.setup()
    const onSelectCourse = vi.fn()
    render(
      <SidebarCourseTree
        courseGroups={[]}
        courses={[course({ id: 42, name: 'Klick mich' })]}
        activeCourseId={null}
        onSelectCourse={onSelectCourse}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Klick mich' }))
    expect(onSelectCourse).toHaveBeenCalledWith(42)
  })

  it('markiert das aktive Fach', () => {
    render(
      <SidebarCourseTree
        courseGroups={[]}
        courses={[course({ id: 1, name: 'A' }), course({ id: 2, name: 'B' })]}
        activeCourseId={2}
        onSelectCourse={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveAttribute('aria-current')
  })

  it('blendet archivierte Fächer aus', () => {
    render(
      <SidebarCourseTree
        courseGroups={[]}
        courses={[course({ id: 1, name: 'Aktiv' }), course({ id: 2, name: 'Alt', archived: 1 })]}
        activeCourseId={null}
        onSelectCourse={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Aktiv' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alt' })).not.toBeInTheDocument()
  })

  it('klappt verschachtelte Unterordner mit ein', async () => {
    const user = userEvent.setup()
    render(
      <SidebarCourseTree
        courseGroups={[group({ id: 1, name: 'Semester' }), group({ id: 2, name: 'Quartal', parent_id: 1 })]}
        courses={[course({ id: 10, name: 'Tief', group_id: 2 })]}
        activeCourseId={null}
        onSelectCourse={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Quartal/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Semester/ }))
    expect(screen.queryByRole('button', { name: /Quartal/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tief' })).not.toBeInTheDocument()
  })
})
