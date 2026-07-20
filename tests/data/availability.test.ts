import { describe, expect, it } from 'vitest'
import {
  removeAvailabilityException,
  setAvailabilityException,
  setAvailabilityPattern,
} from '../../src/data/availability'

describe('setAvailabilityPattern', () => {
  it('fügt einen neuen Wochentag hinzu', () => {
    const result = setAvailabilityPattern([], 1, 120)
    expect(result).toEqual([{ weekday: 1, minutes: 120 }])
  })

  it('überschreibt statt zu verdoppeln (weekday ist der Schlüssel)', () => {
    const first = setAvailabilityPattern([], 1, 120)
    const result = setAvailabilityPattern(first, 1, 90)
    expect(result).toEqual([{ weekday: 1, minutes: 90 }])
  })
})

describe('setAvailabilityException', () => {
  it('fügt eine neue Ausnahme hinzu', () => {
    const result = setAvailabilityException([], '2026-08-03', 30, 'Zahnarzt')
    expect(result).toEqual([{ date: '2026-08-03', minutes: 30, note: 'Zahnarzt' }])
  })

  it('überschreibt statt zu verdoppeln (date ist der Schlüssel)', () => {
    const first = setAvailabilityException([], '2026-08-03', 30, 'Zahnarzt')
    const result = setAvailabilityException(first, '2026-08-03', 0, null)
    expect(result).toEqual([{ date: '2026-08-03', minutes: 0, note: null }])
  })
})

describe('removeAvailabilityException', () => {
  it('entfernt die Ausnahme für ein Datum', () => {
    const exceptions = setAvailabilityException([], '2026-08-03', 30, null)
    expect(removeAvailabilityException(exceptions, '2026-08-03')).toEqual([])
  })
})
