import { useState } from 'react'
import { Rating, isDue, type Grade } from '../domain/spacedRepetition'
import type { Card, Review, Topic } from '../data/schema'

/**
 * Wiederholungsansicht (ROADMAP.md Phase 4 „Spaced Repetition FSRS").
 * Zeigt die erste fällige Karte (`isDue`, `domain/spacedRepetition.ts`)
 * mit Vorder-/Rückseite und den vier FSRS-Bewertungsstufen — „nochmal" /
 * „schwer" / „gut" / „leicht" (siehe CONTEXT.md „Recherche: Spaced
 * Repetition"). Reine Präsentation (ARCHITECTURE.md „ui/"): die
 * eigentliche FSRS-Berechnung übernimmt der Aufrufer über `onReview`
 * (`domain/spacedRepetition.ts` `scheduleReview`), `now` kommt von außen
 * (kein `Date.now()` in der Komponente).
 */

export interface ReviewSessionProps {
  cards: Card[]
  reviews: Review[]
  topics: Topic[]
  now: () => string
  onReview: (cardId: number, grade: Grade) => void
}

const RATING_OPTIONS: { value: Grade; label: string }[] = [
  { value: Rating.Again, label: 'Nochmal' },
  { value: Rating.Hard, label: 'Schwer' },
  { value: Rating.Good, label: 'Gut' },
  { value: Rating.Easy, label: 'Leicht' },
]

export function ReviewSession({ cards, reviews, topics, now, onReview }: ReviewSessionProps) {
  const [revealed, setRevealed] = useState(false)
  const topicById = new Map(topics.map((t) => [t.id, t]))

  const today = new Date(now())
  const dueCards = cards.filter((c) => isDue(reviews.filter((r) => r.card_id === c.id), today))
  const current = dueCards[0] ?? null

  const rate = (grade: Grade) => {
    if (!current) return
    onReview(current.id, grade)
    setRevealed(false)
  }

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
      <p>{topicById.get(current.topic_id)?.name ?? `Thema ${current.topic_id}`}</p>
      <p>{current.front}</p>
      {revealed ? (
        <>
          <p>{current.back}</p>
          <div>
            {RATING_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => rate(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setRevealed(true)}>
          Antwort zeigen
        </button>
      )}
    </section>
  )
}
