import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuickSearch } from '../../src/ui/QuickSearch'
import type { Course, Topic } from '../../src/data/schema'

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

function topic(overrides: Partial<Topic> & { id: number; course_id: number }): Topic {
  return {
    parent_id: null,
    name: `Thema ${overrides.id}`,
    normalized_name: `thema${overrides.id}`,
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
    ...overrides,
  }
}

describe('QuickSearch', () => {
  it('zeigt keine Ergebnisliste, solange die Eingabe leer ist', () => {
    render(
      <QuickSearch
        courses={[course({ id: 1, name: 'Microeconomics' })]}
        topics={[]}
        cards={[]}
        documents={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('filtert Ergebnisse live beim Tippen', async () => {
    const user = userEvent.setup()
    render(
      <QuickSearch
        courses={[course({ id: 1, name: 'Microeconomics' }), course({ id: 2, name: 'Statistics' })]}
        topics={[]}
        cards={[]}
        documents={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Suche'), 'micro')
    expect(screen.getByText('Microeconomics')).toBeInTheDocument()
    expect(screen.queryByText('Statistics')).not.toBeInTheDocument()
  })

  it('wählt ein Ergebnis per Klick', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <QuickSearch
        courses={[course({ id: 1, name: 'Microeconomics' })]}
        topics={[]}
        cards={[]}
        documents={[]}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Suche'), 'micro')
    await user.click(screen.getByText('Microeconomics'))

    expect(onSelect).toHaveBeenCalledWith({ kind: 'course', id: 1, courseId: 1, title: 'Microeconomics', subtitle: 'Fach' })
  })

  it('navigiert mit Pfeiltasten und wählt mit Enter', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const topics = [topic({ id: 1, course_id: 1, name: 'Microtheorie Vertiefung' })]
    render(<QuickSearch courses={courses} topics={topics} cards={[]} documents={[]} onSelect={onSelect} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Suche'), 'micro')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith({
      kind: 'topic',
      id: 1,
      courseId: 1,
      title: 'Microtheorie Vertiefung',
      subtitle: 'Thema — Microeconomics',
    })
  })

  it('schließt mit Esc', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<QuickSearch courses={[]} topics={[]} cards={[]} documents={[]} onSelect={vi.fn()} onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('schließt beim Klick auf den Hintergrund, nicht beim Klick auf das Panel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<QuickSearch courses={[]} topics={[]} cards={[]} documents={[]} onSelect={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalled()
  })
})
