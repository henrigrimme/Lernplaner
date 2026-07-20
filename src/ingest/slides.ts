import { normalizeForCompare } from './extract'
import type { Page, Slide } from './types'

/**
 * Animationsschritte zu Folien zusammenfassen.
 *
 * Das Problem (ADR-004): Foliensätze werden mit Animationen als PDF
 * exportiert, sodass jede Einblendung eine eigene Seite wird. Die Aufblähung
 * schwankt stark — an echtem Material gemessen zwischen 1,10× und 2,21×.
 * Eine seitenbasierte Aufwandsschätzung ist damit unbrauchbar.
 *
 * Zwei naheliegende Ansätze scheitern beide:
 *
 *   - **Nur Titelvergleich** fasst zu viel zusammen. Fortsetzungsfolien
 *     tragen dieselbe Überschrift, zeigen aber neuen Inhalt — bei Money &
 *     Banking führte das dazu, dass aus 64 Seiten nur 29 Folien wurden,
 *     obwohl echter Stoff verlorenging.
 *   - **Nur Textvergleich** fasst zu wenig zusammen, weil Aufbauschritte den
 *     Text umbrechen oder verschieben können.
 *
 * Der Ansatz hier verlangt beides: gleicher Titel **und** der Inhalt der
 * früheren Seite muss in der späteren praktisch vollständig wieder
 * auftauchen. Das trennt "Inhalt wurde ergänzt" (Animation) von "Inhalt
 * wurde ersetzt" (neue Folie).
 */

/**
 * Anteil der Zeilen der früheren Seite, der in der späteren wieder vorkommen
 * muss. Nicht 1,0, weil Aufbauschritte gelegentlich eine Zeile umformulieren
 * oder ein Platzhalter verschwindet.
 */
const CONTAINMENT_THRESHOLD = 0.8

/** Kürzere Zeilen sind zu unspezifisch für einen verlässlichen Vergleich. */
const MIN_COMPARABLE_LENGTH = 4

/** Unterhalb dieser Zeichenzahl gilt eine Seite als inhaltsleer. */
const SPARSE_CHARS = 60

function comparableKeys(lines: string[]): Set<string> {
  const keys = new Set<string>()
  for (const line of lines) {
    const key = normalizeForCompare(line)
    if (key.length >= MIN_COMPARABLE_LENGTH) keys.add(key)
  }
  return keys
}

/**
 * Ist `later` ein Aufbauschritt von `earlier`?
 *
 * Bedingung: Der Inhalt von `earlier` taucht in `later` praktisch vollständig
 * wieder auf, und `later` ist nicht kürzer. Beides zusammen bedeutet
 * "ergänzt", nicht "ersetzt".
 */
export function isBuildStep(earlier: string[], later: string[]): boolean {
  const earlierKeys = comparableKeys(earlier)
  const laterKeys = comparableKeys(later)

  // Eine leere Vorgängerseite (nur Titel) ist der Startpunkt eines Aufbaus.
  if (earlierKeys.size === 0) return true

  if (laterKeys.size < earlierKeys.size) return false

  let retained = 0
  for (const key of earlierKeys) if (laterKeys.has(key)) retained++
  return retained / earlierKeys.size >= CONTAINMENT_THRESHOLD
}

/**
 * Ist die Seite eine Kapitel-Trennfolie? Typisch: sehr wenig Text, oft nur
 * eine Nummer oder ein kurzer Kapitelname (Money & Banking nutzt das).
 */
export function isDividerPage(page: Page, bodyLines: string[]): boolean {
  const chars = bodyLines.join(' ').length
  if (chars > SPARSE_CHARS) return false
  const title = page.title.trim()
  if (title.length === 0) return bodyLines.length === 0
  // Reine Nummer, oder kurzer Titel ohne jeden Fließtext
  return /^\d{1,2}$/.test(title) || (bodyLines.length === 0 && title.length < 60)
}

/**
 * Seiten zu Folien gruppieren. Die Reihenfolge bleibt erhalten; jede Folie
 * kennt die PDF-Seiten, aus denen sie entstanden ist.
 */
export function groupIntoSlides(
  pages: Page[],
  bodyLinesByPage: Map<number, string[]>,
): Slide[] {
  const slides: Slide[] = []

  for (const page of pages) {
    const body = bodyLinesByPage.get(page.number) ?? []
    const divider = isDividerPage(page, body)
    const titleKey = normalizeForCompare(page.title)
    const previous = slides[slides.length - 1]

    const continuesPrevious =
      previous !== undefined &&
      !divider &&
      !previous.isDivider &&
      titleKey.length > 0 &&
      normalizeForCompare(previous.title) === titleKey &&
      isBuildStep(previous.bodyLines, body)

    if (continuesPrevious && previous) {
      previous.pageNumbers.push(page.number)
      // Der spätere Aufbauschritt ist der vollständigere.
      previous.bodyLines = body
      previous.chars = body.join(' ').length
    } else {
      slides.push({
        pageNumbers: [page.number],
        title: page.title,
        bodyLines: body,
        isDivider: divider,
        chars: body.join(' ').length,
      })
    }
  }

  return slides
}

/**
 * Eindeutiger Textumfang über alle Folien — die Basis der Aufwandsschätzung.
 *
 * Zeilen, die mehrfach vorkommen (etwa weil eine Gliederung auf mehreren
 * Folien wiederholt wird), werden einmal gezählt. Anders als die Seitenzahl
 * ist dieses Maß über Fächer hinweg stabil.
 */
export function uniqueCharCount(slides: Slide[]): number {
  const seen = new Set<string>()
  let total = 0
  for (const slide of slides) {
    for (const line of [slide.title, ...slide.bodyLines]) {
      const key = normalizeForCompare(line)
      if (key.length < MIN_COMPARABLE_LENGTH) continue
      if (seen.has(key)) continue
      seen.add(key)
      total += line.length
    }
  }
  return total
}
