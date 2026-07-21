import { describe, expect, it } from 'vitest'
import { Rating, isDue, scheduleReview } from '../../src/domain/spacedRepetition'
import type { Review } from '../../src/data/schema'

const NOW = new Date('2026-08-01T10:00:00.000Z')

function review(overrides: Partial<Review> & { id: number }): Review {
  return {
    card_id: 1,
    reviewed_at: '2026-07-01T10:00:00.000Z',
    rating: Rating.Good,
    stability: 5,
    difficulty: 5,
    due_at: '2026-07-10T10:00:00.000Z',
    ...overrides,
  }
}

describe('isDue', () => {
  it('ist eine neue Karte ohne Bewertung sofort fällig', () => {
    expect(isDue([], NOW)).toBe(true)
  })

  it('ist fällig, wenn due_at der letzten Bewertung in der Vergangenheit liegt', () => {
    const reviews = [review({ id: 1, due_at: '2026-07-20T00:00:00.000Z' })]
    expect(isDue(reviews, NOW)).toBe(true)
  })

  it('ist nicht fällig, wenn due_at der letzten Bewertung in der Zukunft liegt', () => {
    const reviews = [review({ id: 1, due_at: '2026-09-01T00:00:00.000Z' })]
    expect(isDue(reviews, NOW)).toBe(false)
  })

  it('zieht die zeitlich letzte Bewertung heran, unabhängig von der Reihenfolge im Array', () => {
    const reviews = [
      review({ id: 2, reviewed_at: '2026-07-15T00:00:00.000Z', due_at: '2026-09-01T00:00:00.000Z' }),
      review({ id: 1, reviewed_at: '2026-07-01T00:00:00.000Z', due_at: '2026-07-05T00:00:00.000Z' }),
    ]
    expect(isDue(reviews, NOW)).toBe(false) // die spätere Bewertung (id 2) zählt, nicht id 1
  })
})

describe('scheduleReview', () => {
  it('legt für eine neue Karte eine Fälligkeit in der Zukunft an', () => {
    const result = scheduleReview([], NOW, Rating.Good)
    expect(new Date(result.due_at).getTime()).toBeGreaterThan(NOW.getTime())
    expect(result.rating).toBe(Rating.Good)
    expect(result.stability).toBeGreaterThan(0)
  })

  it('"Nochmal" führt zu einem kürzeren nächsten Intervall als "Leicht" bei sonst gleichem Ausgangszustand', () => {
    const again = scheduleReview([], NOW, Rating.Again)
    const easy = scheduleReview([], NOW, Rating.Easy)
    const againDays = new Date(again.due_at).getTime() - NOW.getTime()
    const easyDays = new Date(easy.due_at).getTime() - NOW.getTime()
    expect(againDays).toBeLessThan(easyDays)
  })

  it('baut auf der Historie auf: wiederholtes "Gut" verlängert das Intervall im Vergleich zur ersten Bewertung', () => {
    const first = scheduleReview([], NOW, Rating.Good)
    const firstReview: Review = {
      id: 1,
      card_id: 1,
      reviewed_at: NOW.toISOString(),
      rating: first.rating,
      stability: first.stability,
      difficulty: first.difficulty,
      due_at: first.due_at,
    }
    const later = new Date(firstReview.due_at)
    const second = scheduleReview([firstReview], later, Rating.Good)
    const firstIntervalDays = new Date(first.due_at).getTime() - NOW.getTime()
    const secondIntervalDays = new Date(second.due_at).getTime() - later.getTime()
    expect(secondIntervalDays).toBeGreaterThan(firstIntervalDays)
  })
})
