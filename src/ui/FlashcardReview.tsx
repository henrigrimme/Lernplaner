import { useEffect, useState } from 'react'
import { Rating, type Grade } from '../domain/spacedRepetition'
import type { Card, Topic } from '../data/schema'

/**
 * Vorder-/Rückseite mit den vier FSRS-Bewertungsstufen für eine einzelne
 * Karte — gemeinsam genutzt von `ReviewSession` (fällige Karten nach
 * FSRS-Termin) und `ErrorHistory` (gezielte Wiederholung unabhängig vom
 * Termin, siehe `domain/errorHistory.ts`). Beide zeigen dieselbe
 * Interaktion (aufdecken, dann bewerten) für unterschiedlich ausgewählte
 * Karten — dieser Baustein extrahiert sie, statt sie zweimal zu
 * schreiben. Reine Präsentation (ARCHITECTURE.md „ui/"), setzt sich
 * selbst nach jeder Bewertung zurück (`revealed`), damit der Aufrufer
 * beim Kartenwechsel nichts extra tun muss.
 *
 * Tastaturkürzel wie Anki (Nutzerwunsch: schnellere Bedienung für die
 * Karteikarten-Wiederholung, die laut PRODUCT.md täglich in kurzen
 * Sessions läuft) — Leertaste deckt auf, 1–4 bewerten in derselben
 * Reihenfolge wie `RATING_OPTIONS`. Kein Shortcut greift, während irgendwo
 * auf der Seite ein Textfeld fokussiert ist (z. B. eine offene
 * Anweisungen-Eingabe im selben Fenster).
 */

export interface FlashcardReviewProps {
  card: Card
  topics: Topic[]
  onRate: (grade: Grade) => void
}

const RATING_OPTIONS: { value: Grade; label: string }[] = [
  { value: Rating.Again, label: 'Nochmal' },
  { value: Rating.Hard, label: 'Schwer' },
  { value: Rating.Good, label: 'Gut' },
  { value: Rating.Easy, label: 'Leicht' },
]

export function FlashcardReview({ card, topics, onRate }: FlashcardReviewProps) {
  const [revealed, setRevealed] = useState(false)
  const topicById = new Map(topics.map((t) => [t.id, t]))

  const rate = (grade: Grade) => {
    onRate(grade)
    setRevealed(false)
  }

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setRevealed(true)
        }
        return
      }
      const index = ['1', '2', '3', '4'].indexOf(e.key)
      if (index !== -1) {
        e.preventDefault()
        rate(RATING_OPTIONS[index]!.value)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div>
      <p>{topicById.get(card.topic_id)?.name ?? `Thema ${card.topic_id}`}</p>
      <p>{card.front}</p>
      {revealed ? (
        <>
          <p>{card.back}</p>
          <div>
            {RATING_OPTIONS.map((opt, i) => (
              <button key={opt.value} type="button" onClick={() => rate(opt.value)} title={`Kürzel: ${i + 1}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} title="Kürzel: Leertaste">
          Antwort zeigen
        </button>
      )}
    </div>
  )
}
