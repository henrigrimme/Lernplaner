import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Prüft die Migrationen gegen eine echte (In-Memory-)SQLite-Datenbank statt
 * die SQL-Dateien nur zu lesen. `better-sqlite3` ist reine Testinfrastruktur —
 * zur Laufzeit läuft die App später über `tauri-plugin-sql` (siehe
 * ARCHITECTURE.md), das dieselben SQL-Dateien ausführt.
 */
const MIGRATION_0001 = readFileSync(
  resolve(__dirname, '../../src/data/migrations/0001_init.sql'),
  'utf-8',
)
const MIGRATION_0002 = readFileSync(
  resolve(__dirname, '../../src/data/migrations/0002_ai_usage.sql'),
  'utf-8',
)
const MIGRATION_0003 = readFileSync(
  resolve(__dirname, '../../src/data/migrations/0003_document_type_label.sql'),
  'utf-8',
)

const EXPECTED_TABLES = [
  'courses',
  'assessments',
  'documents',
  'topics',
  'topic_sections',
  'availability_pattern',
  'availability_exception',
  'blockers',
  'study_blocks',
  'calibration',
  'plan_versions',
  'ai_usage',
  'cards',
  'reviews',
  'quizzes',
  'questions',
  'answers',
  'paper_steps',
  'annotations',
  'settings',
]

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(MIGRATION_0001)
  db.exec(MIGRATION_0002)
  return db
}

describe('Migration 0001_init', () => {
  let db: Database.Database

  beforeEach(() => {
    db = freshDb()
  })

  it('legt alle im Datenmodell dokumentierten Tabellen an — auch die erst später befüllten', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    const actual = rows.map((r) => r.name).sort()
    expect(actual).toEqual([...EXPECTED_TABLES].sort())
  })

  it('erzwingt Fremdschlüssel: eine topic_section auf ein nicht existierendes Thema schlägt fehl', () => {
    db.prepare(
      `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
    ).run('Microeconomics', 'WS25', '#000', 3, 3)
    db.prepare(
      `INSERT INTO documents (course_id, filename, stored_path, sha256, doc_type, pdf_pages, slide_count, unique_chars)
       VALUES (1, 'a.pdf', '/x/a.pdf', 'abc', 'folien', 10, 10, 1000)`,
    ).run()

    expect(() =>
      db
        .prepare(
          `INSERT INTO topic_sections (topic_id, document_id, page_start, page_end, unique_chars, slide_count)
           VALUES (999, 1, 1, 2, 100, 2)`,
        )
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/)
  })

  it('löscht topic_sections mit, wenn das zugehörige Thema gelöscht wird (ON DELETE CASCADE)', () => {
    db.prepare(
      `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
    ).run('Microeconomics', 'WS25', '#000', 3, 3)
    db.prepare(
      `INSERT INTO topics (course_id, name, normalized_name, weight, difficulty, sort_order)
       VALUES (1, 'Consumer Theory', 'consumertheory', 3, 3, 0)`,
    ).run()
    db.prepare(
      `INSERT INTO documents (course_id, filename, stored_path, sha256, doc_type, pdf_pages, slide_count, unique_chars)
       VALUES (1, 'a.pdf', '/x/a.pdf', 'abc', 'folien', 10, 10, 1000)`,
    ).run()
    db.prepare(
      `INSERT INTO topic_sections (topic_id, document_id, page_start, page_end, unique_chars, slide_count)
       VALUES (1, 1, 1, 5, 500, 5)`,
    ).run()

    db.prepare(`DELETE FROM topics WHERE id = 1`).run()

    const remaining = db.prepare('SELECT COUNT(*) AS n FROM topic_sections').get() as { n: number }
    expect(remaining.n).toBe(0)
  })

  it('weist eine priority außerhalb von 1–5 zurück (CHECK-Constraint)', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('X', 'WS25', '#000', 9, 3),
    ).toThrow(/CHECK constraint failed/)
  })

  it('weist einen unbekannten assessment.format zurück (CHECK-Constraint)', () => {
    db.prepare(
      `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
    ).run('X', 'WS25', '#000', 3, 3)

    expect(() =>
      db
        .prepare(
          `INSERT INTO assessments (course_id, type, title, date, weight, format) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(1, 'klausur', 'Endklausur', '2026-10-15', 5, 'unbekanntes_format'),
    ).toThrow(/CHECK constraint failed/)
  })

  it('verlangt source_document_id und source_page bei questions (NOT NULL)', () => {
    db.prepare(
      `INSERT INTO courses (name, semester, color, priority, difficulty) VALUES (?, ?, ?, ?, ?)`,
    ).run('X', 'WS25', '#000', 3, 3)
    db.prepare(
      `INSERT INTO quizzes (course_id, config_json) VALUES (1, '{}')`,
    ).run()

    expect(() =>
      db
        .prepare(
          `INSERT INTO questions (quiz_id, type, prompt, answer) VALUES (1, 'mc', 'Frage?', 'Antwort')`,
        )
        .run(),
    ).toThrow(/NOT NULL constraint failed/)
  })

  it('lässt sich zweimal anwenden nur, wenn die Datenbank vorher leer ist (keine idempotente Wiederanwendung)', () => {
    // Dokumentiert bewusst das aktuelle Verhalten: die Migrationen legen
    // Tabellen ohne "IF NOT EXISTS" an. Ein Migrationsrunner (kommt mit dem
    // Tauri-Rahmen) muss angewendete Migrationen selbst nachhalten.
    expect(() => db.exec(MIGRATION_0001)).toThrow(/already exists/)
  })
})

describe('Migration 0002_ai_usage (ADR-007)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = freshDb()
  })

  it('protokolliert einen KI-Aufruf mit Kosten', () => {
    db.prepare(
      `INSERT INTO ai_usage (provider, operation, input_tokens, output_tokens, cost_eur)
       VALUES ('gemini-flash-lite', 'refine_topics', 1200, 400, 0.0021)`,
    ).run()

    const row = db.prepare('SELECT * FROM ai_usage').get() as { cost_eur: number }
    expect(row.cost_eur).toBeCloseTo(0.0021)
  })

  it('lehnt einen Aufruf ohne Kostenangabe ab (NOT NULL)', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO ai_usage (provider, operation, input_tokens, output_tokens)
           VALUES ('gemini-flash-lite', 'refine_topics', 1200, 400)`,
        )
        .run(),
    ).toThrow(/NOT NULL constraint failed/)
  })

  it('lässt die Monatssumme als abgeleiteten Wert berechnen, statt sie zu speichern', () => {
    const insert = db.prepare(
      `INSERT INTO ai_usage (occurred_at, provider, operation, input_tokens, output_tokens, cost_eur)
       VALUES (?, 'gemini-flash-lite', 'refine_topics', 100, 50, ?)`,
    )
    insert.run('2026-08-01T10:00:00.000Z', 2.5)
    insert.run('2026-08-15T10:00:00.000Z', 3.0)
    insert.run('2026-09-01T10:00:00.000Z', 1.0) // anderer Monat, zählt nicht mit

    const sum = db
      .prepare(
        `SELECT SUM(cost_eur) AS total FROM ai_usage WHERE occurred_at LIKE '2026-08%'`,
      )
      .get() as { total: number }
    expect(sum.total).toBeCloseTo(5.5)
  })
})
