import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { deleteCardRow, insertCard, loadCards } from '../../src/data/cardsRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertTopic } from '../../src/data/topicsRepo'
import type { SqlConnection } from '../../src/data/db'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const, language: 'de' as const }

async function seedTopic(conn: SqlConnection) {
  const course = await insertCourse(conn, COURSE_INPUT, 'x')
  return insertTopic(conn, {
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
}

describe('cardsRepo', () => {
  it('legt eine Karteikarte an und liefert sie mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const topic = await seedTopic(conn)
    const input = {
      topic_id: topic.id,
      document_id: null,
      page: null,
      front: 'Was ist ein Budgetgerade?',
      back: 'Die Menge erschwinglicher Güterbündel bei gegebenem Einkommen.',
      source_quote: 'The budget line separates affordable from unaffordable bundles',
    }
    const card = await insertCard(conn, input, '2026-08-01T10:00:00.000Z')
    expect(card).toMatchObject({ id: 1, created_at: '2026-08-01T10:00:00.000Z', ...input })
    expect(await loadCards(conn)).toEqual([card])
  })

  it('löscht eine Karteikarte vollständig', async () => {
    const conn = createTestConnection()
    const topic = await seedTopic(conn)
    const card = await insertCard(
      conn,
      { topic_id: topic.id, document_id: null, page: null, front: 'F', back: 'B', source_quote: null },
      'x',
    )
    await deleteCardRow(conn, card.id)
    expect(await loadCards(conn)).toEqual([])
  })

  it('kaskadiert, wenn das referenzierte Thema gelöscht wird (ON DELETE CASCADE auf topic_id)', async () => {
    const conn = createTestConnection()
    const topic = await seedTopic(conn)
    await insertCard(
      conn,
      { topic_id: topic.id, document_id: null, page: null, front: 'F', back: 'B', source_quote: null },
      'x',
    )
    const { deleteTopicRow } = await import('../../src/data/topicsRepo')
    await deleteTopicRow(conn, topic.id)
    expect(await loadCards(conn)).toEqual([])
  })
})
