import type { AvailabilityException, AvailabilityPattern, Blocker } from '../data/schema'

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
 * Verfügbare Minuten an einem einzelnen Tag: `availability_exception`
 * ersetzt den Wochenmuster-Wert vollständig, wenn eine für dieses Datum
 * existiert (DATA_MODEL.md „einzelne abweichende Tage" — ein Override, kein
 * Zuschlag). Danach wird die Dauer aller `blockers` abgezogen, die an
 * diesem Tag liegen (Uhrzeit-genau, ein Termin über Mitternacht wird auf
 * die betroffenen Tage aufgeteilt). Ergebnis nie negativ.
 */
export function availableMinutesForDay(
  dateISO: string,
  pattern: AvailabilityPattern[],
  exceptions: AvailabilityException[],
  blockers: Blocker[],
): number {
  const exception = exceptions.find((e) => e.date === dateISO)
  const dayStart = new Date(`${dateISO}T00:00:00.000Z`)
  const weekday = dayStart.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

  const baseMinutes =
    exception?.minutes ?? pattern.find((p) => p.weekday === weekday)?.minutes ?? 0

  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const blockedMinutes = blockers.reduce((sum, blocker) => {
    const start = new Date(blocker.starts_at)
    const end = new Date(blocker.ends_at)
    const overlapStart = Math.max(start.getTime(), dayStart.getTime())
    const overlapEnd = Math.min(end.getTime(), dayEnd.getTime())
    const overlapMs = Math.max(0, overlapEnd - overlapStart)
    return sum + overlapMs / 60_000
  }, 0)

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
): number {
  return datesInRange(from, to).reduce(
    (sum, date) => sum + availableMinutesForDay(date, pattern, exceptions, blockers),
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
