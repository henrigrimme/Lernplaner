import { describe, expect, it } from 'vitest'
import {
  availableMinutesForDay,
  availableMinutesInRange,
  checkCapacity,
} from '../../src/domain/capacity'
import type { AvailabilityException, AvailabilityPattern, Blocker } from '../../src/data/schema'

// Montag=1 ... Sonntag=0, wie JS Date#getUTCDay() — nirgends in DATA_MODEL.md
// beziffert, siehe Kommentar in capacity.ts.
const WEEKDAY_PATTERN: AvailabilityPattern[] = [
  { weekday: 0, minutes: 0 }, // Sonntag frei
  { weekday: 1, minutes: 120 },
  { weekday: 2, minutes: 120 },
  { weekday: 3, minutes: 120 },
  { weekday: 4, minutes: 120 },
  { weekday: 5, minutes: 120 },
  { weekday: 6, minutes: 180 }, // Samstag mehr Zeit
]

function blocker(overrides: Partial<Blocker> & { starts_at: string; ends_at: string }): Blocker {
  return { id: 1, title: 'Vorlesung', source: 'manuell', ...overrides }
}

describe('availableMinutesForDay', () => {
  it('liest die Minuten aus dem Wochenmuster', () => {
    // 2026-08-03 ist ein Montag
    expect(availableMinutesForDay('2026-08-03', WEEKDAY_PATTERN, [], [])).toBe(120)
  })

  it('ersetzt das Wochenmuster durch eine Ausnahme für dieses Datum (kein Zuschlag)', () => {
    const exceptions: AvailabilityException[] = [
      { date: '2026-08-03', minutes: 30, note: 'Zahnarzt' },
    ]
    expect(availableMinutesForDay('2026-08-03', WEEKDAY_PATTERN, exceptions, [])).toBe(30)
  })

  it('zieht einen Blocker ab, der vollständig innerhalb des Tages liegt', () => {
    const blockers = [blocker({ starts_at: '2026-08-03T09:00:00.000Z', ends_at: '2026-08-03T10:30:00.000Z' })]
    expect(availableMinutesForDay('2026-08-03', WEEKDAY_PATTERN, [], blockers)).toBe(120 - 90)
  })

  it('teilt einen Blocker über Mitternacht korrekt auf beide Tage auf', () => {
    const blockers = [blocker({ starts_at: '2026-08-03T23:00:00.000Z', ends_at: '2026-08-04T01:00:00.000Z' })]
    expect(availableMinutesForDay('2026-08-03', WEEKDAY_PATTERN, [], blockers)).toBe(120 - 60)
    expect(availableMinutesForDay('2026-08-04', WEEKDAY_PATTERN, [], blockers)).toBe(120 - 60)
  })

  it('wird nie negativ, auch wenn Blocker den Tag überbuchen', () => {
    const blockers = [blocker({ starts_at: '2026-08-03T00:00:00.000Z', ends_at: '2026-08-04T00:00:00.000Z' })]
    expect(availableMinutesForDay('2026-08-03', WEEKDAY_PATTERN, [], blockers)).toBe(0)
  })
})

describe('availableMinutesInRange', () => {
  it('summiert über mehrere Tage, "to" exklusiv', () => {
    // Mo 03.08. bis Mi 05.08. exklusiv -> Mo + Di = 2 Tage
    expect(availableMinutesInRange('2026-08-03', '2026-08-05', WEEKDAY_PATTERN, [], [])).toBe(240)
  })
})

describe('checkCapacity', () => {
  it('meldet ausreichend Kapazität, wenn genug Zeit da ist', () => {
    const result = checkCapacity({
      from: '2026-08-03',
      to: '2026-08-10', // eine volle Woche, 780 Minuten laut Muster
      pattern: WEEKDAY_PATTERN,
      exceptions: [],
      blockers: [],
      neededMinutes: 400,
    })
    expect(result.availableMinutes).toBe(780)
    expect(result.sufficient).toBe(true)
    expect(result.deficitMinutes).toBeLessThanOrEqual(0)
  })

  // CONTRIBUTING.md: "weniger Zeit als Stoff"
  it('erkennt ein Defizit, wenn weniger Zeit da ist als Stoff', () => {
    const result = checkCapacity({
      from: '2026-08-03',
      to: '2026-08-05', // Mo+Di = 240 Minuten
      pattern: WEEKDAY_PATTERN,
      exceptions: [],
      blockers: [],
      neededMinutes: 500,
    })
    expect(result.sufficient).toBe(false)
    expect(result.deficitMinutes).toBe(260)
    expect(result.coverage).toBeCloseTo(240 / 500)
  })

  it('zieht den Puffer vor dem Vergleich mit dem Bedarf ab', () => {
    const result = checkCapacity({
      from: '2026-08-03',
      to: '2026-08-05', // 240 Minuten verfügbar
      pattern: WEEKDAY_PATTERN,
      exceptions: [],
      blockers: [],
      neededMinutes: 200,
      bufferMinutes: 50,
    })
    // 240 - 50 = 190 nutzbar < 200 benötigt
    expect(result.sufficient).toBe(false)
    expect(result.deficitMinutes).toBe(10)
  })

  // CONTRIBUTING.md: "verschobener Prüfungstermin" — einfach neues `to`,
  // keine eigene Funktion nötig.
  it('verbessert die Deckung, wenn der Prüfungstermin (to) nach hinten verschoben wird', () => {
    const input = {
      from: '2026-08-03',
      pattern: WEEKDAY_PATTERN,
      exceptions: [],
      blockers: [],
      neededMinutes: 500,
    }
    const original = checkCapacity({ ...input, to: '2026-08-05' })
    const verschoben = checkCapacity({ ...input, to: '2026-08-10' })

    expect(original.sufficient).toBe(false)
    expect(verschoben.availableMinutes).toBeGreaterThan(original.availableMinutes)
    expect(verschoben.sufficient).toBe(true)
  })

  // CONTRIBUTING.md: "fünf parallele Prüfungen" — der Zeitraum wird EINMAL
  // über den gemeinsamen Horizont berechnet, der Bedarf über alle Prüfungen
  // summiert. Ein naiver Ansatz (verfügbare Zeit pro Prüfung einzeln
  // berechnen und aufsummieren) würde sich überschneidende Tage mehrfach
  // zählen und fälschlich ausreichend Kapazität melden.
  it('zählt sich überschneidende Tage bei mehreren parallelen Prüfungen nicht mehrfach', () => {
    // 5 Prüfungen in derselben Woche (03.–09.08.), alle im selben Zeitraum
    // vorbereitet -> gemeinsamer Horizont ist dieselbe Woche, nicht 5x.
    const from = '2026-08-03'
    const to = '2026-08-10' // eine Woche, 780 Minuten laut Muster
    const neededPerAssessment = 200
    const neededMinutes = neededPerAssessment * 5 // 1000

    const naive = availableMinutesInRange(from, to, WEEKDAY_PATTERN, [], []) * 5 // falsch: 3900
    const result = checkCapacity({
      from,
      to,
      pattern: WEEKDAY_PATTERN,
      exceptions: [],
      blockers: [],
      neededMinutes,
    })

    expect(result.availableMinutes).toBe(780) // nicht 3900
    expect(result.availableMinutes).toBeLessThan(naive)
    expect(result.sufficient).toBe(false) // 780 < 1000
    expect(result.deficitMinutes).toBe(220)
  })
})
