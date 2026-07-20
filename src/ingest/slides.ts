import { normalizeForCompare } from './extract'
import type { BodyLine, Page, Slide } from './types'

/**
 * Animationsschritte zu Folien zusammenfassen.
 *
 * Das Problem (ADR-004): Foliensätze werden mit Animationen als PDF
 * exportiert, sodass jede Einblendung eine eigene Seite wird. Die Aufblähung
 * schwankt stark — an echtem Material gemessen zwischen 1,10× und 2,21×.
 * Eine seitenbasierte Aufwandsschätzung ist damit unbrauchbar.
 *
 * Drei naheliegende Ansätze wurden erprobt:
 *
 *   - **Nur Titelvergleich** fasst zu viel zusammen. Fortsetzungsfolien
 *     tragen dieselbe Überschrift, zeigen aber neuen Inhalt — bei Money &
 *     Banking führte das dazu, dass aus 64 Seiten nur 29 Folien wurden,
 *     obwohl echter Stoff verlorenging.
 *   - **Titel + reiner Textvergleich** (Zeicheninhalt muss zu ≥ 80 % wieder
 *     auftauchen) fasst zu wenig zusammen. An echtem Material sank der
 *     Aufblähungsfaktor auf fast 1,0 — Aufbauschritte brechen Zeilen beim
 *     Rendern oft anders um, sodass exakter Textabgleich sie verpasst.
 *   - **Titel + Positionsabgleich (dieser Ansatz):** PowerPoint verschiebt
 *     bereits sichtbaren Text bei einer Einblendung so gut wie nie — neue
 *     Textboxen kommen hinzu, alte bleiben an ihrer Koordinate stehen. Eine
 *     Zeile gilt daher auch dann als erhalten, wenn ihr Text auf der
 *     späteren Seite an (fast) derselben Position wiederkehrt, selbst wenn
 *     sich der exakte Zeilenumbruch geändert hat.
 *
 * Die Positionsprüfung ist eine Ergänzung, kein Ersatz für den Textvergleich:
 * Sie lockert nur, WIE stark der Text übereinstimmen muss, wenn die Position
 * passt — verlangt aber weiterhin echte Textähnlichkeit. Das verhindert den
 * Rückfall in den ersten (zu losen) Ansatz: Folien, die zufällig dasselbe
 * Layout-Template nutzen (z. B. "Types of Financial Intermediaries", drei
 * inhaltlich verschiedene Folien mit identischem Titel bei Money & Banking),
 * haben an der Template-Position jeweils *anderen* Text — das Positionssignal
 * allein reicht nicht, es zählt nur zusammen mit Textähnlichkeit.
 */

/**
 * Anteil der Zeilen der früheren Seite, der in der späteren wieder vorkommen
 * muss. Nicht 1,0, weil Aufbauschritte gelegentlich eine Zeile umformulieren
 * oder ein Platzhalter verschwindet.
 */
const CONTAINMENT_THRESHOLD = 0.7

/** Kürzere Zeilen sind zu unspezifisch für einen verlässlichen Vergleich. */
const MIN_COMPARABLE_LENGTH = 4

/**
 * Toleranz beim Positionsvergleich, in PDF-Punkten. Enger als locker nötig,
 * weil dieselbe Textbox beim Nachrendern praktisch pixelgleich bleibt —
 * anders als bei einer neuen Folie, deren Inhalt zufällig an ähnlicher
 * Stelle beginnt.
 */
const Y_POSITION_TOLERANCE = 3
const X_POSITION_TOLERANCE = 5

/**
 * Wie groß der gemeinsame Textanteil zweier Zeilen mindestens sein muss,
 * damit eine Positionsübereinstimmung als "derselbe Inhalt" zählt statt als
 * Zufallstreffer desselben Layout-Slots.
 */
const POSITION_TEXT_OVERLAP = 0.5

/** Unterhalb dieser Zeichenzahl gilt eine Seite als inhaltsleer. */
const SPARSE_CHARS = 60

/**
 * Teilen sich zwei normalisierte Texte einen wesentlichen Anteil? Erkennt
 * sowohl exakte Übereinstimmung als auch "später wurde eine Zeile leicht
 * gekürzt/erweitert" — beides kommt bei Aufbauschritten vor.
 */
function textsOverlap(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (!longer.includes(shorter)) return false
  return shorter.length / longer.length >= POSITION_TEXT_OVERLAP
}

/**
 * Ist `line` (von der früheren Seite) auf der späteren Seite erhalten
 * geblieben? Zwei Wege dorthin: exakter Textmatch irgendwo auf der Seite
 * (Inhalt kann sich verschoben haben), oder eine Zeile an (fast) derselben
 * Position mit überlappendem Text (Inhalt blieb stehen, Umbruch änderte sich).
 */
function linePersists(line: BodyLine, key: string, later: BodyLine[]): boolean {
  for (const candidate of later) {
    const candidateKey = normalizeForCompare(candidate.text)
    if (candidateKey.length < MIN_COMPARABLE_LENGTH) continue
    if (candidateKey === key) return true

    const samePosition =
      Math.abs(line.y - candidate.y) <= Y_POSITION_TOLERANCE &&
      Math.abs(line.x - candidate.x) <= X_POSITION_TOLERANCE
    if (samePosition && textsOverlap(key, candidateKey)) return true
  }
  return false
}

/**
 * Ist `later` ein Aufbauschritt von `earlier`?
 *
 * Bedingung: Der Inhalt von `earlier` taucht in `later` praktisch vollständig
 * wieder auf — entweder textlich (irgendwo auf der Seite) oder positionell
 * (an derselben Stelle, mit überlappendem Text). Das trennt "Inhalt wurde
 * ergänzt" (Animation) von "Inhalt wurde ersetzt" (neue Folie, gleicher
 * Titel).
 */
export function isBuildStep(earlier: BodyLine[], later: BodyLine[]): boolean {
  const comparable = earlier.filter(
    (line) => normalizeForCompare(line.text).length >= MIN_COMPARABLE_LENGTH,
  )

  // Eine leere Vorgängerseite (nur Titel) ist der Startpunkt eines Aufbaus.
  if (comparable.length === 0) return true

  let retained = 0
  for (const line of comparable) {
    const key = normalizeForCompare(line.text)
    if (linePersists(line, key, later)) retained++
  }
  return retained / comparable.length >= CONTAINMENT_THRESHOLD
}

/**
 * Ist die Seite eine Kapitel-Trennfolie? Typisch: sehr wenig Text, oft nur
 * eine Nummer oder ein kurzer Kapitelname (Money & Banking nutzt das).
 */
export function isDividerPage(page: Page, bodyLines: BodyLine[]): boolean {
  const chars = bodyLines.map((l) => l.text).join(' ').length
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
  bodyLinesByPage: Map<number, BodyLine[]>,
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
      previous.chars = body.map((l) => l.text).join(' ').length
    } else {
      slides.push({
        pageNumbers: [page.number],
        title: page.title,
        bodyLines: body,
        isDivider: divider,
        chars: body.map((l) => l.text).join(' ').length,
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
  const consider = (text: string) => {
    const key = normalizeForCompare(text)
    if (key.length < MIN_COMPARABLE_LENGTH) return
    if (seen.has(key)) return
    seen.add(key)
    total += text.length
  }
  for (const slide of slides) {
    consider(slide.title)
    for (const line of slide.bodyLines) consider(line.text)
  }
  return total
}
