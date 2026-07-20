import { describe, expect, it } from 'vitest'
import { bodyLinesOf, findRepeatingLines } from '../../src/ingest/extract'
import type { Line, Page } from '../../src/ingest/types'

/**
 * Wie im echten Material: die Foliennummer ist ohne Leerzeichen an das
 * nächste Wort angehängt (`"19March 16, 2026Prof. Dr. …"`), weil pdf.js die
 * beiden Textfragmente ohne Trennzeichen zusammensetzt.
 */
function footerLine(pageNumber: number): Line {
  return { text: `${pageNumber}March 16, 2026Prof. Dr. Priscilla Kraft`, size: 8, x: 27, y: 18.7 }
}

function page(number: number, title: string, bodyLines: Line[]): Page {
  return {
    number,
    title,
    lines: [...bodyLines, footerLine(number)],
    bodyLines: [],
    width: 720,
    height: 540,
  }
}

describe('findRepeatingLines + bodyLinesOf: Foliennummer in der Fußzeile', () => {
  it('erkennt eine Fußzeile mit eingebetteter, wechselnder Foliennummer als wiederkehrend', () => {
    const pages = [
      page(1, 'Intro', [{ text: 'Erster Punkt zur Einführung', size: 18, x: 70, y: 300 }]),
      page(2, 'Kapitel 1', [{ text: 'Zweiter inhaltlicher Punkt', size: 18, x: 70, y: 300 }]),
      page(3, 'Kapitel 2', [{ text: 'Dritter inhaltlicher Punkt', size: 18, x: 70, y: 300 }]),
      page(4, 'Kapitel 3', [{ text: 'Vierter inhaltlicher Punkt', size: 18, x: 70, y: 300 }]),
    ]
    const repeating = findRepeatingLines(pages)

    for (const p of pages) {
      const body = bodyLinesOf(p, repeating)
      expect(body.map((l) => l.text)).not.toContain(p.lines.at(-1)!.text)
    }
  })

  it('behandelt eine nummerierte Aufzählungszeile nicht als Fußzeile, nur weil sie mit einer Ziffer beginnt', () => {
    const pages = [
      page(1, 'Agenda', [{ text: '1 Introduction to the topic', size: 18, x: 70, y: 300 }]),
      page(2, 'Kapitel 1', [{ text: 'Ein anderer Punkt', size: 18, x: 70, y: 300 }]),
      page(3, 'Kapitel 2', [{ text: 'Noch ein Punkt', size: 18, x: 70, y: 300 }]),
      page(4, 'Kapitel 3', [{ text: 'Und noch einer', size: 18, x: 70, y: 300 }]),
    ]
    const repeating = findRepeatingLines(pages)

    const body = bodyLinesOf(pages[0]!, repeating)
    expect(body.map((l) => l.text)).toContain('1 Introduction to the topic')
  })
})
