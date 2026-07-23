import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractDocxDocument, parseHtmlSections } from '../../src/ingest/docx'

describe('parseHtmlSections', () => {
  it('zerlegt Mammoth-typisches HTML in Überschriftsabschnitte', () => {
    const html = '<p>Vor jeder Überschrift.</p><h1>Kapitel A</h1><p>Text A.</p><h2>Unter A.1</h2><p>Detail.</p><h1>Kapitel B</h1><p>Text B.</p>'

    const sections = parseHtmlSections(html)

    expect(sections.map((s) => [s.level, s.title])).toEqual([
      [0, ''],
      [1, 'Kapitel A'],
      [2, 'Unter A.1'],
      [1, 'Kapitel B'],
    ])
    expect(sections[0]!.bodyLines).toEqual(['Vor jeder Überschrift.'])
    expect(sections[1]!.bodyLines).toEqual(['Text A.'])
  })

  it('dekodiert HTML-Entitäten und ignoriert Inline-Formatierung in Überschriften', () => {
    const html = '<h1><strong>Preis</strong> &amp; Menge</h1><p>Text</p>'
    const sections = parseHtmlSections(html)
    expect(sections[1]!.title).toBe('Preis & Menge')
  })

  it('liefert nur den Platzhalter-Abschnitt für HTML ohne jede Überschrift', () => {
    const sections = parseHtmlSections('<p>Nur ein Absatz.</p><p>Noch einer.</p>')
    expect(sections).toHaveLength(1)
    expect(sections[0]!.level).toBe(0)
    expect(sections[0]!.bodyLines).toEqual(['Nur ein Absatz.', 'Noch einer.'])
  })
})

/**
 * Minimales, von Hand gebautes .docx (OOXML-ZIP) — kein echtes, mit Word
 * erzeugtes Testdokument verfügbar (anders als bei PDF, siehe
 * `Beispiel pdfs/`). Deckt die eigentliche Mammoth-Anbindung ab; die
 * Kapitel-/Überschriften-Logik selbst ist bereits oben und in
 * `headingStructure.test.ts` gegen synthetisches HTML geprüft.
 * **Bekannte Lücke:** kein Plausibilitätscheck an echtem, in Word
 * geschriebenem Material — siehe CONTEXT.md.
 */
async function buildMinimalDocx(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  )
  zip.file(
    'word/_rels/document.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
  )
  zip.file(
    'word/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '</w:styles>',
  )
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Consumer Theory</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Kurze Einleitung.</w:t></w:r></w:p>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Utility</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Nutzenfunktionen im Detail.</w:t></w:r></w:p>' +
      '</w:body>' +
      '</w:document>',
  )
  return zip.generateAsync({ type: 'uint8array' })
}

describe('extractDocxDocument', () => {
  it('liest echte Word-Überschriftsformatvorlagen und baut daraus Kapitel/Folien', async () => {
    const data = await buildMinimalDocx()
    const doc = await extractDocxDocument(data, 'Skript.docx')

    expect(doc.chapters.map((c) => c.title)).toEqual(['Consumer Theory'])
    expect(doc.chapters[0]!.slides.map((s) => s.title)).toEqual(['Consumer Theory', 'Utility'])
    expect(doc.chapters[0]!.source).toBe('heading')
    expect(doc.uniqueChars).toBeGreaterThan(0)
  })
})
