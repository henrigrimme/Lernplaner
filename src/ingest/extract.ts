import type { Line, Page, TextItem } from './types'

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

/** Fragmente einer Seite zu Zeilen gruppieren. */
export function itemsToLines(items: TextItem[]): Line[] {
  const usable = items.filter((it) => it.text.trim().length > 0)
  if (usable.length === 0) return []

  const buckets: TextItem[][] = []
  for (const item of [...usable].sort((a, b) => b.y - a.y)) {
    const bucket = buckets[buckets.length - 1]
    const ref = bucket?.[0]
    if (ref && Math.abs(ref.y - item.y) <= BASELINE_TOLERANCE) bucket.push(item)
    else buckets.push([item])
  }

  return buckets
    .map((bucket) => {
      const ordered = [...bucket].sort((a, b) => a.x - b.x)
      // Fragmente ohne Trennzeichen zusammensetzen — pdf.js liefert
      // vorhandene Leerzeichen als eigene Fragmente mit.
      const text = tidy(ordered.map((i) => i.text).join(''))
      return {
        text,
        size: Math.max(...ordered.map((i) => i.size)),
        y: ordered[0]!.y,
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
 * Kopf- und Fußzeilen erkennen, die auf fast jeder Seite stehen
 * (Dozentenname, Copyright, Foliennummer). Sie verfälschen sonst sowohl den
 * Umfang als auch den Vergleich von Animationsschritten.
 */
export function findRepeatingLines(pages: Page[]): Set<string> {
  if (pages.length < 4) return new Set()

  const counts = new Map<string, number>()
  for (const page of pages) {
    // pro Seite nur einmal zählen
    for (const key of new Set(page.lines.map((l) => normalizeForCompare(l.text)))) {
      if (key.length < 6) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const threshold = pages.length * 0.6
  return new Set(
    [...counts.entries()].filter(([, n]) => n >= threshold).map(([key]) => key),
  )
}

/** Fußzeilenreste wie "44 2024 Prof. …" enthalten oft die Foliennummer. */
const PAGE_NUMBER_PREFIX = /^\d{1,3}\s/

/**
 * Inhaltszeilen einer Seite: ohne Titel, ohne wiederkehrende Kopf-/Fußzeilen,
 * ohne reine Zahlen.
 */
export function bodyLinesOf(page: Page, repeating: Set<string>): string[] {
  const titleKey = normalizeForCompare(page.title)
  return page.lines
    .map((l) => l.text)
    .filter((text) => {
      const key = normalizeForCompare(text)
      if (key.length === 0) return false
      if (key === titleKey) return false
      if (repeating.has(key)) return false
      if (/^\d{1,3}$/.test(text.trim())) return false
      if (PAGE_NUMBER_PREFIX.test(text) && repeating.has(
        normalizeForCompare(text.replace(PAGE_NUMBER_PREFIX, '')))) return false
      return true
    })
}
