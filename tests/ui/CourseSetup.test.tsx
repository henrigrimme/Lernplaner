import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CourseSetup } from '../../src/ui/CourseSetup'
import type { Course } from '../../src/data/schema'

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: `Fach ${overrides.id}`,
    semester: 'WS25',
    color: '#000',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Course
}

function noop() {
  return { onAdd: vi.fn(), onUpdate: vi.fn(), onArchive: vi.fn(), onRemove: vi.fn() }
}

describe('CourseSetup', () => {
  it('zeigt sichtbare Fächer, blendet archivierte standardmäßig aus', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' }), course({ id: 2, name: 'Alt', archived: 1 })]
    render(<CourseSetup courses={courses} {...noop()} />)

    expect(screen.getByText('Microeconomics')).toBeInTheDocument()
    expect(screen.queryByText('Alt')).not.toBeInTheDocument()
  })

  it('zeigt archivierte Fächer nach Klick auf die Checkbox', async () => {
    const user = userEvent.setup()
    const courses = [course({ id: 1, name: 'Alt', archived: 1 })]
    render(<CourseSetup courses={courses} {...noop()} />)

    await user.click(screen.getByRole('checkbox', { name: /archivierte anzeigen/i }))
    expect(screen.getByText('Alt')).toBeInTheDocument()
  })

  it('legt ein neues Fach mit den Formularwerten an', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CourseSetup courses={[]} {...noop()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Fach hinzufügen' }))
    await user.type(screen.getByLabelText('Name'), 'Microeconomics')
    await user.type(screen.getByLabelText('Semester'), 'WS25')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Microeconomics', semester: 'WS25' }))
  })

  it('verhindert das Anlegen ohne Namen', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CourseSetup courses={[]} {...noop()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Fach hinzufügen' }))
    await user.type(screen.getByLabelText('Semester'), 'WS25')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('bearbeitet ein bestehendes Fach', async () => {
    const user = userEvent.setup()
    const courses = [course({ id: 1, name: 'Microeconomics', priority: 3 })]
    const onUpdate = vi.fn()
    render(<CourseSetup courses={courses} {...noop()} onUpdate={onUpdate} />)

    const item = screen.getByText('Microeconomics').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Bearbeiten' }))
    await user.selectOptions(screen.getByLabelText('Priorität'), '5')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ priority: 5 }))
  })

  it('archiviert und stellt wieder her', async () => {
    const user = userEvent.setup()
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const onArchive = vi.fn()
    render(<CourseSetup courses={courses} {...noop()} onArchive={onArchive} />)

    const item = screen.getByText('Microeconomics').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Archivieren' }))
    expect(onArchive).toHaveBeenCalledWith(1, true)
  })

  it('löscht ein Fach', async () => {
    const user = userEvent.setup()
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const onRemove = vi.fn()
    render(<CourseSetup courses={courses} {...noop()} onRemove={onRemove} />)

    const item = screen.getByText('Microeconomics').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Löschen' }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})
