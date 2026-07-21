import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { insertTopicSection, loadTopicSections } from '../../src/data/topicSectionsRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertDocument } from '../../src/data/documentsRepo'
import { insertTopic } from '../../src/data/topicsRepo'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }
const DOCUMENT_INPUT = {
  filename: 'a.pdf',
  stored_path: 'in-memory://a.pdf',
  sha256: 'x',
  doc_type: 'folien' as const,
  pdf_pages: 5,
  slide_count: 3,
  unique_chars: 100,
}
const TOPIC_INPUT = {
  parent_id: null,
  name: 'Consumer Theory',
  normalized_name: 'consumertheory',
  weight: 3 as const,
  difficulty: 3 as const,
  sort_order: 0,
  status: 'offen' as const,
  manual_override: 0 as const,
}

async function seed(conn: Parameters<typeof insertCourse>[0]) {
  const course = await insertCourse(conn, COURSE_INPUT, 'x')
  const document = await insertDocument(conn, { ...DOCUMENT_INPUT, course_id: course.id }, 'x')
  const topic = await insertTopic(conn, { ...TOPIC_INPUT, course_id: course.id })
  return { course, document, topic }
}

describe('topicSectionsRepo', () => {
  it('legt einen Themenabschnitt an und liefert ihn mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const { document, topic } = await seed(conn)
    const section = await insertTopicSection(conn, {
      topic_id: topic.id,
      document_id: document.id,
      page_start: 1,
      page_end: 3,
      unique_chars: 500,
      slide_count: 2,
    })
    expect(section).toMatchObject({ id: 1, topic_id: topic.id, document_id: document.id, page_start: 1, page_end: 3 })
    expect(await loadTopicSections(conn)).toEqual([section])
  })

  it('kaskadiert beim Löschen des zugehörigen Themas (ON DELETE CASCADE auf topic_id)', async () => {
    const conn = createTestConnection()
    const { document, topic } = await seed(conn)
    await insertTopicSection(conn, { topic_id: topic.id, document_id: document.id, page_start: 1, page_end: 1, unique_chars: 10, slide_count: 1 })
    await conn.execute('DELETE FROM topics WHERE id = ?', [topic.id])
    expect(await loadTopicSections(conn)).toEqual([])
  })

  it('kaskadiert beim Löschen des zugehörigen Dokuments (ON DELETE CASCADE auf document_id)', async () => {
    const conn = createTestConnection()
    const { document, topic } = await seed(conn)
    await insertTopicSection(conn, { topic_id: topic.id, document_id: document.id, page_start: 1, page_end: 1, unique_chars: 10, slide_count: 1 })
    await conn.execute('DELETE FROM documents WHERE id = ?', [document.id])
    expect(await loadTopicSections(conn)).toEqual([])
  })
})
