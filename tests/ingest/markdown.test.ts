import { describe, expect, it } from 'vitest'
import { extractMarkdownDocument, parseMarkdownSections } from '../../src/ingest/markdown'

describe('parseMarkdownSections', () => {
  it('zerlegt Überschriften unterschiedlicher Ebene korrekt', () => {
    const text = ['# Chapter One', 'Intro-Zeile', '## Section 1.1', 'Detail A', 'Detail B', '# Chapter Two', 'Text 2'].join('\n')

    const sections = parseMarkdownSections(text)

    expect(sections.map((s) => [s.level, s.title])).toEqual([
      [0, ''],
      [1, 'Chapter One'],
      [2, 'Section 1.1'],
      [1, 'Chapter Two'],
    ])
    expect(sections[1]!.bodyLines).toEqual(['Intro-Zeile'])
    expect(sections[2]!.bodyLines).toEqual(['Detail A', 'Detail B'])
  })

  it('entfernt eine optionale schließende ATX-Raute ("## Titel ##" -> "Titel")', () => {
    const sections = parseMarkdownSections('## Titel ##\nText')
    expect(sections[1]!.title).toBe('Titel')
  })

  it('behandelt Text ohne jede Überschrift als reinen Platzhalter-Abschnitt (level 0)', () => {
    const sections = parseMarkdownSections('Nur ein Absatz.\nNoch einer.')
    expect(sections).toHaveLength(1)
    expect(sections[0]!.level).toBe(0)
    expect(sections[0]!.bodyLines).toEqual(['Nur ein Absatz.', 'Noch einer.'])
  })
})

describe('extractMarkdownDocument', () => {
  it('baut aus einer strukturierten Markdown-Datei zwei Kapitel mit Unterabschnitten', async () => {
    const text = [
      '# Consumer Theory',
      'Kurze Einleitung.',
      '## Utility',
      'Nutzenfunktionen.',
      '## Budget Constraint',
      'Budgetgerade.',
      '# Producer Theory',
      'Angebot und Nachfrage.',
    ].join('\n')

    const doc = await extractMarkdownDocument(text, 'Zusammenfassung.md')

    expect(doc.chapters.map((c) => c.title)).toEqual(['Consumer Theory', 'Producer Theory'])
    expect(doc.chapters[0]!.slides.map((s) => s.title)).toEqual(['Consumer Theory', 'Utility', 'Budget Constraint'])
    expect(doc.slideCount).toBe(4)
    expect(doc.uniqueChars).toBeGreaterThan(0)
    expect(doc.diagnostics.buildGroups).toBe(0)
  })

  it('fällt für reinen Fließtext ohne jede Überschrift auf den Dateinamen als einziges Kapitel zurück', async () => {
    const doc = await extractMarkdownDocument('Nur Fließtext, keine Struktur erkennbar.', 'Meine Notizen.md')
    expect(doc.chapters).toHaveLength(1)
    expect(doc.chapters[0]!.title).toBe('Meine Notizen')
  })

  it('liefert ein leeres Dokument für eine leere Datei, ohne zu werfen', async () => {
    const doc = await extractMarkdownDocument('', 'Leer.md')
    expect(doc.chapters).toEqual([])
    expect(doc.slideCount).toBe(0)
  })
})
