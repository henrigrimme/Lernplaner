import { describe, expect, it } from 'vitest'
import { extractAnyDocument, isSupportedDocument, SUPPORTED_EXTENSIONS } from '../../src/ingest/documentImport'

describe('isSupportedDocument', () => {
  it('akzeptiert alle unterstützten Formate, groß-/kleinschreibungsunabhängig', () => {
    expect(isSupportedDocument('Skript.PDF')).toBe(true)
    expect(isSupportedDocument('Skript.docx')).toBe(true)
    expect(isSupportedDocument('Folien.pptx')).toBe(true)
    expect(isSupportedDocument('Tabelle.xlsx')).toBe(true)
    expect(isSupportedDocument('Notizen.md')).toBe(true)
    expect(isSupportedDocument('Notizen.markdown')).toBe(true)
    expect(isSupportedDocument('Notizen.TXT')).toBe(true)
    expect(isSupportedDocument('Daten.csv')).toBe(true)
  })

  it('lehnt weiterhin ausgeschlossene Formate ab (HTML, Bilder, Altformate)', () => {
    expect(isSupportedDocument('Seite.html')).toBe(false)
    expect(isSupportedDocument('Bild.png')).toBe(false)
    expect(isSupportedDocument('Alt.doc')).toBe(false)
    expect(isSupportedDocument('Alt.ppt')).toBe(false)
  })

  it('SUPPORTED_EXTENSIONS deckt genau die geprüften Formate ab', () => {
    expect(SUPPORTED_EXTENSIONS).toEqual(['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.markdown', '.txt', '.csv'])
  })
})

describe('extractAnyDocument', () => {
  it('wirft für ein nicht unterstütztes Format eine verständliche Fehlermeldung statt eines kryptischen Absturzes', async () => {
    await expect(extractAnyDocument(new Uint8Array(), 'Seite.html')).rejects.toThrow(/Nicht unterstütztes Dateiformat/)
  })

  it('leitet .md an den Markdown-Import weiter', async () => {
    const data = new TextEncoder().encode('# Kapitel\nText.')
    const doc = await extractAnyDocument(data, 'Notizen.md')
    expect(doc.chapters.map((c) => c.title)).toEqual(['Kapitel'])
  })

  it('behandelt .txt wie Markdown (Überschriften erkannt)', async () => {
    const data = new TextEncoder().encode('# Thema A\nInhalt.\n# Thema B\nMehr.')
    const doc = await extractAnyDocument(data, 'Mitschrift.txt')
    expect(doc.chapters.map((c) => c.title)).toEqual(['Thema A', 'Thema B'])
  })

  it('leitet .csv an den CSV-Import weiter (ganze Datei = ein Thema aus dem Dateinamen)', async () => {
    const data = new TextEncoder().encode('Begriff;Definition\nAngebot;Menge zu einem Preis\nNachfrage;gewünschte Menge')
    const doc = await extractAnyDocument(data, 'Vokabeln Mikro.csv')
    expect(doc.chapters).toHaveLength(1)
    expect(doc.chapters[0]!.title).toBe('Vokabeln Mikro')
    expect(doc.slides[0]!.bodyLines.map((l) => l.text)).toContain('Angebot\tMenge zu einem Preis')
  })
})
