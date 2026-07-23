import { describe, expect, it } from 'vitest'
import { removeRecurringBlocker } from '../../src/data/recurringBlockers'
import type { RecurringBlocker } from '../../src/data/schema'

describe('removeRecurringBlocker', () => {
  it('entfernt genau den Blocker mit der angegebenen id', () => {
    const blockers: RecurringBlocker[] = [
      { id: 1, weekday: 1, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' },
      { id: 2, weekday: 1, starts_at: '18:00', ends_at: '19:00', label: 'Gym' },
    ]
    expect(removeRecurringBlocker(blockers, 1)).toEqual([blockers[1]])
  })

  it('lässt die Liste unverändert, wenn die id nicht existiert', () => {
    const blockers: RecurringBlocker[] = [{ id: 1, weekday: 1, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' }]
    expect(removeRecurringBlocker(blockers, 99)).toEqual(blockers)
  })
})
