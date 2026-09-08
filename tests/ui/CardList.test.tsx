import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CardList } from '../../src/ui/CardList'
import type { Card, Course, Topic } from '../../src/data/schema'

function course(o: Partial<Course> & { id: number }): Course {
  return { name: `Fach ${o.id}`, semester: 'WS26', color: '#000', priority: 3, difficulty: 3, archived: 0, created_at: 'x', language: 'de', group_id: null, instructions: '', ...o }
}
function topic(o: Partial<Topic> & { id: number }): Topic {
  return { course_id: 1, parent_id: null, name: `Thema ${o.id}`, normalized_name: `t${o.id}`, weight: 3, difficulty: 3, sort_order: 0, status: 'offen', manual_override: 0, ...o }
}
function card(o: Partial<Card> & { id: number }): Card {
  return { topic_id: 10, document_id: null, page: null, front: `Frage ${o.id}`, back: `Antwort ${o.id}`, source_quote: null, created_at: 'x', ...o }
}

const COURSES = [course({ id: 1, name: 'Microeconomics' }), course({ id: 2, name: 'Money & Banking' })]
const TOPICS = [
  topic({ id: 10, course_id: 1, name: 'Consumer Theory' }),
  topic({ id: 11, course_id: 1, name: 'Producer Theory' }),
  topic({ id: 20, course_id: 2, name: 'Zinsen' }),
]

describe('CardList', () => {
  it('gruppiert nach Fach und Thema mit Kartenzahlen', () => {
    render(
      <CardList
        courses={COURSES}
        topics={TOPICS}
        cards={[
          card({ id: 1, topic_id: 10 }),
          card({ id: 2, topic_id: 10 }),
          card({ id: 3, topic_id: 11 }),
          card({ id: 4, topic_id: 20 }),
        ]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    const micro = screen.getByRole('region', { name: 'Karten: Microeconomics' })
    expect(within(micro).getByRole('heading', { name: /Microeconomics 3/ })).toBeInTheDocument()
    expect(within(micro).getByRole('heading', { name: /Consumer Theory 2/ })).toBeInTheDocument()
    expect(within(micro).getByRole('heading', { name: /Producer Theory 1/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Money & Banking 1/ })).toBeInTheDocument()
  })

  it('bearbeitet eine Karte inline', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <CardList courses={COURSES} topics={TOPICS} cards={[card({ id: 1, topic_id: 10, front: 'alt vorne' })]} onUpdate={onUpdate} onDelete={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    const front = screen.getByLabelText('Vorderseite')
    await user.clear(front)
    await user.type(front, 'neu vorne')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(onUpdate).toHaveBeenCalledWith(1, { front: 'neu vorne', back: 'Antwort 1' })
  })

  it('löscht eine Karte erst nach Rückfrage in der Zeile', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(
      <CardList courses={COURSES} topics={TOPICS} cards={[card({ id: 7, topic_id: 10 })]} onUpdate={vi.fn()} onDelete={onDelete} />,
    )
    await user.click(screen.getByRole('button', { name: /löschen/i }))
    expect(onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Ja' }))
    expect(onDelete).toHaveBeenCalledWith(7)
  })

  it('zeigt einen Hinweis ohne Karten', () => {
    render(<CardList courses={COURSES} topics={TOPICS} cards={[]} onUpdate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Noch keine Karteikarten.')).toBeInTheDocument()
  })

  it('reduziert HTML-Karten (Anki-Import) im Vorschautext auf Klartext', () => {
    render(
      <CardList
        courses={COURSES}
        topics={TOPICS}
        cards={[card({ id: 1, topic_id: 10, front: '<b>Mitochondrien</b> sind das <img src="data:image/png;base64,AAAA"> Kraftwerk' })]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText(/Mitochondrien sind das \[Bild\] Kraftwerk/)).toBeInTheDocument()
  })
})
