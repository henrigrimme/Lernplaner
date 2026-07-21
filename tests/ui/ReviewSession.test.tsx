import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewSession } from '../../src/ui/ReviewSession'
import { Rating } from '../../src/domain/spacedRepetition'
import type { Card, Review, Topic } from '../../src/data/schema'

const NOW = '2026-08-01T10:00:00.000Z'

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

function card(overrides: Partial<Card> & { id: number }): Card {
  return {
    topic_id: 1,
    document_id: null,
    page: null,
    front: 'Frage',
    back: 'Antwort',
    source_quote: null,
    created_at: 'x',
    ...overrides,
  }
}

describe('ReviewSession', () => {
  it('zeigt einen Hinweis ohne fällige Karten', () => {
    render(<ReviewSession cards={[]} reviews={[]} topics={[]} now={() => NOW} onReview={vi.fn()} />)
    expect(screen.getByText(/keine fällige karte/i)).toBeInTheDocument()
  })

  it('zeigt eine neue (nie bewertete) Karte als fällig, mit Themenname und Vorderseite', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const cards = [card({ id: 1, topic_id: 1, front: 'Was ist X?' })]
    render(<ReviewSession cards={cards} reviews={[]} topics={topics} now={() => NOW} onReview={vi.fn()} />)
    expect(screen.getByText('Consumer Theory')).toBeInTheDocument()
    expect(screen.getByText('Was ist X?')).toBeInTheDocument()
    expect(screen.queryByText('Antwort')).not.toBeInTheDocument()
  })

  it('blendet Rückseite und Bewertungsstufen erst nach "Antwort zeigen" ein', async () => {
    const user = userEvent.setup()
    const cards = [card({ id: 1, front: 'F', back: 'A' })]
    render(<ReviewSession cards={cards} reviews={[]} topics={[]} now={() => NOW} onReview={vi.fn()} />)

    expect(screen.queryByText('A')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }))
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nochmal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schwer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gut' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leicht' })).toBeInTheDocument()
  })

  it('ruft onReview mit Karten-id und gewählter Bewertung auf', async () => {
    const user = userEvent.setup()
    const onReview = vi.fn()
    const cards = [card({ id: 42 })]
    render(<ReviewSession cards={cards} reviews={[]} topics={[]} now={() => NOW} onReview={onReview} />)

    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }))
    await user.click(screen.getByRole('button', { name: 'Gut' }))
    expect(onReview).toHaveBeenCalledWith(42, Rating.Good)
  })

  it('zeigt eine noch nicht fällige Karte nicht an', () => {
    const cards = [card({ id: 1 })]
    const reviews: Review[] = [
      {
        id: 1,
        card_id: 1,
        reviewed_at: '2026-07-01T00:00:00.000Z',
        rating: Rating.Good,
        stability: 5,
        difficulty: 5,
        due_at: '2026-09-01T00:00:00.000Z',
      },
    ]
    render(<ReviewSession cards={cards} reviews={reviews} topics={[]} now={() => NOW} onReview={vi.fn()} />)
    expect(screen.getByText(/keine fällige karte/i)).toBeInTheDocument()
  })

  it('zeigt eine wieder fällige Karte (due_at in der Vergangenheit) erneut an', () => {
    const cards = [card({ id: 1 })]
    const reviews: Review[] = [
      {
        id: 1,
        card_id: 1,
        reviewed_at: '2026-07-01T00:00:00.000Z',
        rating: Rating.Good,
        stability: 5,
        difficulty: 5,
        due_at: '2026-07-20T00:00:00.000Z',
      },
    ]
    render(<ReviewSession cards={cards} reviews={reviews} topics={[]} now={() => NOW} onReview={vi.fn()} />)
    expect(screen.queryByText(/keine fällige karte/i)).not.toBeInTheDocument()
  })

  it('zeigt die Anzahl fälliger Karten', () => {
    const cards = [card({ id: 1 }), card({ id: 2 })]
    render(<ReviewSession cards={cards} reviews={[]} topics={[]} now={() => NOW} onReview={vi.fn()} />)
    expect(screen.getByText('2 fällig')).toBeInTheDocument()
  })
})
