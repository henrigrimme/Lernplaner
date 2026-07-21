import { Rating } from './spacedRepetition'
import type { Card, Review } from '../data/schema'

/**
 * Fehlerhistorie → gezielte Wiederholung (ROADMAP.md Phase 4). Findet
 * Karten, die wiederholt Schwierigkeiten bereitet haben (`Rating.Again`/
 * `Rating.Hard` in `reviews`), unabhängig von ihrer FSRS-Fälligkeit
 * (`domain/spacedRepetition.ts` `isDue`) — der Sinn gezielter Wiederholung
 * ist gerade, Problemkarten VOR ihrem regulären Termin nochmal zu üben.
 * Reine Funktionen (ARCHITECTURE.md „domain/ … kennt weder DB noch UI").
 */

export interface CardTrouble {
  card: Card
  totalReviews: number
  /** Anzahl der Bewertungen mit `Rating.Again` oder `Rating.Hard`. */
  troubleReviews: number
  /** `troubleReviews / totalReviews`, 0..1. */
  troubleRate: number
}

/**
 * Karten mit mindestens einer schwierigen Bewertung, absteigend nach
 * Fehlerquote sortiert (bei Gleichstand nach absoluter Anzahl schwieriger
 * Bewertungen) — Karten ohne jede Bewertung oder ohne je eine schwierige
 * Bewertung tauchen hier bewusst nicht auf, es gibt nichts gezielt zu
 * wiederholen.
 */
export function rankTroubledCards(cards: Card[], reviews: Review[]): CardTrouble[] {
  const reviewsByCard = new Map<number, Review[]>()
  for (const review of reviews) {
    const list = reviewsByCard.get(review.card_id) ?? []
    list.push(review)
    reviewsByCard.set(review.card_id, list)
  }

  const result: CardTrouble[] = []
  for (const card of cards) {
    const cardReviews = reviewsByCard.get(card.id) ?? []
    if (cardReviews.length === 0) continue
    const troubleReviews = cardReviews.filter((r) => r.rating === Rating.Again || r.rating === Rating.Hard).length
    if (troubleReviews === 0) continue
    result.push({
      card,
      totalReviews: cardReviews.length,
      troubleReviews,
      troubleRate: troubleReviews / cardReviews.length,
    })
  }

  return result.sort((a, b) => b.troubleRate - a.troubleRate || b.troubleReviews - a.troubleReviews)
}
