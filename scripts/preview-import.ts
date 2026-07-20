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
import { importExtractedDocument, type SqlExecutor } from '../src/data/importTopics'
import { estimateMinutes } from '../src/domain/estimation'

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

const exec: SqlExecutor = {
  run(sql, params) {
    const result = db.prepare(sql).run(...(params as (string | number | null)[]))
    return Promise.resolve(Number(result.lastInsertRowid))
  },
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Aufruf: npm run preview-import -- <pfad.pdf> ...')
  process.exit(1)
}

for (const file of files) {
  const doc = await extractDocument(new Uint8Array(readFileSync(file)), basename(file))
  const result = await importExtractedDocument(exec, 1, doc, {
    storedPath: file,
    sha256: 'preview',
    docType: 'folien',
  })

  console.log(`\n=== ${basename(file)} (documentId=${result.documentId}) ===`)
  const topics = db
    .prepare('SELECT id, name, sort_order FROM topics WHERE id IN (' + result.topicIds.join(',') + ') ORDER BY sort_order')
    .all() as { id: number; name: string; sort_order: number }[]

  for (const topic of topics) {
    const section = db
      .prepare(
        'SELECT page_start, page_end, unique_chars, slide_count FROM topic_sections WHERE topic_id = ?',
      )
      .get(topic.id) as
      | { page_start: number; page_end: number; unique_chars: number; slide_count: number }
      | undefined

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
