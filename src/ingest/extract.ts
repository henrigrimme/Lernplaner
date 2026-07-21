import type { BodyLine, Line, Page, TextItem } from './types'

/**
 * PDF-Seiten in Zeilen zerlegen.
 *
 * pdf.js liefert Textfragmente einzeln, nicht als Zeilen — ein einzelnes
 * Wort kann über mehrere Fragmente verteilt sein, wenn sich die Schriftart
 * ändert. Wir gruppieren nach Grundlinie und setzen die Fragmente in
 * x-Reihenfolge zusammen.
 */

/** Fragmente auf derselben Grundlinie gelten als eine Zeile. */
const BASELINE_TOLERANCE = 2.5

/**
 * Hoch-/Tiefstellung (Formel-Indizes) erkennen: deutlich kleinere Schrift
 * als die Bezugszeile (ROADMAP.md Phase 4 „Formelextraktion sauber" —
 * siehe CONTEXT.md Abschnitt 4 „Formelextraktion ist unsauber", „Indizes
 * lösen sich von der Basis"). PowerPoint exportiert einen Index wie 𝑥₁ als
 * zwei Textfragmente auf unterschiedlicher Grundlinie ("𝑥" auf der
 * Hauptzeile, "1" leicht versetzt, kleinere Schrift) — pdf.js liefert
 * beide einzeln, ohne Zusammenhang.
 */
const SUBSCRIPT_SIZE_RATIO = 0.85
/** Wie weit sich die Grundlinie eines Index verschieben darf, als Anteil der Bezugsschriftgröße. */
const SUBSCRIPT_Y_TOLERANCE = 0.6

/**
 * Ab welcher Fragmentlücke ein Leerzeichen eingefügt wird (Anteil der
 * Schriftgröße plus Mindestwert) — pdf.js trennt ein Wort manchmal an
 * Schriftwechseln (Fett/Kursiv, Formelzeichen) in mehrere Fragmente OHNE
 * ein Leerzeichen-Fragment dazwischen, obwohl visuell eine echte Lücke
 * besteht (siehe CONTEXT.md Abschnitt 4 „Wortabstände fehlen an
 * Schriftwechseln"). Werte an echtem Material (Consumer-Theory-Folien)
 * kalibriert: reale Wortlücken lagen bei ~15–25 % der Schriftgröße,
 * echte Zeichen-an-Zeichen-Übergänge (auch über Fett/Formel-Grenzen) bei
 * praktisch 0.
 */
const SPACE_GAP_RATIO = 0.15
const MIN_SPACE_GAP = 1.5

/** Der Titel steht im oberen Seitendrittel. */
const TITLE_ZONE_FROM_TOP = 0.34

/** Toleranz beim Vergleich der Schriftgröße für die Titelerkennung. */
const TITLE_SIZE_TOLERANCE = 0.6

/**
 * PowerPoint zeichnet Formelzeichen doppelt übereinander, um Fettdruck zu
 * simulieren. In der Extraktion erscheinen sie als verdoppelte Zeichen
 * (`𝑢𝑢(𝑥𝑥)` statt `u(x)`). Betroffen sind die mathematischen
 * Unicode-Alphabete.
 */
const MATH_ALPHANUMERIC = /[\u{1D400}-\u{1D7FF}]/u

function collapseDoubledMathChars(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const cp = text.codePointAt(i)!
    const ch = String.fromCodePoint(cp)
    const width = ch.length
    const next = text.slice(i + width, i + width * 2)
    if (MATH_ALPHANUMERIC.test(ch) && next === ch) {
      out += ch
      i += width * 2
    } else {
      out += ch
      i += width
    }
  }
  return out
}

/** Mehrfache Leerzeichen zusammenziehen und Ränder trimmen. */
export function tidy(text: string): string {
  return collapseDoubledMathChars(text).replace(/\s+/g, ' ').trim()
}

/**
 * Für Vergleiche normalisieren: Kleinschreibung, nur Buchstaben und Ziffern.
 * Fängt uneinheitliche Bindestriche (- vs. –), Interpunktion und
 * Abstandsartefakte ab.
 */
