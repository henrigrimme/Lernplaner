/**
 * Diagnosewerkzeug: die Import-Pipeline UND das Mapping auf den Themenbaum
 * (`src/data/importTopics.ts`) gegen echte Foliensätze laufen lassen, gegen
 * eine In-Memory-SQLite-Datenbank. Ergänzt `analyze-material.ts` (das nur
 * die Ingest-Diagnostik zeigt) um die tatsächlichen `topics`/`topic_sections`
 * -Zeilen — der Plausibilitätscheck, den CONTEXT.md für jeden Schritt
 * verlangt (Stichprobe von Hand, nicht nur Unit-Tests).
 *
 *   npm run preview-import -- <pfad-zu-pdf> [weitere...]
 *
 * Die PDFs selbst gehören nicht ins Repository (siehe SECURITY.md) — dieses
 * Skript arbeitet mit lokalen Pfaden.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import Database from 'better-sqlite3'
import { extractDocument } from '../src/ingest/pdf'
import { persistExtractedDocument } from '../src/data/importTopics'
import { estimateMinutes } from '../src/domain/estimation'
import type { SqlConnection } from '../src/data/db'

const MIGRATION = readFileSync(
  new URL('../src/data/migrations/0001_init.sql', import.meta.url),
  'utf-8',
)

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')
db.exec(MIGRATION)
db.prepare(
  `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES ('Vorschau', 'WS25', '#000', 3, 3)`,
).run()

const conn: SqlConnection = {
  async execute(sql: string, params: unknown[] = []) {
    const info = db.prepare(sql).run(...(params as (string | number | bigint | Buffer | null)[]))
    return { lastInsertId: Number(info.lastInsertRowid), rowsAffected: info.changes }
  },
  async select<T>(sql: string, params: unknown[] = []) {
    return db.prepare(sql).all(...(params as (string | number | bigint | Buffer | null)[])) as T[]
  },
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Aufruf: npm run preview-import -- <pfad.pdf> ...')
  process.exit(1)
}

for (const file of files) {
  const doc = await extractDocument(new Uint8Array(readFileSync(file)), basename(file))
  const result = await persistExtractedDocument(
    conn,
    1,
    doc,
    { storedPath: file, sha256: 'preview', docType: 'folien' },
    new Date(0).toISOString(),
  )

  console.log(`\n=== ${basename(file)} (documentId=${result.document.id}) ===`)
  const topics = [...result.topics].sort((a, b) => a.sort_order - b.sort_order)

  for (const topic of topics) {
    const section = result.topicSections.find((s) => s.topic_id === topic.id)

    if (!section) {
      console.log(`  [${topic.sort_order}] "${topic.name}" — keine Folien`)
      continue
    }

    // Neutrale Annahmen (Schwierigkeit/Gewicht 3, Format "mixed") — hier
    // gibt es noch kein echtes Fach-/Prüfungssetup, siehe estimation.ts.
    const estimate = estimateMinutes({
      topic: { weight: 3 },
      sections: [section],
      course: { difficulty: 3 },
      assessmentFormat: 'mixed',
      calibration: null,
    })

    console.log(
      `  [${topic.sort_order}] "${topic.name}" — Seiten ${section.page_start}-${section.page_end}, ` +
        `${section.slide_count} Folien, ${section.unique_chars} Zeichen, ~${estimate.minutes} Min. (neutral geschätzt)`,
    )
  }
}
