import type { SqlConnection } from './db'
import type { AvailabilityException, AvailabilityPattern } from './schema'

/**
 * Echte SQL-Operationen für Verfügbarkeit über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 4. Anders als
 * `coursesRepo.ts`/`assessmentsRepo.ts`: beide Tabellen tragen ihren
 * fachlichen Schlüssel als Primärschlüssel (`weekday` bzw. `date`,
 * `0001_init.sql`, siehe `data/availability.ts`-Kommentar) — kein
 * `AUTOINCREMENT`, „Anlegen" ist hier immer ein SQL-`UPSERT`
 * (`INSERT … ON CONFLICT DO UPDATE`), kein reines `INSERT`.
 *
 * Getestet über `tests/data/testConnection.ts` (echtes SQL gegen
 * `better-sqlite3`, keine Mocks).
 */

export async function loadAvailabilityPattern(conn: SqlConnection): Promise<AvailabilityPattern[]> {
  return conn.select<AvailabilityPattern>('SELECT * FROM availability_pattern ORDER BY weekday')
}

export async function upsertAvailabilityPatternRow(
  conn: SqlConnection,
  weekday: AvailabilityPattern['weekday'],
  minutes: number,
): Promise<void> {
  await conn.execute(
    `INSERT INTO availability_pattern (weekday, minutes) VALUES (?, ?)
     ON CONFLICT (weekday) DO UPDATE SET minutes = excluded.minutes`,
    [weekday, minutes],
  )
}

export async function loadAvailabilityExceptions(conn: SqlConnection): Promise<AvailabilityException[]> {
  return conn.select<AvailabilityException>('SELECT * FROM availability_exception ORDER BY date')
}

export async function upsertAvailabilityExceptionRow(
  conn: SqlConnection,
  date: string,
  minutes: number,
  note: string | null,
): Promise<void> {
  await conn.execute(
    `INSERT INTO availability_exception (date, minutes, note) VALUES (?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET minutes = excluded.minutes, note = excluded.note`,
    [date, minutes, note],
  )
}

export async function deleteAvailabilityExceptionRow(conn: SqlConnection, date: string): Promise<void> {
  await conn.execute('DELETE FROM availability_exception WHERE date = ?', [date])
}
