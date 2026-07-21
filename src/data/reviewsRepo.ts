import type { SqlConnection } from './db'
import type { Review } from './schema'

/**
 * Echte SQL-Operationen für `reviews` über `SqlConnection` (siehe
 * `data/db.ts`) — ROADMAP.md Phase 4 „Spaced Repetition FSRS". Nur
 * Anlegen, kein Update/Delete: eine Wiederholung ist ein historisches
 * Ereignis (wie `plan_versions`), nicht nachträglich änderbar.
 */

export async function loadReviews(conn: SqlConnection): Promise<Review[]> {
  return conn.select<Review>('SELECT * FROM reviews ORDER BY id')
}

export type NewReviewInput = Omit<Review, 'id'>

export async function insertReview(conn: SqlConnection, input: NewReviewInput): Promise<Review> {
  const result = await conn.execute(
    `INSERT INTO reviews (card_id, reviewed_at, rating, stability, difficulty, due_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.card_id, input.reviewed_at, input.rating, input.stability, input.difficulty, input.due_at],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}
