import type { SqlConnection } from './db'
import type { Document, DocumentType } from './schema'

/**
 * Echte SQL-Operationen für `documents` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 5 (Themen/Themenabschnitte).
 * `documents` muss jetzt mitpersistiert werden, obwohl die PDF-Rohbytes
 * selbst bewusst nicht in die Datenbank sollen (SECURITY.md): `topic_
 * sections.document_id REFERENCES documents (id)` ist ein Pflichtfeld
 * (`NOT NULL`), ohne einen echten `documents`-Datensatz würde jeder
 * `topic_sections`-Import an der Fremdschlüssel-Prüfung scheitern (in den
 * Tests bereits mit `PRAGMA foreign_keys = ON` scharf geschaltet, siehe
 * `tests/data/testConnection.ts`).
 *
 * Nur `INSERT`/`SELECT` — `documents` werden ausschließlich beim Import
 * angelegt, nie über die UI bearbeitet; Löschen läuft über
 * `ON DELETE CASCADE` beim Löschen des zugehörigen Fachs.
 */

export interface NewDocumentInput {
  course_id: number
  filename: string
  /**
   * Bewusst kein echter Dateisystempfad: es gibt (noch) keine Datei-
   * Persistenz für PDFs (siehe `App.tsx`/`ui/SourceViewer.tsx`-Kommentar,
   * PDF-Bytes bleiben In-Memory). Platzhalterwert, klar als solcher
   * erkennbar (`in-memory://<filename>`), keine echte Adresse.
   */
  stored_path: string
  sha256: string
  doc_type: DocumentType
  pdf_pages: number
  slide_count: number
  unique_chars: number
}

export async function loadDocuments(conn: SqlConnection): Promise<Document[]> {
  return conn.select<Document>('SELECT * FROM documents ORDER BY id')
}

export async function insertDocument(
  conn: SqlConnection,
  input: NewDocumentInput,
  importedAt: string,
): Promise<Document> {
  const result = await conn.execute(
    `INSERT INTO documents (course_id, filename, stored_path, sha256, doc_type, pdf_pages, slide_count, unique_chars, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.course_id,
      input.filename,
      input.stored_path,
      input.sha256,
      input.doc_type,
      input.pdf_pages,
      input.slide_count,
      input.unique_chars,
      importedAt,
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input, imported_at: importedAt }
}
