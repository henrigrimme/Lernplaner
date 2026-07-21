import type { SqlConnection } from './db'
import type { TopicSection } from './schema'

/**
 * Echte SQL-Operationen für `topic_sections` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 5. Nur `INSERT`/`SELECT`:
 * `topic_sections` entstehen ausschließlich beim PDF-Import
 * (`data/importTopics.ts`) und werden nie über die UI bearbeitet; Löschen
 * läuft über `ON DELETE CASCADE`, sobald das zugehörige Thema gelöscht
 * wird (`ui/TopicTree.tsx` → `syncTopics` in `data/topicsRepo.ts`).
 */

export async function loadTopicSections(conn: SqlConnection): Promise<TopicSection[]> {
  return conn.select<TopicSection>('SELECT * FROM topic_sections ORDER BY id')
}

export interface NewTopicSectionInput {
  topic_id: number
  document_id: number
  page_start: number
  page_end: number
  unique_chars: number
  slide_count: number
}

export async function insertTopicSection(conn: SqlConnection, input: NewTopicSectionInput): Promise<TopicSection> {
  const result = await conn.execute(
    `INSERT INTO topic_sections (topic_id, document_id, page_start, page_end, unique_chars, slide_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.topic_id, input.document_id, input.page_start, input.page_end, input.unique_chars, input.slide_count],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}
