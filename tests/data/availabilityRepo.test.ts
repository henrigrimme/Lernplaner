import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import {
  deleteAvailabilityExceptionRow,
  loadAvailabilityExceptions,
  loadAvailabilityPattern,
  upsertAvailabilityExceptionRow,
  upsertAvailabilityPatternRow,
} from '../../src/data/availabilityRepo'

describe('availabilityRepo — Wochenmuster', () => {
  it('legt einen Wochentag neu an', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityPatternRow(conn, 1, 60)
    expect(await loadAvailabilityPattern(conn)).toEqual([{ weekday: 1, minutes: 60 }])
  })

  it('überschreibt einen bestehenden Wochentag statt eine zweite Zeile anzulegen (weekday ist Primärschlüssel)', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityPatternRow(conn, 1, 60)
    await upsertAvailabilityPatternRow(conn, 1, 90)
    const rows = await loadAvailabilityPattern(conn)
    expect(rows).toEqual([{ weekday: 1, minutes: 90 }])
  })

  it('hält mehrere Wochentage unabhängig voneinander', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityPatternRow(conn, 1, 60)
    await upsertAvailabilityPatternRow(conn, 2, 30)
    const rows = await loadAvailabilityPattern(conn)
    expect(rows).toEqual([
      { weekday: 1, minutes: 60 },
      { weekday: 2, minutes: 30 },
    ])
  })
})

describe('availabilityRepo — Ausnahmen', () => {
  it('legt eine Ausnahme neu an', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityExceptionRow(conn, '2026-08-10', 0, 'Feiertag')
    expect(await loadAvailabilityExceptions(conn)).toEqual([{ date: '2026-08-10', minutes: 0, note: 'Feiertag' }])
  })

  it('überschreibt eine bestehende Ausnahme statt eine zweite Zeile anzulegen (date ist Primärschlüssel)', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityExceptionRow(conn, '2026-08-10', 0, 'Feiertag')
    await upsertAvailabilityExceptionRow(conn, '2026-08-10', 120, null)
    expect(await loadAvailabilityExceptions(conn)).toEqual([{ date: '2026-08-10', minutes: 120, note: null }])
  })

  it('löscht eine Ausnahme vollständig', async () => {
    const conn = createTestConnection()
    await upsertAvailabilityExceptionRow(conn, '2026-08-10', 0, null)
    await deleteAvailabilityExceptionRow(conn, '2026-08-10')
    expect(await loadAvailabilityExceptions(conn)).toEqual([])
  })
})
