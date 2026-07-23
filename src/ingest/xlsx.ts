import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { normalizeForCompare } from './extract'
import { genericDiagnostics } from './headingStructure'
import { uniqueCharCount } from './slides'
import type { BodyLine, Chapter, ExtractedDocument, Slide } from './types'

/**
 * Excel-Import (Nutzerwunsch 2026-07-22: „mehr Spielraum bei akzeptierten
 * Dokumenten"). Jedes Tabellenblatt wird zu einem eigenen Kapitel/Thema —
 * anders als bei Word/Markdown (`headingStructure.ts`, Überschriften
 * unbekannter Tiefe) gibt eine Arbeitsmappe mit ihren benannten Blättern
 * bereits die deutlichste denkbare Struktur vor, keine eigene
 * Kapitel-Heuristik nötig.
 *
 * `.xlsx` ist wie `.docx`/`.pptx` ein ZIP aus XML-Teilen (OOXML) —
 * `jszip`/`fast-xml-parser` wie in `ingest/pptx.ts`, aus denselben
 * Gründen (kein `DOMParser` unter Vitests Node-Testumgebung, siehe dort).
 *
 * **Bekannte Grenze:** Zellwerte werden als reiner Text gelesen (auch
 * Zahlen/Formelergebnisse über ihren zwischengespeicherten `<v>`-Wert),
 * keine Neuberechnung von Formeln, keine Zahlenformatierung. Für die
 * Aufwandsschätzung (Textumfang, ADR-004) reicht das — eine exakte
 * Werttreue ist für Lernmaterial in Tabellenform nicht der Zweck.
 */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/** Sammelt jeden Textknoten unterhalb von `node`, unabhängig von der Verschachtelungstiefe. */
function collectText(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  if (typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('@_'))
      .map(([, value]) => collectText(value))
      .join('')
  }
  return ''
}

/** `xl/sharedStrings.xml` — Excel legt Textzellen als Index in diese gemeinsame Tabelle ab, statt sie je Zelle zu wiederholen. */
async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const entry = zip.file('xl/sharedStrings.xml')
  if (!entry) return []
  const parsed = parser.parse(await entry.async('text'))
  return asArray(parsed?.sst?.si).map((si) => collectText(si))
}

interface SheetRef {
  name: string
  path: string
}

/** Tabellenblätter in der Reihenfolge, in der sie in der Arbeitsmappe angezeigt werden (nicht Dateiname-sortiert). */
async function readSheetRefsInOrder(zip: JSZip): Promise<SheetRef[]> {
  const workbookEntry = zip.file('xl/workbook.xml')
  const relsEntry = zip.file('xl/_rels/workbook.xml.rels')
  if (!workbookEntry || !relsEntry) {
    throw new Error('Keine gültige Excel-Datei (xl/workbook.xml fehlt).')
  }

  const workbook = parser.parse(await workbookEntry.async('text'))
  const rels = parser.parse(await relsEntry.async('text'))

  const targetById = new Map<string, string>()
  for (const rel of asArray(rels?.Relationships?.Relationship)) {
    targetById.set(rel['@_Id'], rel['@_Target'])
  }

  const refs: SheetRef[] = []
  for (const sheet of asArray(workbook?.workbook?.sheets?.sheet)) {
    const target = targetById.get(sheet['@_r:id'])
    if (!target) continue
    refs.push({ name: String(sheet['@_name']), path: `xl/${target.replace(/^\.?\//, '')}` })
  }
  return refs
}

function cellText(cell: Record<string, unknown>, sharedStrings: string[]): string {
  const type = cell['@_t']
  if (type === 's') {
    const index = Number(collectText(cell['v']))
    return sharedStrings[index] ?? ''
  }
  if (type === 'inlineStr') return collectText(cell['is'])
  if (cell['v'] !== undefined) return collectText(cell['v'])
  return ''
}

/** Ein Tabellenblatt in Zeilen aus tabgetrennten Zellwerten zerlegt — leere Zeilen/Zellen entfallen. */
function sheetToLines(sheetXml: unknown, sharedStrings: string[]): string[] {
  const rows = asArray((sheetXml as Record<string, any>)?.worksheet?.sheetData?.row)
  return rows
    .map((row) =>
      asArray(row['c'])
        .map((cell) => cellText(cell, sharedStrings).trim())
        .filter((text) => text.length > 0)
        .join('\t'),
    )
    .filter((line) => line.length > 0)
}

export async function extractXlsxDocument(data: Uint8Array, filename: string): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(data)
  const sharedStrings = await readSharedStrings(zip)
  const sheetRefs = await readSheetRefsInOrder(zip)

  const chapters: Chapter[] = []
  const slides: Slide[] = []

  for (const [index, ref] of sheetRefs.entries()) {
    const entry = zip.file(ref.path)
    if (!entry) continue

    const lines = sheetToLines(parser.parse(await entry.async('text')), sharedStrings)
    const bodyLines: BodyLine[] = lines.map((text) => ({ text, x: 0, y: 0, size: 0 }))
    const slide: Slide = {
      pageNumbers: [index + 1],
      title: ref.name,
      bodyLines,
      isDivider: false,
      chars: bodyLines.map((l) => l.text).join(' ').length,
    }
    slides.push(slide)
    chapters.push({
      title: ref.name,
      normalized: normalizeForCompare(ref.name),
      slides: [slide],
      source: 'sheet',
    })
  }

  return {
    filename,
    pdfPages: slides.length,
    slideCount: slides.length,
    uniqueChars: uniqueCharCount(slides),
    chapters,
    slides,
    diagnostics: genericDiagnostics(slides),
  }
}
