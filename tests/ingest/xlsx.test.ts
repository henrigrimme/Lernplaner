import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractXlsxDocument } from '../../src/ingest/xlsx'

const REL_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"'

interface SheetSpec {
  name: string
  /** Zeilen aus Zelltext, jede Zeile eine Liste von Zellwerten. `{shared: n}` referenziert `sharedStrings`. */
  rows: (string | { shared: number })[][]
}

function cellXml(colLetter: string, rowIndex: number, value: string | { shared: number }): string {
  const ref = `${colLetter}${rowIndex}`
  if (typeof value === 'object') return `<c r="${ref}" t="s"><v>${value.shared}</v></c>`
  return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`
}

function sheetXml(sheet: SheetSpec): string {
  const columns = ['A', 'B', 'C', 'D', 'E']
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => cellXml(columns[colIndex]!, rowIndex + 1, value)).join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    rows +
    '</sheetData></worksheet>'
  )
}

/**
 * Baut eine minimale, gültige .xlsx (kein echtes, in Excel erzeugtes
 * Testdokument verfügbar — anders als bei PDF, siehe `Beispiel pdfs/`).
 * `sharedStrings` optional, um beide Zellarten (`t="s"`/`t="inlineStr"`)
 * abzudecken, die `ingest/xlsx.ts` `cellText` unterscheidet.
 */
async function buildMinimalXlsx(sheets: SheetSpec[], sharedStrings: string[] = []): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<Relationships ${REL_NS}>` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
  )

  const sheetEls = sheets
    .map((sheet, index) => `<sheet name="${sheet.name}" sheetId="${index + 1}" r:id="rId${index + 2}"/>`)
    .join('')
  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets>${sheetEls}</sheets></workbook>`,
  )

  const rels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${REL_NS}>${rels}</Relationships>`)

  sheets.forEach((sheet, index) => zip.file(`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet)))

  if (sharedStrings.length > 0) {
    const items = sharedStrings.map((text) => `<si><t>${text}</t></si>`).join('')
    zip.file(
      'xl/sharedStrings.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${items}</sst>`,
    )
  }

  return zip.generateAsync({ type: 'uint8array' })
}

describe('extractXlsxDocument', () => {
  it('macht aus jedem Tabellenblatt ein eigenes Kapitel, benannt nach dem Blattnamen', async () => {
    const data = await buildMinimalXlsx([
      { name: 'Formeln', rows: [['Grenzkosten', 'MC = dTC/dQ']] },
      { name: 'Definitionen', rows: [['Opportunitätskosten', 'Wert der besten Alternative']] },
    ])

    const doc = await extractXlsxDocument(data, 'Mappe.xlsx')

    expect(doc.chapters.map((c) => c.title)).toEqual(['Formeln', 'Definitionen'])
    expect(doc.chapters[0]!.source).toBe('sheet')
    expect(doc.chapters[0]!.slides[0]!.bodyLines[0]!.text).toBe('Grenzkosten\tMC = dTC/dQ')
  })

  it('liest sowohl direkte (inlineStr) als auch geteilte (shared string) Zellwerte', async () => {
    const data = await buildMinimalXlsx(
      [{ name: 'Sheet1', rows: [[{ shared: 0 }, 'Direkter Text'], [{ shared: 1 }]] }],
      ['Geteilter Text A', 'Geteilter Text B'],
    )

    const doc = await extractXlsxDocument(data, 'Mappe.xlsx')

    expect(doc.chapters[0]!.slides[0]!.bodyLines.map((l) => l.text)).toEqual([
      'Geteilter Text A\tDirekter Text',
      'Geteilter Text B',
    ])
  })

  it('liest Tabellenblätter in Arbeitsmappen-Reihenfolge, unabhängig vom internen Dateinamen', async () => {
    const data = await buildMinimalXlsx([
      { name: 'Zuerst', rows: [['a']] },
      { name: 'Zuletzt', rows: [['b']] },
    ])
    const doc = await extractXlsxDocument(data, 'Mappe.xlsx')
    expect(doc.chapters.map((c) => c.title)).toEqual(['Zuerst', 'Zuletzt'])
  })

  it('behandelt ein leeres Tabellenblatt ohne Absturz (0 Zeichen statt Fehler)', async () => {
    const data = await buildMinimalXlsx([{ name: 'Leer', rows: [] }])
    const doc = await extractXlsxDocument(data, 'Mappe.xlsx')
    expect(doc.chapters).toHaveLength(1)
    expect(doc.chapters[0]!.slides[0]!.chars).toBe(0)
  })

  it('hat keine Animationsschritt-Aufblähung — jedes Blatt zählt genau einmal', async () => {
    const data = await buildMinimalXlsx([
      { name: 'A', rows: [['x']] },
      { name: 'B', rows: [['y']] },
    ])
    const doc = await extractXlsxDocument(data, 'Mappe.xlsx')
    expect(doc.pdfPages).toBe(2)
    expect(doc.slideCount).toBe(2)
    expect(doc.diagnostics.buildGroups).toBe(0)
  })
})
