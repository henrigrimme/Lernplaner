import { describe, expect, it } from 'vitest'
import {
  describeAvailabilityProposal,
  isEmptyAvailabilityProposal,
  normalizeAvailabilityProposal,
} from '../../src/domain/availabilityProposal'

describe('normalizeAvailabilityProposal', () => {
  it('gibt einen leeren Vorschlag für Unsinn zurück', () => {
    expect(normalizeAvailabilityProposal(null)).toEqual({
      weekdayMinutes: [],
      exceptions: [],
      recurringBlockers: [],
      summary: '',
    })
    expect(isEmptyAvailabilityProposal(normalizeAvailabilityProposal({ foo: 1 }))).toBe(true)
  })

  it('übernimmt gültige Wochentag-Minuten, klemmt Negatives auf 0 und dedupliziert', () => {
    const p = normalizeAvailabilityProposal({
      weekdayMinutes: [
        { weekday: 1, minutes: 120 },
        { weekday: 1, minutes: 999 }, // Duplikat -> ignoriert
        { weekday: 6, minutes: -30 }, // -> 0
        { weekday: 9, minutes: 60 }, // ungültiger Wochentag -> raus
      ],
    })
    expect(p.weekdayMinutes).toEqual([
      { weekday: 1, minutes: 120 },
      { weekday: 6, minutes: 0 },
    ])
  })

  it('nimmt nur gültige ISO-Daten als Ausnahmen, mit optionaler Notiz', () => {
    const p = normalizeAvailabilityProposal({
      exceptions: [
        { date: '2026-10-20', minutes: 0, note: '  Urlaub ' },
        { date: '20.10.2026', minutes: 0 }, // falsches Format -> raus
        { date: '2026-13-01', minutes: 0 }, // ungültig -> raus
        { date: '2026-10-21', minutes: 45, note: '' }, // leere Notiz -> null
      ],
    })
    expect(p.exceptions).toEqual([
      { date: '2026-10-20', minutes: 0, note: 'Urlaub' },
      { date: '2026-10-21', minutes: 45, note: null },
    ])
  })

  it('nimmt nur wohlgeformte wiederkehrende Blocker (HH:MM, Ende nach Anfang)', () => {
    const p = normalizeAvailabilityProposal({
      recurringBlockers: [
        { weekday: 2, startsAt: '18:00', endsAt: '19:30', label: 'Gym' },
        { weekday: 3, startsAt: '13:00', endsAt: '12:00', label: 'kaputt' }, // Ende vor Anfang
        { weekday: 4, startsAt: '9', endsAt: '10:00', label: 'kaputt' }, // Format
        { weekday: 5, startsAt: '08:00', endsAt: '09:00' }, // ohne Label -> "Blocker"
      ],
    })
    expect(p.recurringBlockers).toEqual([
      { weekday: 2, startsAt: '18:00', endsAt: '19:30', label: 'Gym' },
      { weekday: 5, startsAt: '08:00', endsAt: '09:00', label: 'Blocker' },
    ])
  })
})

describe('describeAvailabilityProposal', () => {
  it('formuliert lesbare Zeilen', () => {
    const lines = describeAvailabilityProposal({
      weekdayMinutes: [{ weekday: 1, minutes: 120 }],
      exceptions: [{ date: '2026-10-20', minutes: 0, note: 'Urlaub' }],
      recurringBlockers: [{ weekday: 2, startsAt: '18:00', endsAt: '19:30', label: 'Gym' }],
      summary: '',
    })
    expect(lines).toEqual([
      'Montag: 120 Min.',
      'Ausnahme 2026-10-20: 0 Min. (Urlaub)',
      'Blocker Dienstag 18:00–19:30: Gym',
    ])
  })
})
