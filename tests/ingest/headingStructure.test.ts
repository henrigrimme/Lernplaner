import { describe, expect, it } from 'vitest'
import { chaptersFromHeadingSections, genericDiagnostics } from '../../src/ingest/headingStructure'
import type { HeadingSection } from '../../src/ingest/headingStructure'

function section(overrides: Partial<HeadingSection> & { level: number; title: string }): HeadingSection {
  return { bodyLines: [], ...overrides }
}

describe('chaptersFromHeadingSections', () => {
  it('gruppiert nach der flachsten vorkommenden Überschriftsebene, tiefere Ebenen werden zu Folien im Kapitel', () => {
    const sections: HeadingSection[] = [
      section({ level: 1, title: 'Chapter One', bodyLines: ['Intro-Text'] }),
      section({ level: 2, title: 'Section 1.1', bodyLines: ['Inhalt 1.1'] }),
      section({ level: 2, title: 'Section 1.2', bodyLines: ['Inhalt 1.2'] }),
      section({ level: 1, title: 'Chapter Two', bodyLines: ['Inhalt 2'] }),
    ]

    const { chapters } = chaptersFromHeadingSections(sections, 'Skript.docx')

    expect(chapters.map((c) => c.title)).toEqual(['Chapter One', 'Chapter Two'])
    expect(chapters[0]!.slides.map((s) => s.title)).toEqual(['Chapter One', 'Section 1.1', 'Section 1.2'])
    expect(chapters[0]!.source).toBe('heading')
    expect(chapters[1]!.slides.map((s) => s.title)).toEqual(['Chapter Two'])
  })

  it('behandelt Text vor der ersten Überschrift als eigenes, nach dem Dateinamen benanntes Kapitel', () => {
    const sections: HeadingSection[] = [
      section({ level: 0, title: '', bodyLines: ['Einleitender Absatz ohne Überschrift'] }),
      section({ level: 1, title: 'Erstes echtes Kapitel', bodyLines: ['Inhalt'] }),
    ]

    const { chapters } = chaptersFromHeadingSections(sections, '02 Consumer Theory.docx')

    expect(chapters.map((c) => c.title)).toEqual(['Consumer Theory', 'Erstes echtes Kapitel'])
    expect(chapters[0]!.slides).toHaveLength(1)
    expect(chapters[0]!.slides[0]!.bodyLines[0]!.text).toBe('Einleitender Absatz ohne Überschrift')
  })

  it('fällt bei fehlender Überschrift komplett auf den Dateinamen zurück (reiner Fließtext)', () => {
    const sections: HeadingSection[] = [section({ level: 0, title: '', bodyLines: ['Nur Fließtext, keine Gliederung.'] })]

    const { chapters, slides } = chaptersFromHeadingSections(sections, 'Notizen.md')

    expect(chapters).toHaveLength(1)
    expect(chapters[0]!.title).toBe('Notizen')
    expect(chapters[0]!.source).toBe('heading')
    expect(slides).toHaveLength(1)
  })

  it('liefert leere Kapitel-/Folienlisten für ein komplett leeres Dokument', () => {
    const { chapters, slides } = chaptersFromHeadingSections([], 'Leer.md')
    expect(chapters).toEqual([])
    expect(slides).toEqual([])
  })

  it('markiert eine Überschrift ohne eigenen Text als Trennfolie (isDivider)', () => {
    const sections: HeadingSection[] = [
      section({ level: 1, title: 'Teil A', bodyLines: [] }),
      section({ level: 2, title: 'Detail', bodyLines: ['Text'] }),
    ]
    const { slides } = chaptersFromHeadingSections(sections, 'x.md')
    expect(slides[0]!.isDivider).toBe(true)
    expect(slides[1]!.isDivider).toBe(false)
  })
})

describe('genericDiagnostics', () => {
  it('setzt buildGroups/inflation neutral und leitet den Rest aus den Folien ab', () => {
    const { chapters } = chaptersFromHeadingSections(
      [section({ level: 1, title: 'Kapitel', bodyLines: [] })],
      'x.md',
    )
    const diagnostics = genericDiagnostics(chapters[0]!.slides)
    expect(diagnostics.buildGroups).toBe(0)
    expect(diagnostics.inflation).toBe(1)
    expect(diagnostics.dividers).toBe(1)
    expect(diagnostics.titleCoverage).toBe(1)
  })

  it('liefert titleCoverage 0 für keine Folien', () => {
    expect(genericDiagnostics([]).titleCoverage).toBe(0)
  })
})
