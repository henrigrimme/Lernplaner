import { normalizeForCompare } from './extract'
import { genericDiagnostics } from './headingStructure'
import { uniqueCharCount } from './slides'
import { chapterNameFromFilename } from './chapters'
import type { BodyLine, Chapter, ExtractedDocument, Slide } from './types'

/**
 * CSV-Import (Nutzerwunsch 2026-09-08). CSV trägt keine Kapitelstruktur
 * — die ganze Datei wird **ein** Thema (Name aus dem Dateinamen, wie beim
 * dateinamensbasierten Fall in `chapters.ts`), jede Zeile eine
 * Körperzeile. Reine Textverarbeitung, kein DOM — läuft auch im
 * Node-Testlauf.
 *
 * Trennzeichen wird aus der ersten Zeile geraten (`,` oder `;` — je
 * nachdem, was häufiger vorkommt; `;` ist in DE-Excel-Exporten üblich).
 * Anführungszeichen um Felder (`"a,b"`) werden erkannt, doppelte
 * `""` innerhalb eines Feldes zu `"`. Kein voller RFC-4180-Parser (keine
 * mehrzeiligen Felder) — für Lernmaterial in Tabellenform reicht das,
 * dieselbe bewusste Grenze wie bei `xlsx.ts`.
 */

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && (ch === ',' || ch === ';' || ch === '\t')) counts[ch] += 1
  }
  if (counts['\t'] >= counts[','] && counts['\t'] >= counts[';']) return '\t'
  return counts[';'] > counts[','] ? ';' : ','
}

/** Zerlegt eine einzelne CSV-Zeile in Felder (Anführungszeichen-bewusst). */
function splitRow(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

export function extractCsvDocument(text: string, filename: string): ExtractedDocument {
  const rawLines = text.replace(/^﻿/, '').split(/\r?\n/)
  const nonEmpty = rawLines.filter((l) => l.trim().length > 0)
  const delimiter = nonEmpty.length > 0 ? detectDelimiter(nonEmpty[0]!) : ','

  const lines = nonEmpty
    .map((line) =>
      splitRow(line, delimiter)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
        .join('\t'),
    )
    .filter((line) => line.length > 0)

  const title = chapterNameFromFilename(filename)
  const bodyLines: BodyLine[] = lines.map((line) => ({ text: line, x: 0, y: 0, size: 0 }))
  const slide: Slide = {
    pageNumbers: [1],
    title,
    bodyLines,
    isDivider: false,
    chars: bodyLines.map((l) => l.text).join(' ').length,
  }
  const chapters: Chapter[] = [{ title, normalized: normalizeForCompare(title), slides: [slide], source: 'filename' }]

  return {
    filename,
    pdfPages: 1,
    slideCount: 1,
    uniqueChars: uniqueCharCount([slide]),
    chapters,
    slides: [slide],
    diagnostics: genericDiagnostics([slide]),
  }
}
