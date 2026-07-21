import type { SqlConnection } from './db'
import type { PlanVersion } from './schema'

/**
 * Echte SQL-Operationen für `plan_versions` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 7, letzte verbleibende
 * Entität. Nur Anlegen, kein Update/Delete: `plan_versions` ist ein
 * reines Anhänge-Protokoll (ADR-005 „die vorige Fassung bleibt erhalten"),
 * `data/planVersions.ts`s `recordPlanVersion` hat nie ein Löschen oder
 * Ändern vorgesehen.
 */

export async function loadPlanVersions(conn: SqlConnection): Promise<PlanVersion[]> {
  return conn.select<PlanVersion>('SELECT * FROM plan_versions ORDER BY id')
}

export interface NewPlanVersionInput {
  reason: string
  snapshot_json: string
}

export async function insertPlanVersion(
  conn: SqlConnection,
  input: NewPlanVersionInput,
  createdAt: string,
): Promise<PlanVersion> {
  const result = await conn.execute(
    `INSERT INTO plan_versions (created_at, reason, snapshot_json) VALUES (?, ?, ?)`,
    [createdAt, input.reason, input.snapshot_json],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, created_at: createdAt, ...input }
}
