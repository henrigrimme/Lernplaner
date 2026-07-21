import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FlashcardReview } from '../../src/ui/FlashcardReview'
import { Rating } from '../../src/domain/spacedRepetition'
import type { Card, Topic } from '../../src/data/schema'

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

describe('FlashcardReview', () => {
  it('zeigt Themenname und Vorderseite, Rückseite erst nach "Antwort zeigen"', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    render(<FlashcardReview card={card({ id: 1, front: 'F', back: 'A' })} topics={topics} onRate={vi.fn()} />)

    expect(screen.getByText('Consumer Theory')).toBeInTheDocument()
    expect(screen.getByText('F')).toBeInTheDocument()
    expect(screen.queryByText('A')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }))
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('ruft onRate mit der gewählten Bewertung auf und blendet die Rückseite danach wieder aus', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    render(<FlashcardReview card={card({ id: 1 })} topics={[]} onRate={onRate} />)

    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }))
    await user.click(screen.getByRole('button', { name: 'Gut' }))

    expect(onRate).toHaveBeenCalledWith(Rating.Good)
    expect(screen.queryByText('Antwort')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Antwort zeigen' })).toBeInTheDocument()
  })
})
