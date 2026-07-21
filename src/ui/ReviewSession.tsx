import { isDue, type Grade } from '../domain/spacedRepetition'
import { FlashcardReview } from './FlashcardReview'
import type { Card, Review, Topic } from '../data/schema'

/**
 * Wiederholungsansicht (ROADMAP.md Phase 4 „Spaced Repetition FSRS").
 * Zeigt die erste fällige Karte (`isDue`, `domain/spacedRepetition.ts`)
 * über `FlashcardReview` (Vorder-/Rückseite, vier Bewertungsstufen) —
 * dieselbe Interaktion, die auch `ErrorHistory` für gezielte Wiederholung
 * unabhängig von der Fälligkeit nutzt (`domain/errorHistory.ts`). Reine
 * Präsentation (ARCHITECTURE.md „ui/"): die eigentliche FSRS-Berechnung
 * übernimmt der Aufrufer über `onReview` (`domain/spacedRepetition.ts`
 * `scheduleReview`), `now` kommt von außen (kein `Date.now()` in der
 * Komponente).
 */

export interface ReviewSessionProps {
  cards: Card[]
  reviews: Review[]
  topics: Topic[]
  now: () => string
  onReview: (cardId: number, grade: Grade) => void
}

export function ReviewSession({ cards, reviews, topics, now, onReview }: ReviewSessionProps) {
  const today = new Date(now())
  const dueCards = cards.filter((c) => isDue(reviews.filter((r) => r.card_id === c.id), today))
  const current = dueCards[0] ?? null

  if (!current) {
    return (
      <section aria-label="Wiederholung">
        <h2>Wiederholung</h2>
        <p>Keine fällige Karte.</p>
      </section>
    )
  }

  return (
    <section aria-label="Wiederholung">
      <h2>Wiederholung</h2>
      <p>{dueCards.length} fällig</p>
      <FlashcardReview card={current} topics={topics} onRate={(grade) => onReview(current.id, grade)} />
    </section>
  )
}
