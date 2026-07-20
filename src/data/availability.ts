import type { AvailabilityException, AvailabilityPattern } from './schema'

/**
 * Reine Editierfunktionen für Verfügbarkeit. Beide Tabellen haben ihren
 * fachlichen Schlüssel als Primärschlüssel (`weekday` bzw. `date`,
 * `0001_init.sql`) — „hinzufügen" ist hier immer ein Upsert, kein Append,
 * sonst entstünden zwei Zeilen für denselben Wochentag/dasselbe Datum.
 */

export function setAvailabilityPattern(
  pattern: AvailabilityPattern[],
  weekday: AvailabilityPattern['weekday'],
  minutes: number,
): AvailabilityPattern[] {
  const existing = pattern.some((p) => p.weekday === weekday)
  if (!existing) return [...pattern, { weekday, minutes }]
  return pattern.map((p) => (p.weekday === weekday ? { ...p, minutes } : p))
}

export function setAvailabilityException(
  exceptions: AvailabilityException[],
  date: string,
  minutes: number,
  note: string | null = null,
): AvailabilityException[] {
  const existing = exceptions.some((e) => e.date === date)
  if (!existing) return [...exceptions, { date, minutes, note }]
  return exceptions.map((e) => (e.date === date ? { ...e, minutes, note } : e))
}

export function removeAvailabilityException(
  exceptions: AvailabilityException[],
  date: string,
): AvailabilityException[] {
  return exceptions.filter((e) => e.date !== date)
}
