import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { insertDocument, loadDocuments } from '../../src/data/documentsRepo'
import { insertCourse } from '../../src/data/coursesRepo'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }

const DOCUMENT_INPUT = {
  filename: '02 Consumer Theory 01.pdf',
  stored_path: 'documents/abc123.pdf',
  sha256: 'abc123',
  doc_type: 'folien' as const,
  doc_type_label: null,
  pdf_pages: 5,
  slide_count: 3,
  unique_chars: 120,
}

describe('documentsRepo', () => {
  it('legt ein Dokument an und liefert es mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    const document = await insertDocument(conn, { ...DOCUMENT_INPUT, course_id: course.id }, '2026-07-21T00:00:00.000Z')
    expect(document).toMatchObject({ id: 1, ...DOCUMENT_INPUT, course_id: course.id, imported_at: '2026-07-21T00:00:00.000Z' })
    expect(await loadDocuments(conn)).toEqual([document])
  })

  it('wirft bei einem nicht existierenden Fach (Fremdschlüssel greift)', async () => {
    const conn = createTestConnection()
    await expect(insertDocument(conn, { ...DOCUMENT_INPUT, course_id: 999 }, 'x')).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    )
  })

  it('kaskadiert beim Löschen des zugehörigen Fachs (ON DELETE CASCADE)', async () => {
    const conn = createTestConnection()
    const course = await insertCourse(conn, COURSE_INPUT, 'x')
    await insertDocument(conn, { ...DOCUMENT_INPUT, course_id: course.id }, 'x')
    await conn.execute('DELETE FROM courses WHERE id = ?', [course.id])
    expect(await loadDocuments(conn)).toEqual([])
  })
})
