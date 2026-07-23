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
  })

  it('lehnt bewusst ausgeschlossene Formate ab (CSV/HTML, kein Lernmaterial)', () => {
    expect(isSupportedDocument('Daten.csv')).toBe(false)
    expect(isSupportedDocument('Seite.html')).toBe(false)
    expect(isSupportedDocument('Bild.png')).toBe(false)
  })

  it('SUPPORTED_EXTENSIONS deckt genau die geprüften Formate ab', () => {
    expect(SUPPORTED_EXTENSIONS).toEqual(['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.markdown'])
  })
})

describe('extractAnyDocument', () => {
  it('wirft für ein nicht unterstütztes Format eine verständliche Fehlermeldung statt eines kryptischen Absturzes', async () => {
    await expect(extractAnyDocument(new Uint8Array(), 'Daten.csv')).rejects.toThrow(/Nicht unterstütztes Dateiformat/)
  })

  it('leitet .md an den Markdown-Import weiter', async () => {
    const data = new TextEncoder().encode('# Kapitel\nText.')
    const doc = await extractAnyDocument(data, 'Notizen.md')
    expect(doc.chapters.map((c) => c.title)).toEqual(['Kapitel'])
  })
})
