import { describe, expect, it } from 'vitest'
import { extractCsvDocument } from '../../src/ingest/csv'

describe('extractCsvDocument', () => {
  it('macht die ganze Datei zu einem Thema mit dem Dateinamen', () => {
    const doc = extractCsvDocument('a,b\n1,2', 'Meine Tabelle.csv')
    expect(doc.chapters).toHaveLength(1)
    expect(doc.chapters[0]!.title).toBe('Meine Tabelle')
    expect(doc.slideCount).toBe(1)
  })

  it('erkennt Semikolon als Trennzeichen (DE-Excel-Export)', () => {
    const doc = extractCsvDocument('Begriff;Bedeutung\nEBIT;operatives Ergebnis', 'x.csv')
    expect(doc.slides[0]!.bodyLines.map((l) => l.text)).toEqual(['Begriff\tBedeutung', 'EBIT\toperatives Ergebnis'])
  })

  it('behandelt Anführungszeichen inkl. eingebetteter Trennzeichen und doppelter Quotes', () => {
    const doc = extractCsvDocument('name,note\n"Meier, Anna","sagt ""hallo"""', 'x.csv')
    expect(doc.slides[0]!.bodyLines[1]!.text).toBe('Meier, Anna\tsagt "hallo"')
  })

  it('überspringt leere Zeilen und leere Zellen, entfernt ein BOM', () => {
    const doc = extractCsvDocument('﻿a,,b\n\n1,2,\n', 'x.csv')
    expect(doc.slides[0]!.bodyLines.map((l) => l.text)).toEqual(['a\tb', '1\t2'])
  })

  it('kommt mit einer leeren Datei klar', () => {
    const doc = extractCsvDocument('', 'leer.csv')
    expect(doc.slides[0]!.bodyLines).toEqual([])
    expect(doc.chapters[0]!.title).toBe('leer')
  })
})