export function normalizeForCompare(text: string): string {
  return collapseDoubledMathChars(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

interface Bucket {
  items: TextItem[]
  /** Grundlinie der Bezugszeile — bleibt beim Anhängen von Indizes unverändert. */
  y: number
  /** Größte Schriftgröße der Bezugszeile — bleibt beim Anhängen von Indizes unverändert. */
  maxSize: number
}

/** Fragmente nach Grundlinie bucketen (Rohgruppierung, vor der Index-Zusammenführung). */
function bucketByBaseline(items: TextItem[]): Bucket[] {
  const buckets: Bucket[] = []
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const last = buckets[buckets.length - 1]
    if (last && Math.abs(last.y - item.y) <= BASELINE_TOLERANCE) {
      last.items.push(item)
      last.maxSize = Math.max(last.maxSize, item.size)
    } else {
      buckets.push({ items: [item], y: item.y, maxSize: item.size })
    }
  }
  return buckets
}

/** Gilt `small` als Hoch-/Tiefstellung von `ref` (deutlich kleinere Schrift, nahe Grundlinie)? */
function looksLikeScriptOf(small: Bucket, ref: Bucket): boolean {
  return (
    small.maxSize <= ref.maxSize * SUBSCRIPT_SIZE_RATIO &&
    Math.abs(small.y - ref.y) <= ref.maxSize * SUBSCRIPT_Y_TOLERANCE
  )
}

/**
 * Index-Buckets (Hoch-/Tiefstellungen) an ihre Bezugszeile anhängen, statt
 * sie als eigene Zeile zu behandeln. Ein Index kann sowohl unterhalb
 * (tiefgestellt, spätere Grundlinie in Lesereihenfolge) als auch oberhalb
 * (hochgestellt, frühere Grundlinie) seiner Bezugszeile stehen — deshalb
 * werden beide Nachbarn im sortierten Bucket-Array geprüft, nicht nur der
 * vorige.
 */
function mergeScriptBuckets(buckets: Bucket[]): Bucket[] {
  const mergedInto = new Map<number, number>()

  for (let i = 0; i < buckets.length; i++) {
    const prev: Bucket | null = i > 0 && !mergedInto.has(i - 1) ? buckets[i - 1]! : null
    const next: Bucket | null = i < buckets.length - 1 ? buckets[i + 1]! : null
    const prevOk = prev !== null && looksLikeScriptOf(buckets[i]!, prev)
    const nextOk = next !== null && looksLikeScriptOf(buckets[i]!, next)
    if (!prevOk && !nextOk) continue

    const targetIdx =
      prevOk && nextOk
        ? Math.abs(buckets[i]!.y - prev!.y) <= Math.abs(buckets[i]!.y - next!.y)
          ? i - 1
          : i + 1
        : prevOk
          ? i - 1
          : i + 1
    mergedInto.set(i, targetIdx)
  }

  const result: Bucket[] = []
  for (let i = 0; i < buckets.length; i++) {
    if (mergedInto.has(i)) continue
    const items = [...buckets[i]!.items]
    for (const [smallIdx, targetIdx] of mergedInto) {
      if (targetIdx === i) items.push(...buckets[smallIdx]!.items)
    }
    result.push({ items, y: buckets[i]!.y, maxSize: buckets[i]!.maxSize })
  }
  return result
}

/**
 * Fragmente einer Zeile zusammensetzen, mit Leerzeichen an echten Lücken.
 * pdf.js liefert vorhandene Leerzeichen meist als eigene Fragmente mit,
 * trennt ein Wort an Schriftwechseln aber gelegentlich OHNE eines (siehe
 * `SPACE_GAP_RATIO`-Kommentar) — deshalb zusätzlich über die x-Lücke
 * zwischen einem Fragmentende und dem nächsten Fragmentanfang geprüft.
 */
function joinWithGaps(ordered: TextItem[]): string {
  let text = ''
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i]!
    if (i > 0) {
      const prev = ordered[i - 1]!
      const gap = item.x - (prev.x + prev.width)
      const threshold = Math.max(MIN_SPACE_GAP, SPACE_GAP_RATIO * Math.max(prev.size, item.size))
      if (gap > threshold) text += ' '
    }
    text += item.text
  }
  return text
}

