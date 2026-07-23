import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractPptxDocument } from '../../src/ingest/pptx'

const NS = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'

function titleShape(text: string): string {
  return (
    '<p:sp><p:nvSpPr><p:cNvPr id="1" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>' +
    `<p:spPr/><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`
  )
}

function bodyShape(lines: string[]): string {
  const paragraphs = lines.map((line) => `<a:p><a:r><a:t>${line}</a:t></a:r></a:p>`).join('')
  return (
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    `<p:spPr/><p:txBody>${paragraphs}</p:txBody></p:sp>`
  )
}

function slideNumberShape(): string {
  return (
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Slide Number"/><p:cNvSpPr/><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr>' +
    '<p:spPr/><p:txBody><a:p><a:fld id="{1}" type="slidenum"><a:t>1</a:t></a:fld></a:p></p:txBody></p:sp>'
  )
}

function slideXml(title: string, bodyLines: string[] = [], includeSlideNumber = false): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}><p:cSld><p:spTree>` +
    '<p:nvGrpSpPr/><p:grpSpPr/>' +
    titleShape(title) +
    (bodyLines.length > 0 ? bodyShape(bodyLines) : '') +
    (includeSlideNumber ? slideNumberShape() : '') +
    '</p:spTree></p:cSld></p:sld>'
  )
}

/**
 * Baut eine minimale, gültige .pptx (kein echtes, in PowerPoint erzeugtes
 * Testdokument verfügbar — anders als bei PDF, siehe `Beispiel pdfs/`).
 * Physische Dateinamen (`slideX`/`slideY`/…) bewusst NICHT in
 * Präsentationsreihenfolge, um zu beweisen, dass `extractPptxDocument`
 * tatsächlich über `sldIdLst`/`presentation.xml.rels` liest und nicht
 * naiv nach Dateiname sortiert.
 */
async function buildMinimalPptx(slides: { file: string; xml: string }[], order: string[]): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
      '</Relationships>',
  )

  const rIdByFile = new Map(order.map((file, index) => [file, `rId${index + 2}`]))
  const sldIdLst = order.map((file, index) => `<p:sldId id="${256 + index}" r:id="${rIdByFile.get(file)}"/>`).join('')
  zip.file(
    'ppt/presentation.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<p:presentation ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<p:sldIdLst>${sldIdLst}</p:sldIdLst></p:presentation>`,
  )

  const rels = order
    .map(
      (file) =>
        `<Relationship Id="${rIdByFile.get(file)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${file}.xml"/>`,
    )
    .join('')
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
  )

  for (const slide of slides) zip.file(`ppt/slides/${slide.file}.xml`, slide.xml)

  return zip.generateAsync({ type: 'uint8array' })
}

describe('extractPptxDocument', () => {
  it('liest Folien in Präsentationsreihenfolge, nicht nach Dateiname sortiert', async () => {
    const slides = [
      { file: 'slideY', xml: slideXml('Erste Folie') },
      { file: 'slideX', xml: slideXml('Zweite Folie') },
    ]
    // Physische Reihenfolge (Zip-Einträge) ist Y, X — Präsentationsreihenfolge ist ebenfalls Y, X über sldIdLst.
    const data = await buildMinimalPptx(slides, ['slideY', 'slideX'])
    const doc = await extractPptxDocument(data, 'Deck.pptx')
    expect(doc.slides.map((s) => s.title)).toEqual(['Erste Folie', 'Zweite Folie'])
  })

  it('erkennt echte Trennfolien (Titel-Platzhalter, kein Fließtext) als Kapitelgrenzen', async () => {
    const slides = [
      { file: 'slideA', xml: slideXml('Chapter One') },
      { file: 'slideB', xml: slideXml('Utility', ['Nutzenfunktionen beschreiben Präferenzen über Güterbündel hinweg genau.']) },
      { file: 'slideC', xml: slideXml('Chapter Two') },
      { file: 'slideD', xml: slideXml('Cost', ['Grenzkosten und Durchschnittskosten unterscheiden sich in der kurzen Frist.']) },
    ]
    const data = await buildMinimalPptx(slides, ['slideA', 'slideB', 'slideC', 'slideD'])

    const doc = await extractPptxDocument(data, 'Microeconomics.pptx')

    expect(doc.chapters.map((c) => c.title)).toEqual(['Chapter One', 'Chapter Two'])
    expect(doc.chapters[0]!.source).toBe('divider')
    expect(doc.chapters[0]!.slides.map((s) => s.title)).toEqual(['Utility'])
    expect(doc.chapters[1]!.slides.map((s) => s.title)).toEqual(['Cost'])
  })

  it('fällt ohne jede Trennfolie auf den Dateinamen als einziges Kapitel zurück', async () => {
    const slides = [
      { file: 'slideA', xml: slideXml('Intro', ['Erster inhaltlicher Absatz mit genug Text für keine Trennfolie.']) },
      { file: 'slideB', xml: slideXml('Details', ['Zweiter inhaltlicher Absatz, ebenfalls ausreichend lang formuliert.']) },
    ]
    const data = await buildMinimalPptx(slides, ['slideA', 'slideB'])

    const doc = await extractPptxDocument(data, '02 Entrepreneurial Transformation.pptx')

    expect(doc.chapters).toHaveLength(1)
    expect(doc.chapters[0]!.title).toBe('Entrepreneurial Transformation')
    expect(doc.chapters[0]!.source).toBe('filename')
  })

  it('ignoriert administrative Platzhalter (Foliennummer) als Folieninhalt', async () => {
    const slides = [{ file: 'slideA', xml: slideXml('Nur Titel', [], true) }]
    const data = await buildMinimalPptx(slides, ['slideA'])
    const doc = await extractPptxDocument(data, 'Deck.pptx')
    expect(doc.slides[0]!.bodyLines).toHaveLength(0)
  })

  it('hat keine Animationsschritt-Aufblähung — jede Folie zählt genau einmal', async () => {
    const slides = [
      { file: 'slideA', xml: slideXml('A', ['Text A, lang genug um nicht als Trennfolie zu gelten sicherlich.']) },
      { file: 'slideB', xml: slideXml('B', ['Text B, ebenfalls lang genug um nicht als Trennfolie zu gelten.']) },
    ]
    const data = await buildMinimalPptx(slides, ['slideA', 'slideB'])
    const doc = await extractPptxDocument(data, 'Deck.pptx')
    expect(doc.pdfPages).toBe(2)
    expect(doc.slideCount).toBe(2)
    expect(doc.diagnostics.buildGroups).toBe(0)
    expect(doc.diagnostics.inflation).toBe(1)
  })
})
