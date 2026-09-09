import { beforeEach, describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import type { SqlConnection } from '../../src/data/db'
import { loadDocumentPages, replaceDocumentPages } from '../../src/data/documentPagesRepo'

/** Legt ein Fach + Dokument an, damit der Fremdschlüssel greift. */
async function seedDocument(conn: SqlConnection, docId: number): Promise<void> {
  await conn.execute(
    `INSERT INTO courses (id, name, semester, color, priority, difficulty, archived, created_at, language, group_id, instructions)
     VALUES (1, 'M&B', 'HS26', '#000', 3, 3, 0, 'x', 'de', NULL, '')`,
  )
  await conn.execute(
    `INSERT INTO documents (id, course_id, filename, stored_path, sha256, doc_type, doc_type_label, pdf_pages, slide_count, unique_chars, imported_at)
     VALUES (?, 1, 'Doc.pdf', 'documents/x.pdf', 'sha', 'folien', NULL, 3, 0, 100, 'x')`,
    [docId],
  )
}

describe('documentPagesRepo', () => {
  let conn: SqlConnection

  beforeEach(async () => {
    conn = createTestConnection()
    await seedDocument(conn, 10)
  })

  it('schreibt und liest den Seitenindex, überspringt leere Seiten', async () => {
    await replaceDocumentPages(conn, 10, [
      { page: 1, text: 'Erste Seite über Anleihen.' },
      { page: 2, text: '   ' },
      { page: 3, text: '  Dritte Seite  ' },
    ])
    const rows = await loadDocumentPages(conn)
    expect(rows).toEqual([
      { document_id: 10, page: 1, text: 'Erste Seite über Anleihen.' },
      { document_id: 10, page: 3, text: 'Dritte Seite' },
    ])
  })

  it('ersetzt einen vorhandenen Index desselben Dokuments vollständig', async () => {
    await replaceDocumentPages(conn, 10, [{ page: 1, text: 'alt' }, { page: 2, text: 'alt zwei' }])
    await replaceDocumentPages(conn, 10, [{ page: 1, text: 'neu' }])
    const rows = await loadDocumentPages(conn)
    expect(rows).toEqual([{ document_id: 10, page: 1, text: 'neu' }])
  })

  it('verschwindet per ON DELETE CASCADE mit dem Dokument', async () => {
    await replaceDocumentPages(conn, 10, [{ page: 1, text: 'x' }])
    await conn.execute('DELETE FROM documents WHERE id = 10')
    expect(await loadDocumentPages(conn)).toEqual([])
  })
})