/** Fragmente einer Seite zu Zeilen gruppieren. */
export function itemsToLines(items: TextItem[]): Line[] {
  const usable = items.filter((it) => it.text.trim().length > 0)
  if (usable.length === 0) return []

  const buckets = mergeScriptBuckets(bucketByBaseline(usable))

  return buckets
    .map((bucket) => {
      const ordered = [...bucket.items].sort((a, b) => a.x - b.x)
      const text = tidy(joinWithGaps(ordered))
      return {
        text,
        size: bucket.maxSize,
        y: bucket.y,
        x: ordered[0]!.x,
      }
    })
    .filter((line) => line.text.length > 0)
}

/**
 * Titel einer Seite bestimmen: die Zeilen mit der größten Schrift im oberen
 * Seitendrittel. Über drei getestete Fächer erreicht das 85–98 % Trefferquote.
 */
export function detectTitle(lines: Line[], pageHeight: number): string {
  const threshold = pageHeight * (1 - TITLE_ZONE_FROM_TOP)
  const upper = lines.filter((l) => l.y >= threshold)
  if (upper.length === 0) return ''

  const maxSize = Math.max(...upper.map((l) => l.size))
  return tidy(
    upper
      .filter((l) => l.size >= maxSize - TITLE_SIZE_TOLERANCE)
      .map((l) => l.text)
      .join(' '),
  )
}

/**
 * Entfernt die eigene Foliennummer vom Zeilenanfang, falls vorhanden
 * (Fußzeilenreste wie "44 2024 Prof. …", teils ohne Leerzeichen dahinter:
 * "19March 16, 2026Prof. …"). Verglichen wird die tatsächliche Seitenzahl,
 * nicht irgendeine Ziffernfolge — sonst würden nummerierte Aufzählungspunkte
 * ("1 Introduction …") fälschlich als Fußzeile behandelt.
 */
function stripOwnPageNumber(text: string, pageNumber: number): string {
  const match = /^(\d{1,3})\s*/.exec(text)
  if (!match || Number(match[1]) !== pageNumber) return text
  return text.slice(match[0].length)
}

/**
 * Kopf- und Fußzeilen erkennen, die auf fast jeder Seite stehen
 * (Dozentenname, Copyright, Foliennummer). Sie verfälschen sonst sowohl den
 * Umfang als auch den Vergleich von Animationsschritten.
 *
 * Eine Fußzeile mit eingebetteter Foliennummer taucht nie zweimal wortgleich
 * auf — jede Seite hat eine andere Nummer. Deshalb wird zusätzlich zur
 * Rohzeile auch die um die eigene Seitenzahl bereinigte Fassung gezählt; nur
 * so lässt sich die Fußzeile als Foliennummer-Rest erkennen.
 */
export function findRepeatingLines(pages: Page[]): Set<string> {
  if (pages.length < 4) return new Set()

  const counts = new Map<string, number>()
  for (const page of pages) {
    // pro Seite nur einmal zählen
    const keysOnPage = new Set<string>()
    for (const line of page.lines) {
      keysOnPage.add(normalizeForCompare(line.text))
      keysOnPage.add(normalizeForCompare(stripOwnPageNumber(line.text, page.number)))
    }
    for (const key of keysOnPage) {
      if (key.length < 6) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const threshold = pages.length * 0.6
  return new Set(
    [...counts.entries()].filter(([, n]) => n >= threshold).map(([key]) => key),
  )
}

/**
 * Inhaltszeilen einer Seite: ohne Titel, ohne wiederkehrende Kopf-/Fußzeilen,
 * ohne reine Zahlen. Behält die Position — Grundlage des Positionsvergleichs
 * bei der Animationsschritt-Erkennung (siehe `isBuildStep` in `slides.ts`).
 */
export function bodyLinesOf(page: Page, repeating: Set<string>): BodyLine[] {
  const titleKey = normalizeForCompare(page.title)
  return page.lines
    .filter((line) => {
      const text = line.text
      const key = normalizeForCompare(text)
      if (key.length === 0) return false
      if (key === titleKey) return false
      if (repeating.has(key)) return false
      if (/^\d{1,3}$/.test(text.trim())) return false
      const strippedKey = normalizeForCompare(stripOwnPageNumber(text, page.number))
      if (strippedKey !== key && repeating.has(strippedKey)) return false
      return true
    })
    .map((line) => ({ text: line.text, x: line.x, y: line.y, size: line.size }))
}
