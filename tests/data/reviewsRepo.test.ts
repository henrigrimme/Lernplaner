import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { insertReview, loadReviews } from '../../src/data/reviewsRepo'
import { insertCard } from '../../src/data/cardsRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertTopic } from '../../src/data/topicsRepo'
import type { SqlConnection } from '../../src/data/db'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }

async function seedCard(conn: SqlConnection) {
  const course = await insertCourse(conn, COURSE_INPUT, 'x')
  const topic = await insertTopic(conn, {
    course_id: course.id,
    parent_id: null,
    name: 'Consumer Theory',
    normalized_name: 'consumertheory',
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
  })
  return insertCard(
    conn,
    { topic_id: topic.id, document_id: null, page: null, front: 'F', back: 'B', source_quote: null },
    'x',
  )
}

describe('reviewsRepo', () => {
  it('legt eine Wiederholung an und liefert sie mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const card = await seedCard(conn)
    const input = {
      card_id: card.id,
      reviewed_at: '2026-08-01T10:00:00.000Z',
      rating: 3,
      stability: 5.2,
      difficulty: 4.1,
      due_at: '2026-08-10T10:00:00.000Z',
    }
    const review = await insertReview(conn, input)
    expect(review).toMatchObject({ id: 1, ...input })
    expect(await loadReviews(conn)).toEqual([review])
  })

  it('behält mehrere Wiederholungen in Anlegereihenfolge (reines Anhänge-Protokoll)', async () => {
    const conn = createTestConnection()
    const card = await seedCard(conn)
    const first = await insertReview(conn, {
      card_id: card.id,
      reviewed_at: 'a',
      rating: 1,
      stability: 1,
      difficulty: 5,
      due_at: 'b',
    })
    const second = await insertReview(conn, {
      card_id: card.id,
      reviewed_at: 'c',
      rating: 3,
      stability: 3,
      difficulty: 4,
      due_at: 'd',
    })
    expect(await loadReviews(conn)).toEqual([first, second])
  })

  it('kaskadiert, wenn die referenzierte Karte gelöscht wird (ON DELETE CASCADE auf card_id)', async () => {
    const conn = createTestConnection()
    const card = await seedCard(conn)
    await insertReview(conn, {
      card_id: card.id,
      reviewed_at: 'x',
      rating: 3,
      stability: 1,
      difficulty: 1,
      due_at: 'y',
    })
    const { deleteCardRow } = await import('../../src/data/cardsRepo')
    await deleteCardRow(conn, card.id)
    expect(await loadReviews(conn)).toEqual([])
  })
})
