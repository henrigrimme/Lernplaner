import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { deleteRecurringBlockerRow, insertRecurringBlocker, loadRecurringBlockers } from '../../src/data/recurringBlockersRepo'

const INPUT = { weekday: 1 as const, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' }

describe('recurringBlockersRepo', () => {
  it('legt einen Blocker an und liefert ihn mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const blocker = await insertRecurringBlocker(conn, INPUT)
    expect(blocker).toEqual({ id: 1, ...INPUT })
    expect(await loadRecurringBlockers(conn)).toEqual([blocker])
  })

  it('lädt Blocker sortiert nach Wochentag, dann Startzeit', async () => {
    const conn = createTestConnection()
    await insertRecurringBlocker(conn, { weekday: 3, starts_at: '19:00', ends_at: '20:00', label: 'Abendessen' })
    await insertRecurringBlocker(conn, { weekday: 1, starts_at: '18:00', ends_at: '19:00', label: 'Gym' })
    await insertRecurringBlocker(conn, { weekday: 1, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' })

    const loaded = await loadRecurringBlockers(conn)
    expect(loaded.map((b) => b.label)).toEqual(['Mittagspause', 'Gym', 'Abendessen'])
  })

  it('löscht einen Blocker vollständig', async () => {
    const conn = createTestConnection()
    const blocker = await insertRecurringBlocker(conn, INPUT)
    await deleteRecurringBlockerRow(conn, blocker.id)
    expect(await loadRecurringBlockers(conn)).toEqual([])
  })

  it('lehnt eine ungültige Uhrzeit ab (CHECK-Constraint)', async () => {
    const conn = createTestConnection()
    await expect(insertRecurringBlocker(conn, { ...INPUT, starts_at: '25:00' })).rejects.toThrow()
  })

  it('lehnt einen Wochentag außerhalb 0-6 ab (CHECK-Constraint)', async () => {
    const conn = createTestConnection()
    await expect(insertRecurringBlocker(conn, { ...INPUT, weekday: 7 as never })).rejects.toThrow()
  })
})
