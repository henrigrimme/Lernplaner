import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorHistory } from '../../src/ui/ErrorHistory'
import { Rating } from '../../src/domain/spacedRepetition'
import type { Card, Review, Topic } from '../../src/data/schema'

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
    front: `Frage ${overrides.id}`,
    back: 'Antwort',
    source_quote: null,
    created_at: 'x',
    ...overrides,
  }
}

function review(overrides: Partial<Review> & { id: number; card_id: number; rating: number }): Review {
  return { reviewed_at: 'x', stability: 1, difficulty: 1, due_at: 'y', ...overrides }
}

describe('ErrorHistory', () => {
  it('zeigt einen Hinweis ohne Karten mit wiederholten Schwierigkeiten', () => {
    render(<ErrorHistory cards={[]} reviews={[]} topics={[]} onReview={vi.fn()} />)
    expect(screen.getByText(/keine karte mit wiederholten schwierigkeiten/i)).toBeInTheDocument()
  })

  it('listet eine schwierige Karte mit Thema und Fehlerquote', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const cards = [card({ id: 1, topic_id: 1 })]
    const reviews = [
      review({ id: 1, card_id: 1, rating: Rating.Again }),
      review({ id: 2, card_id: 1, rating: Rating.Good }),
    ]
    render(<ErrorHistory cards={cards} reviews={reviews} topics={topics} onReview={vi.fn()} />)

    expect(screen.getByText(/Frage 1/)).toBeInTheDocument()
    expect(screen.getByText(/Consumer Theory/)).toBeInTheDocument()
    expect(screen.getByText(/1\/2 als schwierig bewertet/)).toBeInTheDocument()
  })

  it('zeigt FlashcardReview für die gewählte Karte nach Klick auf "Gezielt üben"', async () => {
    const user = userEvent.setup()
    const cards = [card({ id: 1, front: 'Meine Frage' })]
    const reviews = [review({ id: 1, card_id: 1, rating: Rating.Again })]
    render(<ErrorHistory cards={cards} reviews={reviews} topics={[]} onReview={vi.fn()} />)

    expect(screen.queryByText('Meine Frage', { selector: 'p' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gezielt üben' }))
    expect(screen.getByText('Meine Frage', { selector: 'p' })).toBeInTheDocument()
  })

  it('ruft onReview mit Karten-id und Bewertung auf und blendet die Übung danach aus', async () => {
    const user = userEvent.setup()
    const onReview = vi.fn()
    const cards = [card({ id: 42 })]
    const reviews = [review({ id: 1, card_id: 42, rating: Rating.Hard })]
    render(<ErrorHistory cards={cards} reviews={reviews} topics={[]} onReview={onReview} />)

    await user.click(screen.getByRole('button', { name: 'Gezielt üben' }))
    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }))
    await user.click(screen.getByRole('button', { name: 'Gut' }))

    expect(onReview).toHaveBeenCalledWith(42, Rating.Good)
    expect(screen.queryByRole('button', { name: 'Antwort zeigen' })).not.toBeInTheDocument()
  })

  it('sortiert die Liste nach Fehlerquote absteigend', () => {
    const cards = [card({ id: 1 }), card({ id: 2 })]
    const reviews = [
      review({ id: 1, card_id: 1, rating: Rating.Again }),
      review({ id: 2, card_id: 1, rating: Rating.Good }),
      review({ id: 3, card_id: 1, rating: Rating.Good }),
      review({ id: 4, card_id: 1, rating: Rating.Good }), // Karte 1: 25 %
      review({ id: 5, card_id: 2, rating: Rating.Again }),
      review({ id: 6, card_id: 2, rating: Rating.Hard }), // Karte 2: 100 %
    ]
    render(<ErrorHistory cards={cards} reviews={reviews} topics={[]} onReview={vi.fn()} />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Frage 2')
    expect(items[1]).toHaveTextContent('Frage 1')
  })
})
