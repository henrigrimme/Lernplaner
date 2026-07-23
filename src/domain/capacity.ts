import type { AvailabilityException, AvailabilityPattern, Blocker, RecurringBlocker } from '../data/schema'

/**
 * Kapazitätsrechnung: verfügbare vs. benötigte Zeit, Defiziterkennung
 * (ARCHITECTURE.md „domain/"). Reine Funktionen über einfache
 * Datenstrukturen — kein Datenbankzugriff, kein „heute" aus der Systemuhr:
 * der Aufrufer übergibt `from`/`to` explizit (ARCHITECTURE.md „domain/ …
 * kennt weder DB noch UI noch KI").
 *
 * **Wichtig für parallele Prüfungen:** Diese Funktionen kennen keine
 * Prüfungen, nur einen Zeitraum. Für mehrere gleichzeitig laufende
 * Vorbereitungen (bis zu 5, siehe CONTEXT.md „Nutzer") muss
 * `availableMinutesInRange` **einmal** über den gemeinsamen Gesamtzeitraum
 * aufgerufen werden (heute bis zur spätesten Prüfung), nicht einmal pro
 * Prüfung — sonst werden sich überschneidende Tage mehrfach gezählt, und
 * die Kapazität wirkt größer, als sie ist. `checkCapacity` bildet das ab:
 * `neededMinutes` ist die **Summe über alle Prüfungen im Zeitraum**,
 * `availableMinutes` wird nur einmal für den ganzen Zeitraum berechnet.
 *
 * **Nicht Teil dieses Moduls:** Rückstand mitten in der Vorbereitung
 * erkennen/nachjustieren (braucht `study_blocks.actual_minutes` und
 * `completed_at`, also echte Nutzungsdaten) — das ist `replanning.ts`,
 * noch nicht gebaut. Ein verschobener Prüfungstermin braucht dagegen keine
 * eigene Funktion: einfach `to` neu übergeben, siehe Tests.
 */

/**
 * Ein "HH:MM"-Zeitpunkt an einem gegebenen Kalendertag (UTC) als
 * absoluter Zeitstempel in Millisekunden. Kein eigenes Datum für das Ende
 * nötig — `recurring_blockers` überspannt nie Mitternacht (Migration
 * 0006: reine Uhrzeit je Wochentag, ein Mittagessen o. Ä. endet immer am
 * selben Tag).
 */
function timeOnDayMs(dateStartMs: number, hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return dateStartMs + (hours! * 60 + minutes!) * 60_000
}

/**
 * Wiederkehrende Blocker, die auf `weekday` dieses Tages passen, als
 * absolute [Start, Ende]-Intervalle (ms) für genau diesen Kalendertag.
 */
function recurringBlockerIntervalsForDay(
  dayStartMs: number,
  weekday: number,
  recurringBlockers: RecurringBlocker[],
): { start: number; end: number }[] {
  return recurringBlockers
    .filter((b) => b.weekday === weekday)
    .map((b) => ({ start: timeOnDayMs(dayStartMs, b.starts_at), end: timeOnDayMs(dayStartMs, b.ends_at) }))
}

/**
 * Summe der von `intervals` überdeckten Zeit innerhalb von
 * [`rangeStart`, `rangeEnd`) in Minuten — als **Vereinigung**, nicht als
 * naive Summe der Einzeldauern: zwei sich überschneidende Blocker (z. B.
 * eine Vorlesung, die zufällig mit der Mittagspause zusammenfällt) dürfen
 * ihre gemeinsame Zeit nicht doppelt abziehen, sonst würde die verfügbare
 * Zeit unterschätzt.
 */
function mergedOverlapMinutes(
  intervals: { start: number; end: number }[],
  rangeStart: number,
  rangeEnd: number,
): number {
  const clipped = intervals
    .map(({ start, end }) => ({ start: Math.max(start, rangeStart), end: Math.min(end, rangeEnd) }))
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start)

  let totalMs = 0
  let currentStart = -Infinity
  let currentEnd = -Infinity
  for (const { start, end } of clipped) {
    if (start > currentEnd) {
      if (currentEnd > currentStart) totalMs += currentEnd - currentStart
      currentStart = start
      currentEnd = end
    } else {
      currentEnd = Math.max(currentEnd, end)
    }
  }
  if (currentEnd > currentStart) totalMs += currentEnd - currentStart

  return totalMs / 60_000
}

