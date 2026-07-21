import { describe, expect, it } from 'vitest'
import { itemsToLines } from '../../src/ingest/extract'
import type { TextItem } from '../../src/ingest/types'

/** Baut ein TextItem mit sinnvollen Defaults — nur die relevanten Felder je Test angeben. */
function item(overrides: Partial<TextItem> & { text: string; x: number }): TextItem {
  return { size: 18, y: 300, width: overrides.text.length * 9, ...overrides }
}

describe('itemsToLines — Fragmente ohne Lücke', () => {
  it('setzt unmittelbar aneinanderstoßende Fragmente ohne Leerzeichen zusammen', () => {
    // "𝑚𝑚" (doppelt, PowerPoint-Fettdruck) direkt nach "is denoted by", ohne Lücke dazwischen.
    const items = [
      item({ text: 'is denoted by', x: 234.0, width: 103.19 }),
      item({ text: '𝑚𝑚', x: 340.8, width: 15.08 }),
    ]
    expect(itemsToLines(items).map((l) => l.text)).toEqual(['is denoted by 𝑚'])
  })
})

describe('itemsToLines — fehlende Leerzeichen an Schriftwechseln (echtes Material, Consumer Theory)', () => {
  it('fügt ein Leerzeichen ein, wenn eine echte Lücke zwischen zwei Fragmenten besteht', () => {
    // "The consumer's budget" + "is denoted by" — reale Werte aus 02 Consumer Theory 01.pdf, Seite 4.
    const items = [
      item({ text: "The consumer's budget", x: 39.7, width: 190.72 }),
      item({ text: 'is denoted by', x: 234.0, width: 103.19 }),
    ]
    expect(itemsToLines(items).map((l) => l.text)).toEqual(["The consumer's budget is denoted by"])
  })

  it('fügt kein Leerzeichen bei einem verschwindend kleinen Zwischenraum ein (Schriftwechsel mitten im Wort)', () => {
    const items = [
      item({ text: 'A', x: 39.7, width: 10.6 }),
      // Zwischenraum ≈ 0 — echter Schriftwechsel ohne Lücke, kein neues Wort.
      item({ text: 'consumption bundle', x: 53.9, width: 169.74 }),
    ]
    // Hier besteht real eine Lücke (53.9 - (39.7+10.6) = 3.6, deutlich über der Schwelle) —
    // zur Kontrolle desselben Prinzips mit einem echten Nulldurchgang:
    const touching = [
      item({ text: 'foo', x: 0, width: 30 }),
      item({ text: 'bar', x: 30, width: 30 }), // direkt anschließend, kein Zwischenraum
    ]
    expect(itemsToLines(touching).map((l) => l.text)).toEqual(['foobar'])
    expect(itemsToLines(items).map((l) => l.text)).toEqual(['A consumption bundle'])
  })
})

describe('itemsToLines — Tiefstellung (Index unterhalb der Bezugszeile)', () => {
  it('hängt einen einzelnen tiefgestellten Index an seine Bezugszeile an, ohne eigene Zeile', () => {
    // "𝑥₁ units of commodity 1" — reale Werte aus 02 Consumer Theory 01.pdf, Seite 4.
    const items = [
      item({ text: '𝑥𝑥', x: 75.7, y: 237.5, size: 18, width: 9.58 }),
      item({ text: '1', x: 85.3, y: 233.1, size: 12, width: 6.65 }), // Index, kleinere Schrift, leicht versetzt
      item({ text: 'units of commodity 1', x: 95.5, y: 237.5, size: 18, width: 162.83 }),
    ]
    const lines = itemsToLines(items)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('𝑥1 units of commodity 1')
  })

  it('verteilt mehrere Indizes einer Formelzeile korrekt an die jeweils zugehörige Basis', () => {
    // "(𝑥₁, 𝑥₂, . . . , 𝑥ₙ)" — reale Werte aus 02 Consumer Theory 01.pdf, Seite 4.
    const items = [
      item({ text: '(', x: 387.5, y: 178.6, size: 18, width: 7.47 }),
      item({ text: '𝑥𝑥', x: 395.0, y: 178.6, size: 18, width: 9.58 }),
      item({ text: '1', x: 404.6, y: 174.1, size: 12, width: 6.65 }),
      item({ text: ',', x: 411.2, y: 178.6, size: 18, width: 3.69 }),
      item({ text: '𝑥𝑥', x: 417.9, y: 178.6, size: 18, width: 9.58 }),
      item({ text: '2', x: 427.5, y: 174.1, size: 12, width: 6.65 }),
      item({ text: ', . . . ,', x: 434.2, y: 178.6, size: 18, width: 30.67 }),
      item({ text: '𝑥𝑥', x: 467.9, y: 178.6, size: 18, width: 9.58 }),
      item({ text: '𝑛𝑛', x: 477.6, y: 174.1, size: 12, width: 6.89 }),
      item({ text: ')', x: 484.8, y: 178.6, size: 18, width: 7.47 }),
    ]
    const lines = itemsToLines(items)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('(𝑥1, 𝑥2, . . . , 𝑥𝑛)')
  })

  it('behält die Schriftgröße und Grundlinie der Bezugszeile, nicht die des Index', () => {
    const items = [
      item({ text: '𝑥𝑥', x: 75.7, y: 237.5, size: 18, width: 9.58 }),
      item({ text: '1', x: 85.3, y: 233.1, size: 12, width: 6.65 }),
    ]
    const [line] = itemsToLines(items)
    expect(line!.size).toBe(18)
    expect(line!.y).toBe(237.5)
  })
})

describe('itemsToLines — Hochstellung (Index oberhalb der nachfolgenden Bezugszeile)', () => {
  it('hängt einen hochgestellten Index an die nachfolgende Zeile an', () => {
    // Hochstellung steht in Lesereihenfolge VOR ihrer Bezugszeile (höhere y-Koordinate zuerst).
    const items = [
      item({ text: '2', x: 85.3, y: 241.9, size: 12, width: 6.65 }), // Exponent, über der Bezugszeile
      item({ text: '𝑥𝑥', x: 75.7, y: 237.5, size: 18, width: 9.58 }),
      item({ text: 'is the square', x: 95.5, y: 237.5, size: 18, width: 120 }),
    ]
    const lines = itemsToLines(items)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.text).toBe('𝑥2 is the square')
  })
})

describe('itemsToLines — keine Fehlalarme', () => {
  it('behandelt zwei normale Textzeilen unterschiedlicher Höhe weiterhin als getrennte Zeilen', () => {
    const items = [
      item({ text: 'Erste Zeile', x: 20, y: 300, size: 18, width: 90 }),
      item({ text: 'Zweite Zeile', x: 20, y: 270, size: 18, width: 90 }), // deutlicher Abstand, gleiche Schriftgröße
    ]
    const lines = itemsToLines(items)
    expect(lines.map((l) => l.text)).toEqual(['Erste Zeile', 'Zweite Zeile'])
  })

  it('verschmilzt eine kleinere Fußzeile nicht mit dem Fließtext, wenn der Abstand zu groß ist', () => {
    const items = [
      item({ text: 'Letzter Inhaltsabsatz', x: 20, y: 100, size: 18, width: 150 }),
      item({ text: '22 2024 Prof. Rilke', x: 20, y: 21.9, size: 9.96, width: 100 }), // weit entfernte Fußzeile
    ]
    const lines = itemsToLines(items)
    expect(lines).toHaveLength(2)
  })
})
