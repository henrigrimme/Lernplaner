import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CardCreator } from '../../src/ui/CardCreator'
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

describe('CardCreator', () => {
  it('zeigt das markierte Zitat schreibgeschützt an', () => {
    render(
      <CardCreator
        sourceQuote="Rationale Präferenzen sind vollständig und transitiv"
        topics={[topic({ id: 1 })]}
        defaultTopicId={1}
        documentId={1}
        page={2}
        onCreate={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText(/Rationale Präferenzen sind vollständig und transitiv/)).toBeInTheDocument()
  })

  it('ruft onCreate mit Vorder-/Rückseite, Thema und Quellenangabe auf', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <CardCreator
        sourceQuote="Das Zitat"
        topics={[topic({ id: 1, name: 'Consumer Theory' }), topic({ id: 2, name: 'Producer Theory' })]}
        defaultTopicId={1}
        documentId={7}
        page={3}
        onCreate={onCreate}
        onDiscard={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Vorderseite'), 'Was besagt das Zitat?')
    await user.type(screen.getByLabelText('Rückseite'), 'Die Antwort.')
    await user.selectOptions(screen.getByLabelText('Thema'), '2')
    await user.click(screen.getByRole('button', { name: 'Karteikarte erstellen' }))

    expect(onCreate).toHaveBeenCalledWith({
      topic_id: 2,
      document_id: 7,
      page: 3,
      front: 'Was besagt das Zitat?',
      back: 'Die Antwort.',
      source_quote: 'Das Zitat',
    })
  })

  it('legt keine Karte ohne Vorder- oder Rückseite an', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <CardCreator
        sourceQuote="Zitat"
        topics={[topic({ id: 1 })]}
        defaultTopicId={1}
        documentId={null}
        page={null}
        onCreate={onCreate}
        onDiscard={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Karteikarte erstellen' }))
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('ruft onDiscard beim Klick auf "Verwerfen" auf', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(
      <CardCreator
        sourceQuote="Zitat"
        topics={[topic({ id: 1 })]}
        defaultTopicId={1}
        documentId={null}
        page={null}
        onCreate={vi.fn()}
        onDiscard={onDiscard}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Verwerfen' }))
    expect(onDiscard).toHaveBeenCalled()
  })

  it('setzt den Entwurf zurück, wenn eine neue Markierung ankommt', () => {
    const { rerender } = render(
      <CardCreator
        sourceQuote="Erstes Zitat"
        topics={[topic({ id: 1 }), topic({ id: 2 })]}
        defaultTopicId={1}
        documentId={null}
        page={null}
        onCreate={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    rerender(
      <CardCreator
        sourceQuote="Zweites Zitat"
        topics={[topic({ id: 1 }), topic({ id: 2 })]}
        defaultTopicId={2}
        documentId={null}
        page={null}
        onCreate={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByText(/Zweites Zitat/)).toBeInTheDocument()
    expect((screen.getByLabelText('Vorderseite') as HTMLTextAreaElement).value).toBe('')
  })
})
