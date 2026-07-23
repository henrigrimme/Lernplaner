import type { SqlConnection } from './db'
import type { RecurringBlocker } from './schema'
import type { NewRecurringBlockerInput } from './recurringBlockers'

/**
 * Echte SQL-Operationen für `recurring_blockers` (Migration 0006) über
 * `SqlConnection` — das Async-Pendant zu `data/recurringBlockers.ts`,
 * analog zu `paperStepsRepo.ts`/`paperSteps.ts`. Kein Update: ein falsch
 * angelegter Blocker wird gelöscht und neu erstellt (wie bei `cards`,
 * die Felder sind einfach genug, dass ein Bearbeitungsformular keinen
 * echten Zugewinn brächte).
 */

export async function loadRecurringBlockers(conn: SqlConnection): Promise<RecurringBlocker[]> {
  return conn.select<RecurringBlocker>('SELECT * FROM recurring_blockers ORDER BY weekday, starts_at')
}

export async function insertRecurringBlocker(
  conn: SqlConnection,
  input: NewRecurringBlockerInput,
): Promise<RecurringBlocker> {
  const result = await conn.execute(
    'INSERT INTO recurring_blockers (weekday, starts_at, ends_at, label) VALUES (?, ?, ?, ?)',
    [input.weekday, input.starts_at, input.ends_at, input.label],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function deleteRecurringBlockerRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM recurring_blockers WHERE id = ?', [id])
}