/**
 * Verfügbare Minuten an einem einzelnen Tag: `availability_exception`
 * ersetzt den Wochenmuster-Wert vollständig, wenn eine für dieses Datum
 * existiert (DATA_MODEL.md „einzelne abweichende Tage" — ein Override, kein
 * Zuschlag). Danach wird die Dauer aller `blockers` (absolut datiert,
 * Uhrzeit-genau, ein Termin über Mitternacht wird auf die betroffenen Tage
 * aufgeteilt) und `recurringBlockers` (Wochentag + Uhrzeit, Migration
 * 0006 — z. B. eine tägliche Mittagspause) abgezogen — beide zusammen als
 * **eine** Vereinigungsmenge (`mergedOverlapMinutes`), damit sich
 * überschneidende Blocker nicht doppelt zählen. Ergebnis nie negativ.
 */
export function availableMinutesForDay(
  dateISO: string,
  pattern: AvailabilityPattern[],
  exceptions: AvailabilityException[],
  blockers: Blocker[],
  recurringBlockers: RecurringBlocker[] = [],
): number {
  const exception = exceptions.find((e) => e.date === dateISO)
  const dayStart = new Date(`${dateISO}T00:00:00.000Z`)
  const weekday = dayStart.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

  const baseMinutes =
    exception?.minutes ?? pattern.find((p) => p.weekday === weekday)?.minutes ?? 0

  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000

  const intervals = [
    ...blockers.map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() })),
    ...recurringBlockerIntervalsForDay(dayStartMs, weekday, recurringBlockers),
  ]
  const blockedMinutes = mergedOverlapMinutes(intervals, dayStartMs, dayEndMs)

  return Math.max(0, baseMinutes - blockedMinutes)
}

/**
 * Alle Kalendertage von `from` (inklusiv) bis `to` (exklusiv) als
 * ISO-Datumsstrings. Exportiert, weil `scheduling.ts` dieselbe
 * Tagesiteration braucht — nicht duplizieren.
 */
export function datesInRange(from: string, to: string): string[] {
  const dates: string[] = []
  let cursor = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)
  while (cursor.getTime() < end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return dates
}

/** Summe der verfügbaren Minuten über `from` (inklusiv) bis `to` (exklusiv). */
export function availableMinutesInRange(
  from: string,
  to: string,
  pattern: AvailabilityPattern[],
  exceptions: AvailabilityException[],
  blockers: Blocker[],
  recurringBlockers: RecurringBlocker[] = [],
): number {
  return datesInRange(from, to).reduce(
    (sum, date) => sum + availableMinutesForDay(date, pattern, exceptions, blockers, recurringBlockers),
    0,
  )
}

export interface CapacityInput {
  /** Inklusiv — typischerweise "heute". */
  from: string
  /** Exklusiv — der Prüfungstag selbst zählt nicht mehr als Lernzeit. */
  to: string
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  blockers: Blocker[]
  /** Wochentag-Zeitfenster wie eine tägliche Mittagspause (Migration 0006) — optional, Default keine. */
  recurringBlockers?: RecurringBlocker[]
  /** Summe aus `estimateMinutes` (siehe `estimation.ts`) über alle Themen im Zeitraum. */
  neededMinutes: number
  /**
   * Sicherheitsmarge, die trotz rechnerisch verfügbarer Zeit nicht verplant
   * werden soll (DATA_MODEL.md „Abgeleitete Werte": „(verfügbar − Puffer) /
   * benötigt"). Dort nicht beziffert — bewusst kein Standardwert außer 0,
   * der Aufrufer muss eine Zahl setzen, statt dass hier eine erfundene
   * Prozentzahl greift.
   */
  bufferMinutes?: number
}

export interface CapacityResult {
  availableMinutes: number
  neededMinutes: number
  bufferMinutes: number
  /** > 0 heißt zu wenig Zeit. */
  deficitMinutes: number
  sufficient: boolean
  /** (verfügbar − Puffer) / benötigt. `Infinity` wenn nichts benötigt wird. */
  coverage: number
}

export function checkCapacity(input: CapacityInput): CapacityResult {
  const bufferMinutes = input.bufferMinutes ?? 0
  const availableMinutes = availableMinutesInRange(
    input.from,
    input.to,
    input.pattern,
    input.exceptions,
    input.blockers,
    input.recurringBlockers ?? [],
  )
  const usable = availableMinutes - bufferMinutes
  const deficitMinutes = input.neededMinutes - usable
  const coverage = input.neededMinutes === 0 ? Infinity : usable / input.neededMinutes

  return {
    availableMinutes,
    neededMinutes: input.neededMinutes,
    bufferMinutes,
    deficitMinutes,
    sufficient: deficitMinutes <= 0,
    coverage,
  }
}
