import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { insertPlanVersion, loadPlanVersions } from '../../src/data/planVersionsRepo'

describe('planVersionsRepo', () => {
  it('legt eine Planversion an und liefert sie mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const version = await insertPlanVersion(
      conn,
      { reason: 'Neuberechnung am 2026-08-01', snapshot_json: '[]' },
      '2026-08-01T10:00:00.000Z',
    )
    expect(version).toMatchObject({
      id: 1,
      created_at: '2026-08-01T10:00:00.000Z',
      reason: 'Neuberechnung am 2026-08-01',
      snapshot_json: '[]',
    })
    expect(await loadPlanVersions(conn)).toEqual([version])
  })

  it('behält mehrere Fassungen in Anlegereihenfolge (reines Anhänge-Protokoll)', async () => {
    const conn = createTestConnection()
    const first = await insertPlanVersion(conn, { reason: 'erste', snapshot_json: '[]' }, 'x')
    const second = await insertPlanVersion(conn, { reason: 'zweite', snapshot_json: '[{"id":1}]' }, 'y')

    expect(await loadPlanVersions(conn)).toEqual([first, second])
  })
})
