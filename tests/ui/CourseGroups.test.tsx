import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CourseGroups } from '../../src/ui/CourseGroups'
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

function noop() {
  return { onAdd: vi.fn(), onRename: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), onAssignCourse: vi.fn() }
}

describe('CourseGroups', () => {
  it('löscht einen Ordner nach Bestätigung', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CourseGroups courseGroups={[group({ id: 1, name: '3. Semester' })]} courses={[]} {...noop()} onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Ordner "3. Semester" löschen' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('löscht einen Ordner nicht, wenn die Bestätigung abgebrochen wird', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CourseGroups courseGroups={[group({ id: 1, name: '3. Semester' })]} courses={[]} {...noop()} onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Ordner "3. Semester" löschen' }))
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('benennt einen Ordner um, mit Esc zum Abbrechen', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    render(<CourseGroups courseGroups={[group({ id: 1, name: '3. Semester' })]} courses={[]} {...noop()} onRename={onRename} />)

    await user.click(screen.getByRole('button', { name: 'Umbenennen' }))
    const input = screen.getByLabelText('Neuer Name')
    await user.clear(input)
    await user.type(input, 'Q1')
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Neuer Name')).not.toBeInTheDocument()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('zeigt Fächer ohne Ordner mit einer Zuweisungs-Auswahl', () => {
    render(
      <CourseGroups
        courseGroups={[group({ id: 1, name: '3. Semester' })]}
        courses={[course({ id: 10, name: 'Microeconomics', group_id: null })]}
        {...noop()}
      />,
    )

    expect(screen.getByText('Microeconomics')).toBeInTheDocument()
    expect(screen.getByLabelText('In Ordner verschieben')).toBeInTheDocument()
  })
})
