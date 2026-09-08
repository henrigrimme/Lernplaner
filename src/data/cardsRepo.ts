import type { SqlConnection } from './db'
import type { Card } from './schema'

/**
 * Echte SQL-Operationen für `cards` über `SqlConnection` (siehe
 * `data/db.ts`) — ROADMAP.md Phase 4 „Markieren im Dokument →
 * Karteikarten". Anlegen, Bearbeiten (`updateCardRow` seit dem
 * Karteikarten-Bereich v0.36.0, `ui/CardList.tsx`) und Löschen.
 */

export async function loadCards(conn: SqlConnection): Promise<Card[]> {
  return conn.select<Card>('SELECT * FROM cards ORDER BY id')
}

export type NewCardInput = Omit<Card, 'id' | 'created_at'>

export async function insertCard(conn: SqlConnection, input: NewCardInput, createdAt: string): Promise<Card> {
  const result = await conn.execute(
    `INSERT INTO cards (topic_id, document_id, page, front, back, source_quote, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.topic_id, input.document_id, input.page, input.front, input.back, input.source_quote, createdAt],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, created_at: createdAt, ...input }
}

/** Bearbeitet Felder einer bestehenden Karte (Vorder-/Rückseite, Thema). */
export async function updateCardRow(conn: SqlConnection, id: number, changes: Partial<NewCardInput>): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewCardInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE cards SET ${setClause} WHERE id = ?`, [...fields.map((field) => changes[field]), id])
}

export async function deleteCardRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM cards WHERE id = ?', [id])
}
