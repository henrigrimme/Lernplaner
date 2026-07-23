import { describe, expect, it } from 'vitest'
import { chapterNameFromFilename, detectChapters, detectChaptersFromSlides } from '../../src/ingest/chapters'
import type { BodyLine, Page, Slide } from '../../src/ingest/types'

function page(number: number, title: string): Page {
  return { number, title, lines: [], bodyLines: [], width: 720, height: 540 }
}

function slide(pageNumbers: number[], title: string, isDivider = false): Slide {
  return { pageNumbers, title, bodyLines: [], isDivider, chars: 100 }
}

function bl(text: string, x: number, y: number, size: number): BodyLine {
  return { text, x, y, size }
}

describe('detectChapters — Untertitel-Signal', () => {
  it('erkennt Kapitel aus einer wiederkehrenden Untertitelzeile an fester Position', () => {
    const pages = [1, 2, 3, 4, 5, 6].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [bl('Chapter A', 100, 447, 18), bl('Erster Punkt', 100, 400, 14)]],
      [2, [bl('Chapter A', 100, 447, 18), bl('Zweiter Punkt', 100, 400, 14)]],
      [3, [bl('Chapter A', 100, 447, 18), bl('Dritter Punkt', 100, 400, 14)]],
      [4, [bl('Chapter B', 100, 447, 18), bl('Vierter Punkt', 100, 400, 14)]],
      [5, [bl('Chapter B', 100, 447, 18), bl('Fünfter Punkt', 100, 400, 14)]],
      [6, [bl('Chapter B', 100, 447, 18), bl('Sechster Punkt', 100, 400, 14)]],
    ])
    const slides = [1, 2, 3, 4, 5, 6].map((n) => slide([n], `Folie ${n}`))

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters.map((c) => c.title)).toEqual(['Chapter A', 'Chapter B'])
    expect(chapters[0]!.source).toBe('subtitle')
    expect(chapters[0]!.slides).toHaveLength(3)
    expect(chapters[1]!.slides).toHaveLength(3)
  })

  it('verwirft eine Position, an der fast jeder Wert nur einmal vorkommt (normaler Fließtext, kein Kapitelname)', () => {
    const pages = [1, 2, 3, 4].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [bl('Ganz eigener Satz eins', 100, 419, 18)]],
      [2, [bl('Völlig anderer Satz zwei', 100, 419, 18)]],
      [3, [bl('Wieder ein anderer Satz drei', 100, 419, 18)]],
      [4, [bl('Und noch ein Satz vier', 100, 419, 18)]],
    ])
    const slides = [1, 2, 3, 4].map((n) => slide([n], `Folie ${n}`))

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'Session 3.pdf')

    // Fällt auf den Dateinamen zurück, weil an dieser Position kein Name wiederkehrt.
    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.source).toBe('filename')
    expect(chapters[0]!.title).toBe('Session 3')
  })
})

describe('detectChapters — Fuzzy-Zusammenführung', () => {
  it('führt Singular/Plural- und Bindestrich-Varianten zusammen', () => {
    const pages = [1, 2, 3, 4].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [bl('Consumer Theory - Budget Constraint', 100, 447, 18)]],
      [2, [bl('Consumer Theory – Budget Constraint', 100, 447, 18)]],
      [3, [bl('Consumer Theory - Budget Constraints', 100, 447, 18)]],
      [4, [bl('Consumer Theory - Budget Constraints', 100, 447, 18)]],
    ])
    const slides = [1, 2, 3, 4].map((n) => slide([n], `Folie ${n}`))

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.slides).toHaveLength(4)
  })

  it('führt mittige Einfügungen zusammen ("Market Structure" vs. "Market Structures")', () => {
    const pages = [1, 2, 3, 4].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [bl('Market Structure - Oligopoly', 100, 447, 18)]],
      [2, [bl('Market Structures - Oligopoly', 100, 447, 18)]],
      [3, [bl('Market Structure - Oligopoly', 100, 447, 18)]],
      [4, [bl('Market Structures - Oligopoly', 100, 447, 18)]],
    ])
    const slides = [1, 2, 3, 4].map((n) => slide([n], `Folie ${n}`))

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters).toHaveLength(1)
  })

  it('verschmilzt kurze, aber inhaltlich verschiedene Namen NICHT', () => {
    const pages = [1, 2, 3, 4].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>([
      [1, [bl('Chapter 5', 100, 447, 18)]],
      [2, [bl('Chapter 5', 100, 447, 18)]],
      [3, [bl('Chapter 6', 100, 447, 18)]],
      [4, [bl('Chapter 6', 100, 447, 18)]],
    ])
    const slides = [1, 2, 3, 4].map((n) => slide([n], `Folie ${n}`))

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters.map((c) => c.title)).toEqual(['Chapter 5', 'Chapter 6'])
  })
})

