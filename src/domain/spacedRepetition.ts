import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import type { Review } from '../data/schema'

/**
 * Spaced Repetition (ROADMAP.md Phase 4 „Spaced Repetition FSRS"),
 * arbeitet auf einzelnen Karteikarten (`cards`/`reviews`, siehe
 * DATA_MODEL.md) — nicht zu verwechseln mit dem groben
 * Themen-Auffrischer in `scheduling.ts` (siehe CONTEXT.md Abschnitt 8
 * „Recherche: Spaced Repetition"). Reine Funktionen (ARCHITECTURE.md
 * „domain/ … kennt weder DB noch UI") — `ts-fsrs` selbst ist reine
 * Berechnung, kein I/O, passt also hierher.
 *
 * **Warum `reviews` aus der DB in ein `ts-fsrs`-`Card` zurückverwandelt
 * werden muss:** `reviews` (0001_init.sql) speichert bewusst nur
 * `stability`/`difficulty`/`due_at`/`rating`/`reviewed_at` je Wiederholung
 * — nicht den vollen `ts-fsrs`-`Card`-Zustand (`state`, `reps`, `lapses`,
 * `learning_steps`). `toFsrsCard` baut daraus ein gültiges `Card` für die
 * nächste Berechnung: `elapsed_days`/`scheduled_days` können dabei auf 0
 * bleiben — `ts-fsrs` berechnet das Intervall intern ohnehin frisch aus
 * `last_review`/`now`, liest diese Felder für die Terminberechnung nicht
 * (siehe `ts-fsrs`-Quelltext, `Scheduler`-Klasse). `learning_steps`
 * bewusst immer 0: das vereinfachte Schema unterscheidet nicht zwischen
 * „gerade gelernt" und „wiederholt" — jede Karte mit mindestens einer
 * Bewertung gilt hier als im Zustand `Review`, FSRS' Kurzzeit-„Learning
 * Steps"-Feature (Wiederholung am selben Tag) wird nicht nachgebildet.
 */

export { Rating }
export type { Grade }

const scheduler = fsrs()

function latestReview(reviews: Review[]): Review | null {
  if (reviews.length === 0) return null
  return [...reviews].sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at)).at(-1)!
}

/** Eine Karte ohne Bewertung ist sofort fällig (neue Karte); sonst zählt `due_at` der letzten Bewertung. */
export function isDue(reviews: Review[], now: Date): boolean {
  const last = latestReview(reviews)
  if (!last) return true
  return new Date(last.due_at).getTime() <= now.getTime()
}

function toFsrsCard(reviews: Review[], now: Date): FsrsCard {
  const last = latestReview(reviews)
  if (!last) return createEmptyCard(now)
  return {
    due: new Date(last.due_at),
    stability: last.stability,
    difficulty: last.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: reviews.length,
    lapses: reviews.filter((r) => r.rating === Rating.Again).length,
    state: State.Review,
    last_review: new Date(last.reviewed_at),
  }
}

export interface ScheduledReview {
  rating: Grade
  stability: number
  difficulty: number
  due_at: string
}

/** Berechnet die nächste Fälligkeit einer Karte nach einer Bewertung (`Rating.Again`/`Hard`/`Good`/`Easy`). */
export function scheduleReview(reviews: Review[], now: Date, grade: Grade): ScheduledReview {
  const card = toFsrsCard(reviews, now)
  const { card: nextCard } = scheduler.next(card, now, grade)
  return {
    rating: grade,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    due_at: nextCard.due.toISOString(),
  }
}
