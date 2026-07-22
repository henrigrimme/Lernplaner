import type { SqlConnection } from './db'
import type { AIUsage } from '../ai/types'

/**
 * Echte SQL-Operationen für `ai_usage` (Migration `0002_ai_usage.sql`,
 * ADR-007 „KI-Budget: Benachrichtigung statt Sperre"). Nur Einfügen und
 * Lesen — die Monatssumme wird aus den Zeilen abgeleitet, nicht separat
 * gespeichert (siehe DATA_MODEL.md „Abgeleitete Werte").
 */

export interface AIUsageRow {
  id: number
  occurred_at: string
  provider: string
  operation: string
  input_tokens: number
  output_tokens: number
  cost_eur: number
}

export async function insertAiUsage(conn: SqlConnection, provider: string, usage: AIUsage, occurredAt: string): Promise<void> {
  await conn.execute(
    `INSERT INTO ai_usage (occurred_at, provider, operation, input_tokens, output_tokens, cost_eur)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [occurredAt, provider, usage.operation, usage.inputTokens, usage.outputTokens, usage.costEur],
  )
}

/** Summe von `cost_eur` für den angegebenen Kalendermonat (Format `"YYYY-MM"`) — Grundlage der Budget-Benachrichtigung. */
export async function loadMonthlyAiCostEur(conn: SqlConnection, yearMonth: string): Promise<number> {
  const rows = await conn.select<{ total: number | null }>(
    `SELECT SUM(cost_eur) as total FROM ai_usage WHERE substr(occurred_at, 1, 7) = ?`,
    [yearMonth],
  )
  return rows[0]?.total ?? 0
}
