import type { AvailabilityProposal, Weekday } from '../ai/types'

/**
 * Defensives Einlesen eines KI-Verfügbarkeitsvorschlags
 * (`AIProvider.parseAvailability`). Die KI kann Unsinn liefern
 * (erfundene Wochentage, negative Minuten, kaputte Datumsangaben) — hier
 * wird alles auf gültige Werte geklemmt bzw. verworfen, **bevor** der
 * Vorschlag dem Nutzer gezeigt oder gar angewandt wird (ADR-005). Reine
 * Funktion, kein Datenbank-/KI-Zugriff, damit unabhängig testbar.
 */

function toWeekday(value: unknown): Weekday | null {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 6 ? (n as Weekday) : null
}

function toMinutes(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 24 * 60)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function isHhMm(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function normalizeAvailabilityProposal(raw: unknown): AvailabilityProposal {
  const obj = (raw ?? {}) as Record<string, unknown>

  const weekdayMinutes: AvailabilityProposal['weekdayMinutes'] = []
  const seenWeekdays = new Set<Weekday>()
  for (const entry of Array.isArray(obj.weekdayMinutes) ? obj.weekdayMinutes : []) {
    const e = entry as Record<string, unknown>
    const weekday = toWeekday(e.weekday)
    if (weekday === null || seenWeekdays.has(weekday)) continue
    seenWeekdays.add(weekday)
    weekdayMinutes.push({ weekday, minutes: toMinutes(e.minutes) })
  }

  const exceptions: AvailabilityProposal['exceptions'] = []
  const seenDates = new Set<string>()
  for (const entry of Array.isArray(obj.exceptions) ? obj.exceptions : []) {
    const e = entry as Record<string, unknown>
    if (!isIsoDate(e.date) || seenDates.has(e.date)) continue
    seenDates.add(e.date)
    const note = typeof e.note === 'string' && e.note.trim().length > 0 ? e.note.trim() : null
    exceptions.push({ date: e.date, minutes: toMinutes(e.minutes), note })
  }

  const recurringBlockers: AvailabilityProposal['recurringBlockers'] = []
  for (const entry of Array.isArray(obj.recurringBlockers) ? obj.recurringBlockers : []) {
    const e = entry as Record<string, unknown>
    const weekday = toWeekday(e.weekday)
    if (weekday === null || !isHhMm(e.startsAt) || !isHhMm(e.endsAt) || e.endsAt <= e.startsAt) continue
    const label = typeof e.label === 'string' && e.label.trim().length > 0 ? e.label.trim() : 'Blocker'
    recurringBlockers.push({ weekday, startsAt: e.startsAt, endsAt: e.endsAt, label })
  }

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''

  return { weekdayMinutes, exceptions, recurringBlockers, summary }
}

/** `true`, wenn der Vorschlag nichts Anwendbares enthält (nur dann ist „Übernehmen" sinnlos). */
export function isEmptyAvailabilityProposal(p: AvailabilityProposal): boolean {
  return p.weekdayMinutes.length === 0 && p.exceptions.length === 0 && p.recurringBlockers.length === 0
}

const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const

/** Menschlich lesbare Zeilen für die Vorschau (`ui/AvailabilityAssistant.tsx`). */
export function describeAvailabilityProposal(p: AvailabilityProposal): string[] {
  const lines: string[] = []
  for (const { weekday, minutes } of p.weekdayMinutes) {
    lines.push(`${WEEKDAY_LABELS[weekday]}: ${minutes} Min.`)
  }
  for (const ex of p.exceptions) {
    lines.push(`Ausnahme ${ex.date}: ${ex.minutes} Min.${ex.note ? ` (${ex.note})` : ''}`)
  }
  for (const b of p.recurringBlockers) {
    lines.push(`Blocker ${WEEKDAY_LABELS[b.weekday]} ${b.startsAt}–${b.endsAt}: ${b.label}`)
  }
  return lines
}
