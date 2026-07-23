import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopicTree } from '../../src/ui/TopicTree'
import type { Topic } from '../../src/data/schema'

function topic(overrides: Partial<Topic> & { id: number }): Topic {
  return {
    course_id: 1,
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

describe('TopicTree', () => {
  it('zeigt einen Hinweis, wenn noch kein Thema vorhanden ist', () => {
    render(<TopicTree topics={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/noch kein themenbaum/i)).toBeInTheDocument()
  })

  it('rendert Kapitel als Wurzelknoten und Unterthemen darunter', () => {
    const topics = [
      topic({ id: 1, name: 'Consumer Theory', sort_order: 0 }),
      topic({ id: 2, parent_id: 1, name: 'Preferences', sort_order: 0 }),
    ]
    render(<TopicTree topics={topics} onChange={vi.fn()} />)

    const roots = screen.getAllByRole('treeitem', { name: 'Consumer Theory' })
    expect(roots).toHaveLength(1)
    expect(within(roots[0]!).getByText('Preferences')).toBeInTheDocument()
  })

  it('benennt ein Thema um und meldet manual_override=1 an onChange', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Cost Minimization' })]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Umbenennen' }))
    const input = screen.getByRole('textbox', { name: /name von cost minimization/i })
    await user.clear(input)
    await user.type(input, 'Kostenminimierung')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const updated = onChange.mock.calls[0]![0] as Topic[]
    expect(updated[0]).toMatchObject({ name: 'Kostenminimierung', manual_override: 1 })
  })

  it('bricht das Umbenennen ohne onChange-Aufruf ab', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Cost Minimization' })]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Umbenennen' }))
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('Cost Minimization')).toBeInTheDocument()
  })

  it('verschiebt ein Thema nach oben über den ↑-Button', async () => {
    const user = userEvent.setup()
    const topics = [
      topic({ id: 1, name: 'Erstes', sort_order: 0 }),
      topic({ id: 2, name: 'Zweites', sort_order: 1 }),
    ]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    const secondItem = screen.getByRole('treeitem', { name: 'Zweites' })
    await user.click(within(secondItem).getByRole('button', { name: '↑' }))

    const updated = onChange.mock.calls[0]![0] as Topic[]
    const zweites = updated.find((t) => t.id === 2)!
    expect(zweites.sort_order).toBe(0)
    expect(zweites.manual_override).toBe(1)
  })

  it('rückt ein Thema unter sein voriges Geschwisterthema ein (→)', async () => {
    const user = userEvent.setup()
    const topics = [
      topic({ id: 1, name: 'Consumer Theory', sort_order: 0 }),
      topic({ id: 2, name: 'Producer Theory', sort_order: 1 }),
    ]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    const secondItem = screen.getByRole('treeitem', { name: 'Producer Theory' })
    await user.click(within(secondItem).getByRole('button', { name: '→' }))

    const updated = onChange.mock.calls[0]![0] as Topic[]
    const producerTheory = updated.find((t) => t.id === 2)!
    expect(producerTheory.parent_id).toBe(1)
  })

  it('deaktiviert Ausrücken auf Wurzelebene', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    render(<TopicTree topics={topics} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '←' })).toBeDisabled()
  })

  it('rückt ein Unterthema per ← zur Wurzelebene aus', async () => {
    const user = userEvent.setup()
    const topics = [
      topic({ id: 1, name: 'Consumer Theory', sort_order: 0 }),
      topic({ id: 2, parent_id: 1, name: 'Preferences', sort_order: 0 }),
    ]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    const child = screen.getByRole('treeitem', { name: 'Preferences' })
    await user.click(within(child).getByRole('button', { name: '←' }))

    const updated = onChange.mock.calls[0]![0] as Topic[]
    expect(updated.find((t) => t.id === 2)!.parent_id).toBeNull()
  })

  it('löscht erst nach Bestätigung', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Cost Minimization' })]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Thema "Cost Minimization" löschen' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/wirklich löschen/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '"Cost Minimization" wirklich löschen — bestätigen' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('zeigt das "bearbeitet"-Abzeichen nur bei manual_override', () => {
    const topics = [
      topic({ id: 1, name: 'Unverändert', manual_override: 0 }),
      topic({ id: 2, name: 'Angepasst', manual_override: 1 }),
    ]
    render(<TopicTree topics={topics} onChange={vi.fn()} />)

    const unchanged = screen.getByRole('treeitem', { name: 'Unverändert' })
    const changed = screen.getByRole('treeitem', { name: 'Angepasst' })
    expect(within(unchanged).queryByText('bearbeitet')).not.toBeInTheDocument()
    expect(within(changed).getByText('bearbeitet')).toBeInTheDocument()
  })

  it('setzt das Gewicht eines Blattthemas über den Regler', () => {
    const topics = [topic({ id: 1, name: 'Preferences', weight: 3 })]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Gewicht von Preferences'), { target: { value: '5' } })

    const updated = onChange.mock.calls[0]![0] as Topic[]
    expect(updated[0]).toMatchObject({ weight: 5, manual_override: 1 })
  })

  it('vererbt den Schwierigkeits-Regler eines Kapitels auf alle Unterthemen', () => {
    const topics = [
      topic({ id: 1, parent_id: null, name: 'Consumer Theory', difficulty: 3 }),
      topic({ id: 2, parent_id: 1, name: 'Preferences', difficulty: 3 }),
    ]
    const onChange = vi.fn()
    render(<TopicTree topics={topics} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Schwierigkeit von Consumer Theory'), { target: { value: '5' } })

    const updated = onChange.mock.calls[0]![0] as Topic[]
    expect(updated.every((t) => t.difficulty === 5)).toBe(true)
  })

  it('kennzeichnet Regler auf einem Kapitel als "ganzer Bereich"', () => {
    const topics = [
      topic({ id: 1, parent_id: null, name: 'Consumer Theory' }),
      topic({ id: 2, parent_id: 1, name: 'Preferences' }),
    ]
    render(<TopicTree topics={topics} onChange={vi.fn()} />)

    const chapter = screen.getByRole('treeitem', { name: 'Consumer Theory' })
    const leaf = screen.getByRole('treeitem', { name: 'Preferences' })
    expect(within(chapter).getByText(/Gewicht \(ganzer Bereich\)/)).toBeInTheDocument()
    expect(within(leaf).queryByText(/ganzer Bereich/)).not.toBeInTheDocument()
  })
})
