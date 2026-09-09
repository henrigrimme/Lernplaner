import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManualCardForm } from '../../src/ui/ManualCardForm'
import type { Course, Topic } from '../../src/data/schema'

function course(o: Partial<Course> & { id: number }): Course {
  return { name: `Fach ${o.id}`, semester: 'WS26', color: '#000', priority: 3, difficulty: 3, archived: 0, created_at: 'x', language: 'de', group_id: null, instructions: '', ...o }
}
function topic(o: Partial<Topic> & { id: number }): Topic {
  return { course_id: 1, parent_id: null, name: `Thema ${o.id}`, normalized_name: `t${o.id}`, weight: 3, difficulty: 3, sort_order: 0, status: 'offen', manual_override: 0, ...o }
}

describe('ManualCardForm', () => {
  it('legt eine Karte mit Fach/Thema/Vorder-/Rückseite an', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <ManualCardForm
        courses={[course({ id: 1, name: 'Micro' }), course({ id: 2, name: 'Macro' })]}
        topics={[topic({ id: 10, course_id: 1, name: 'Angebot' }), topic({ id: 20, course_id: 2, name: 'BIP' })]}
        onCreate={onCreate}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Fach'), '1')
    await user.selectOptions(screen.getByLabelText('Thema'), '10')
    await user.type(screen.getByLabelText('Vorderseite'), 'Was ist Angebot?')
    await user.type(screen.getByLabelText('Rückseite'), 'Die Menge zu einem Preis.')
    await user.click(screen.getByRole('button', { name: 'Karteikarte hinzufügen' }))

    expect(onCreate).toHaveBeenCalledWith({
      topic_id: 10,
      document_id: null,
      page: null,
      front: 'Was ist Angebot?',
      back: 'Die Menge zu einem Preis.',
      source_quote: null,
    })
    expect(screen.getByRole('status')).toHaveTextContent('Gespeichert')
  })

  it('zeigt nur die Themen des gewählten Fachs', async () => {
    const user = userEvent.setup()
    render(
      <ManualCardForm
        courses={[course({ id: 1, name: 'Micro' }), course({ id: 2, name: 'Macro' })]}
        topics={[topic({ id: 10, course_id: 1, name: 'Angebot' }), topic({ id: 20, course_id: 2, name: 'BIP' })]}
        onCreate={vi.fn()}
      />,
    )
    await user.selectOptions(screen.getByLabelText('Fach'), '2')
    const options = [...screen.getByLabelText('Thema').querySelectorAll('option')].map((o) => o.textContent)
    expect(options).toEqual(['BIP'])
  })

  it('deaktiviert den Knopf ohne Vorder-/Rückseite', () => {
    render(
      <ManualCardForm courses={[course({ id: 1 })]} topics={[topic({ id: 10, course_id: 1 })]} onCreate={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Karteikarte hinzufügen' })).toBeDisabled()
  })

  it('weist auf fehlende Fächer/Themen hin', () => {
    render(<ManualCardForm courses={[]} topics={[]} onCreate={vi.fn()} />)
    expect(screen.getByText(/Leg zuerst.*ein Fach/)).toBeInTheDocument()
  })

  it('meldet, wenn das Fach noch keine Themen hat', () => {
    render(<ManualCardForm courses={[course({ id: 1 })]} topics={[]} onCreate={vi.fn()} />)
    expect(screen.getByText(/hat noch keine Themen/)).toBeInTheDocument()
  })
})
