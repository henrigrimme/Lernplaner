import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import type { SqlConnection } from '../../src/data/db'

/**
 * Test-Implementierung von `SqlConnection` (siehe `data/db.ts`) über
 * `better-sqlite3` (bereits Testinfrastruktur, siehe
 * `tests/data/schema.test.ts`) — echte SQL-Ausführung gegen eine frische
 * In-Memory-Datenbank mit angewendeten Migrationen, kein Mock. Zur
 * Laufzeit implementiert `@tauri-apps/plugin-sql`s `Database`-Klasse
 * dieselbe `execute`/`select`-Form (siehe `data/db.ts`-Kommentar), aber
 * das lässt sich nicht gegen die echte Tauri-IPC-Bridge testen — diese
 * Verbindung hier prüft wenigstens, dass das SQL selbst stimmt.
 *
 * Geteilt zwischen allen `data/*Repo.ts`-Tests, damit nicht jede Datei die
 * Migrations-Dateien selbst einliest.
 */

const MIGRATION_0001 = readFileSync(resolve(__dirname, '../../src/data/migrations/0001_init.sql'), 'utf-8')
const MIGRATION_0002 = readFileSync(resolve(__dirname, '../../src/data/migrations/0002_ai_usage.sql'), 'utf-8')
const MIGRATION_0003 = readFileSync(resolve(__dirname, '../../src/data/migrations/0003_document_type_label.sql'), 'utf-8')
const MIGRATION_0004 = readFileSync(resolve(__dirname, '../../src/data/migrations/0004_quiz_language_and_options.sql'), 'utf-8')
const MIGRATION_0005 = readFileSync(resolve(__dirname, '../../src/data/migrations/0005_course_groups.sql'), 'utf-8')

export function createTestConnection(): SqlConnection {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(MIGRATION_0001)
  db.exec(MIGRATION_0002)
  db.exec(MIGRATION_0003)
  db.exec(MIGRATION_0004)
  db.exec(MIGRATION_0005)

  return {
    async execute(sql, params = []) {
      const info = db.prepare(sql).run(...(params as (string | number | bigint | Buffer | null)[]))
      return { lastInsertId: Number(info.lastInsertRowid), rowsAffected: info.changes }
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as (string | number | bigint | Buffer | null)[])) as T[]
    },
  }
}
