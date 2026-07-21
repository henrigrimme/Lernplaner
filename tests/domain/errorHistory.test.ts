import { describe, expect, it } from 'vitest'
import { rankTroubledCards } from '../../src/domain/errorHistory'
import { Rating } from '../../src/domain/spacedRepetition'
import type { Card, Review } from '../../src/data/schema'

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
  return {
    reviewed_at: 'x',
    stability: 1,
    difficulty: 1,
    due_at: 'y',
    ...overrides,
  }
}

describe('rankTroubledCards', () => {
  it('lässt Karten ohne jede Bewertung aus', () => {
    const cards = [card({ id: 1 })]
    expect(rankTroubledCards(cards, [])).toEqual([])
  })

  it('lässt Karten aus, die nie schwierig bewertet wurden', () => {
    const cards = [card({ id: 1 })]
    const reviews = [
      review({ id: 1, card_id: 1, rating: Rating.Good }),
      review({ id: 2, card_id: 1, rating: Rating.Easy }),
    ]
    expect(rankTroubledCards(cards, reviews)).toEqual([])
  })

  it('führt eine Karte mit mindestens einer "Nochmal"/"Schwer"-Bewertung auf, mit korrekter Fehlerquote', () => {
    const cards = [card({ id: 1 })]
    const reviews = [
      review({ id: 1, card_id: 1, rating: Rating.Again }),
      review({ id: 2, card_id: 1, rating: Rating.Good }),
      review({ id: 3, card_id: 1, rating: Rating.Good }),
      review({ id: 4, card_id: 1, rating: Rating.Good }),
    ]
    const [result] = rankTroubledCards(cards, reviews)
    expect(result).toMatchObject({ totalReviews: 4, troubleReviews: 1, troubleRate: 0.25 })
  })

  it('sortiert absteigend nach Fehlerquote', () => {
    const cards = [card({ id: 1 }), card({ id: 2 })]
    const reviews = [
      // Karte 1: 1 von 4 schwierig (25 %)
      review({ id: 1, card_id: 1, rating: Rating.Again }),
      review({ id: 2, card_id: 1, rating: Rating.Good }),
      review({ id: 3, card_id: 1, rating: Rating.Good }),
      review({ id: 4, card_id: 1, rating: Rating.Good }),
      // Karte 2: 3 von 4 schwierig (75 %)
      review({ id: 5, card_id: 2, rating: Rating.Again }),
      review({ id: 6, card_id: 2, rating: Rating.Hard }),
      review({ id: 7, card_id: 2, rating: Rating.Hard }),
      review({ id: 8, card_id: 2, rating: Rating.Good }),
    ]
    const result = rankTroubledCards(cards, reviews)
    expect(result.map((r) => r.card.id)).toEqual([2, 1])
  })

  it('bricht Gleichstand bei der Fehlerquote nach absoluter Anzahl schwieriger Bewertungen', () => {
    const cards = [card({ id: 1 }), card({ id: 2 })]
    const reviews = [
      // Karte 1: 1 von 2 schwierig (50 %)
      review({ id: 1, card_id: 1, rating: Rating.Again }),
      review({ id: 2, card_id: 1, rating: Rating.Good }),
      // Karte 2: 2 von 4 schwierig (50 %) — gleiche Quote, aber mehr absolute Fehler
      review({ id: 3, card_id: 2, rating: Rating.Again }),
      review({ id: 4, card_id: 2, rating: Rating.Hard }),
      review({ id: 5, card_id: 2, rating: Rating.Good }),
      review({ id: 6, card_id: 2, rating: Rating.Good }),
    ]
    const result = rankTroubledCards(cards, reviews)
    expect(result.map((r) => r.card.id)).toEqual([2, 1])
  })

  it('zählt "Hard" ebenso als schwierig wie "Again"', () => {
    const cards = [card({ id: 1 })]
    const reviews = [review({ id: 1, card_id: 1, rating: Rating.Hard })]
    const [result] = rankTroubledCards(cards, reviews)
    expect(result).toMatchObject({ troubleReviews: 1, troubleRate: 1 })
  })
})