describe('detectChapters — Trennfolien-Signal', () => {
  it('nutzt den Titel der nächsten benannten Trennfolie, wenn eine nummerierte davorsteht', () => {
    const pages = [1, 2, 3, 4, 5].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>()
    const slides = [
      slide([1], '1', true),
      slide([2], 'Financial & Economic Development', true),
      slide([3], 'Inhalt A'),
      slide([4], 'Inhalt B'),
      slide([5], 'Inhalt C'),
    ]

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.title).toBe('Financial & Economic Development')
    expect(chapters[0]!.slides).toHaveLength(3)
  })

  it('erzeugt "Kapitel N" für eine nummerierte Trennfolie ohne folgenden Namen, statt den vorigen Kapitelnamen weiterlaufen zu lassen', () => {
    const pages = [1, 2, 3, 4, 5, 6].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>()
    const slides = [
      slide([1], '1', true),
      slide([2], 'Financial & Economic Development', true),
      slide([3], 'Inhalt A'),
      slide([4], '2', true),
      slide([5], 'Inhalt B'),
      slide([6], 'Inhalt C'),
    ]

    const chapters = detectChapters(pages, bodyLinesByPage, slides, 'irrelevant.pdf')

    expect(chapters.map((c) => c.title)).toEqual(['Financial & Economic Development', 'Kapitel 2'])
  })
})

describe('detectChapters — Dateiname-Rückfall', () => {
  it('leitet das Kapitel aus dem Dateinamen ab, wenn weder Untertitel noch Trennfolien vorhanden sind', () => {
    const pages = [1, 2].map((n) => page(n, `Folie ${n}`))
    const bodyLinesByPage = new Map<number, BodyLine[]>()
    const slides = [slide([1], 'Folie 1'), slide([2], 'Folie 2')]

    const chapters = detectChapters(pages, bodyLinesByPage, slides, '02 Consumer Theory 01.pdf')

    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.title).toBe('Consumer Theory 01')
    expect(chapters[0]!.source).toBe('filename')
  })
})

describe('chapterNameFromFilename', () => {
  it('entfernt Nummerierungspräfix und Dateiendung für jedes unterstützte Format', () => {
    expect(chapterNameFromFilename('02 Consumer Theory 01.pdf')).toBe('Consumer Theory 01')
    expect(chapterNameFromFilename('02 Consumer Theory 01.docx')).toBe('Consumer Theory 01')
    expect(chapterNameFromFilename('02 Consumer Theory 01.pptx')).toBe('Consumer Theory 01')
    expect(chapterNameFromFilename('02 Consumer Theory 01.md')).toBe('Consumer Theory 01')
    expect(chapterNameFromFilename('02 Consumer Theory 01.markdown')).toBe('Consumer Theory 01')
  })
})

/**
 * `detectChaptersFromSlides` ist der PDF-unabhängige Rest von
 * `detectChapters` (Trennfolie → Dateiname → kein Signal), den
 * `ingest/pptx.ts` für echte PowerPoint-Trennfolien wiederverwendet — der
 * Untertitel-Weg (`detectSubtitleChapters`) fehlt hier bewusst, weil er
 * PDF-Positionsdaten braucht, die es bei PowerPoint-Folien in dieser Form
 * nicht gibt.
 */
describe('detectChaptersFromSlides', () => {
  it('erkennt Trennfolien identisch zu detectChapters, ohne Page[]/Positionsdaten zu brauchen', () => {
    const slides = [
      slide([1], 'Chapter One', true),
      slide([2], 'Inhalt A'),
      slide([3], 'Chapter Two', true),
      slide([4], 'Inhalt B'),
    ]

    const chapters = detectChaptersFromSlides(slides, 'irrelevant.pptx')

    expect(chapters.map((c) => c.title)).toEqual(['Chapter One', 'Chapter Two'])
    expect(chapters.every((c) => c.source === 'divider')).toBe(true)
  })

  it('fällt ohne Trennfolie auf den Dateinamen zurück', () => {
    const slides = [slide([1], 'Folie 1'), slide([2], 'Folie 2')]
    const chapters = detectChaptersFromSlides(slides, 'Session 3.pptx')
    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.title).toBe('Session 3')
    expect(chapters[0]!.source).toBe('filename')
  })
})
