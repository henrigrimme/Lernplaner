import { useState } from 'react'
import { rankTroubledCards } from '../domain/errorHistory'
import { FlashcardReview } from './FlashcardReview'
import type { Grade } from '../domain/spacedRepetition'
import type { Card, Review, Topic } from '../data/schema'

/**
 * Fehlerhistorie → gezielte Wiederholung (ROADMAP.md Phase 4). Listet
 * Karten mit häufigen „Nochmal"/„Schwer"-Bewertungen (`rankTroubledCards`,
 * `domain/errorHistory.ts`), unabhängig von ihrer FSRS-Fälligkeit — anders
 * als `ReviewSession` (fällige Karten nach Termin) ist hier der Sinn
 * gerade, Problemkarten VOR ihrem regulären Termin gezielt zu üben. Nutzt
 * dieselbe Aufdecken-und-bewerten-Interaktion wie `ReviewSession`
 * (`FlashcardReview`), auf einer selbst gewählten Karte aus der Liste.
 * Reine Präsentation (ARCHITECTURE.md „ui/") — `onReview` persistiert wie
 * bei `ReviewSession` über `App.tsx`.
 */

export interface ErrorHistoryProps {
  cards: Card[]
  reviews: Review[]
  topics: Topic[]
  onReview: (cardId: number, grade: Grade) => void
}

export function ErrorHistory({ cards, reviews, topics, onReview }: ErrorHistoryProps) {
  const [practicingId, setPracticingId] = useState<number | null>(null)
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const troubled = rankTroubledCards(cards, reviews)
  const practicing = troubled.find((t) => t.card.id === practicingId) ?? null

  return (
    <section aria-label="Fehlerhistorie">
      <h2>Fehlerhistorie — gezielte Wiederholung</h2>

      {troubled.length === 0 ? (
        <p className="empty-state-inline">Keine Karte mit wiederholten Schwierigkeiten.</p>
      ) : (
        <ul>
          {troubled.map(({ card, totalReviews, troubleReviews }) => (
            <li key={card.id}>
              {card.front} — {topicById.get(card.topic_id)?.name ?? `Thema ${card.topic_id}`} —{' '}
              {troubleReviews}/{totalReviews} als schwierig bewertet
              <button type="button" onClick={() => setPracticingId(card.id)}>
                Gezielt üben
              </button>
            </li>
          ))}
        </ul>
      )}

      {practicing && (
        <FlashcardReview
          card={practicing.card}
          topics={topics}
          onRate={(grade) => {
            onReview(practicing.card.id, grade)
            setPracticingId(null)
          }}
        />
      )}
    </section>
  )
}
