/**
 * Diagnosewerkzeug: die Import-Pipeline gegen echte Foliensätze laufen lassen.
 *
 *   npm run analyze -- <pfad-zu-pdf> [weitere...]
 *   npm run analyze -- --detail <pfad-zu-pdf>
 *
 * Die PDFs selbst gehören nicht ins Repository (siehe SECURITY.md) — dieses
 * Skript arbeitet mit lokalen Pfaden.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { extractDocument } from '../src/ingest/pdf'

const args = process.argv.slice(2)
const detail = args.includes('--detail')
const files = args.filter((a) => !a.startsWith('--'))

if (files.length === 0) {
  console.error('Aufruf: npm run analyze -- [--detail] <pfad.pdf> ...')
  process.exit(1)
}

const pad = (s: string | number, n: number) => String(s).padStart(n)

if (!detail) {
  console.log(
    'Datei'.padEnd(38),
    pad('PDF', 5), pad('Folien', 7), pad('Trenn', 6),
    pad('Builds', 7), pad('Faktor', 7), pad('Titel', 6), pad('UniqZ', 8),
    '  Kapitel',
  )
  console.log('-'.repeat(93 + 20))
}

for (const file of files) {
  const doc = await extractDocument(
    new Uint8Array(readFileSync(file)),
    basename(file),
  )
  const d = doc.diagnostics

  if (detail) {
    console.log(`\n═══ ${doc.filename} ═══`)
    console.log(
      `${doc.pdfPages} Seiten → ${doc.slideCount} Folien ` +
      `(Faktor ${d.inflation.toFixed(2)}), ${doc.uniqueChars} eindeutige Zeichen\n`,
    )
    const chapterSource = doc.chapters[0]?.source ?? '—'
    console.log(`${doc.chapters.length} Kapitel erkannt (Quelle: ${chapterSource}):`)
    for (const chapter of doc.chapters) {
      console.log(`  · ${chapter.title} (${chapter.slides.length} Folien)`)
    }
    console.log()
    for (const slide of doc.slides) {
      const pages = slide.pageNumbers.length > 1
        ? `S.${slide.pageNumbers[0]}–${slide.pageNumbers.at(-1)}`
        : `S.${slide.pageNumbers[0]}`
      const mark = slide.isDivider ? '│ TRENN ' : slide.pageNumbers.length > 1 ? '│ BUILD ' : '│       '
      console.log(
        `${mark}${pages.padEnd(10)} ${pad(slide.chars, 5)}z  ${slide.title.slice(0, 58) || '—'}`,
      )
    }
  } else {
    console.log(
      doc.filename.slice(0, 37).padEnd(38),
      pad(doc.pdfPages, 5),
      pad(doc.slideCount, 7),
      pad(d.dividers, 6),
      pad(d.buildGroups, 7),
      pad(d.inflation.toFixed(2), 7),
      pad(`${Math.round(d.titleCoverage * 100)}%`, 6),
      pad(doc.uniqueChars, 8),
      `  ${doc.chapters.length} (${doc.chapters[0]?.source ?? '—'})`,
    )
  }
}
