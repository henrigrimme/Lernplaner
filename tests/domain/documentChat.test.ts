import { describe, expect, it } from 'vitest'
import {
  expandQueryTokens,
  formatExcerptsForPrompt,
  rankPassages,
  tokenize,
  type IndexedPassage,
} from '../../src/domain/documentChat'

function passage(o: Partial<IndexedPassage> & { documentId: number; page: number; text: string }): IndexedPassage {
  return { courseId: 1, courseName: 'Money & Banking', filename: `Doc ${o.documentId}.pdf`, ...o }
}

const CORPUS: IndexedPassage[] = [
  passage({ documentId: 1, page: 3, text: 'Die Zinsstrukturkurve zeigt den Zusammenhang zwischen Laufzeit und Rendite von Anleihen.' }),
  passage({ documentId: 1, page: 4, text: 'Eine inverse Zinsstrukturkurve gilt oft als Vorbote einer Rezession.' }),
  passage({ documentId: 2, page: 1, text: 'Die Duration misst die Zinssensitivität eines Anleiheportfolios.' }),
  passage({ documentId: 3, page: 7, text: 'Marktstrukturen im Mikroökonomie-Kurs: Monopol, Oligopol, vollständige Konkurrenz.', courseId: 2, courseName: 'Micro', filename: 'Micro.pdf' }),
]

describe('tokenize', () => {
  it('senkt Groß-/Kleinschreibung, trennt an Nichtbuchstaben, wirft Stoppwörter und Kurztoken raus', () => {
    expect(tokenize('Die Duration und der Zins!')).toEqual(['duration', 'zins'])
  })
})

describe('expandQueryTokens', () => {
  it('ergänzt englische Fachbegriffe zu deutschen Frage-Token', () => {
    const expanded = expandQueryTokens(['zinsstrukturkurve'])
    expect(expanded).toContain('zinsstrukturkurve')
    expect(expanded).toEqual(expect.arrayContaining(['yield', 'curve']))
  })

  it('funktioniert auch andersherum (englisch → deutsch)', () => {
    expect(expandQueryTokens(['equilibrium'])).toContain('gleichgewicht')
  })

  it('lässt unbekannte Token unverändert und dedupliziert', () => {
    expect(expandQueryTokens(['bafög', 'bafög'])).toEqual(['bafög'])
  })
})

describe('rankPassages', () => {
  it('überbrückt DE-Frage → EN-Material über das Fachglossar', () => {
    const english: IndexedPassage[] = [
      passage({ documentId: 1, page: 5, text: 'The yield curve plots interest rates against the maturity of bonds.' }),
      passage({ documentId: 2, page: 2, text: 'Marginal utility decreases as consumption increases (diminishing marginal utility).' }),
    ]
    const ranked = rankPassages('Was sagt die Zinsstrukturkurve über Anleihen aus?', english)
    expect(ranked[0]).toMatchObject({ documentId: 1, page: 5 })
  })


  it('findet die thematisch passenden Seiten und ordnet sie nach Relevanz', () => {
    const ranked = rankPassages('Was sagt eine inverse Zinsstrukturkurve aus?', CORPUS)
    expect(ranked[0]).toMatchObject({ documentId: 1, page: 4 })
    expect(ranked.map((r) => `${r.documentId}:${r.page}`)).toContain('1:3')
    // Die Micro-Marktstruktur-Seite hat keinen der Frage-Begriffe → nicht dabei.
    expect(ranked.some((r) => r.documentId === 3)).toBe(false)
  })

  it('gibt nichts zurück, wenn kein Frage-Begriff im Material vorkommt', () => {
    expect(rankPassages('Wie beantrage ich BAföG?', CORPUS)).toEqual([])
  })

  it('gibt nichts zurück bei einer Frage nur aus Stoppwörtern', () => {
    expect(rankPassages('und wie ist das so', CORPUS)).toEqual([])
  })

  it('begrenzt Treffer pro Dokument (maxPerDocument)', () => {
    const many = [
      passage({ documentId: 9, page: 1, text: 'Anleihe Anleihe Rendite' }),
      passage({ documentId: 9, page: 2, text: 'Anleihe Rendite Kurve' }),
      passage({ documentId: 9, page: 3, text: 'Anleihe Rendite Laufzeit' }),
    ]
    const ranked = rankPassages('Anleihe Rendite', many, { maxPerDocument: 2 })
    expect(ranked).toHaveLength(2)
  })

  it('filtert nach Fach, wenn courseIds gesetzt sind', () => {
    const ranked = rankPassages('Monopol Oligopol Konkurrenz', CORPUS, { courseIds: [2] })
    expect(ranked).toHaveLength(1)
    expect(ranked[0]!.documentId).toBe(3)
  })

  it('respektiert das Ergebnislimit', () => {
    const ranked = rankPassages('Zinsstrukturkurve Anleihen Duration Rendite', CORPUS, { limit: 1 })
    expect(ranked).toHaveLength(1)
  })
})

describe('formatExcerptsForPrompt', () => {
  it('nummeriert die Auszüge mit Fach, Dateiname und Seitenzahl', () => {
    const ranked = rankPassages('Zinsstrukturkurve', CORPUS)
    const block = formatExcerptsForPrompt(ranked)
    expect(block).toContain('AUSZÜGE AUS DEN UNTERLAGEN')
    expect(block).toMatch(/\[1\] Fach „Money & Banking" — „Doc 1\.pdf", S\. \d+:/)
  })

  it('kürzt lange Passagen', () => {
    const long = [passage({ documentId: 5, page: 1, text: `Anleihe ${'x'.repeat(3000)}` })]
    const block = formatExcerptsForPrompt(rankPassages('Anleihe', long), 100)
    expect(block).toContain('…')
    // Header (3 Zeilen) + eine gekürzte Passage à 100 Zeichen — deutlich unter den 3000 Rohzeichen.
    expect(block.length).toBeLessThan(500)
  })

  it('ist leer, wenn es keine Treffer gibt', () => {
    expect(formatExcerptsForPrompt([])).toBe('')
  })
})
