import type { SqlConnection } from './db'
import type { DocumentPage } from './schema'

/**
 * Echte SQL-Operationen für `document_pages` (Migration 0008) — der
 * persistente Volltext-Index je Dokumentseite für „Chat mit den
 * Unterlagen" (`domain/documentChat.ts`).
 *
 * Befüllt wird der Index **nicht** beim Import selbst, sondern einmalig
 * aus den geladenen Dokument-Bytes (`App.tsx`, siehe dortigen Effekt) —
 * so werden auch die vor Migration 0008 bereits importierten Dokumente
 * nachträglich indexiert, was eine reine SQL-Migration nicht leisten kann
 * (sie käme nicht an den PDF-Text). Danach ist der Index ein reiner Cache:
 * einmal geschrieben, bei jeder Sitzung nur noch gelesen.
 */

export async function loadDocumentPages(conn: SqlConnection): Promise<DocumentPage[]> {
  return conn.select<DocumentPage>('SELECT document_id, page, text FROM document_pages ORDER BY document_id, page')
}

/**
 * Schreibt den Seitenindex eines Dokuments. Ersetzt einen etwaigen
 * vorhandenen Index desselben Dokuments vollständig (erst `DELETE`, dann
 * `INSERT`) — damit ein erneuter Lauf nach geänderter Extraktion nicht an
 * der Primärschlüssel-Kollision scheitert. Leere Seiten werden
 * übersprungen (reine Grafikfolien liefern keinen durchsuchbaren Text).
 */
export async function replaceDocumentPages(
  conn: SqlConnection,
  documentId: number,
  pages: { page: number; text: string }[],
): Promise<void> {
  await conn.execute('DELETE FROM document_pages WHERE document_id = ?', [documentId])
  for (const { page, text } of pages) {
    const trimmed = text.trim()
    if (trimmed.length === 0) continue
    await conn.execute('INSERT INTO document_pages (document_id, page, text) VALUES (?, ?, ?)', [documentId, page, trimmed])
  }
}
