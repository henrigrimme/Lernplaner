import { normalizeForCompare } from './extract'
import { chapterNameFromFilename } from './chapters'
import type { BodyLine, Chapter, ChapterSource, Diagnostics, Slide } from './types'

/**
 * Gemeinsame Kapitel-/Folien-Konstruktion für überschriftenbasierte Formate
 * (Word, Markdown — `ingest/docx.ts`/`markdown.ts`). Anders als PDF-
 * Foliensätze tragen diese Dokumente keine Positions-/Schriftgrößendaten,
 * dafür aber ein explizites Struktursignal: echte Überschriften. Excel
 * (Tabellenblätter, `ingest/xlsx.ts`) und PowerPoint (Folientitel/
 * Trennfolien, `ingest/pptx.ts`) haben ihre eigenen, noch direkteren
 * Signale und nutzen dieses Modul nicht.
 */

export interface HeadingSection {
  /** 1 = oberste Ebene (`#`/„Heading 1"). 0 = Text vor der ersten Überschrift. */
  level: number
  title: string
  bodyLines: string[]
}

/** Unterhalb dieser Zeichenzahl gilt ein Abschnitt als (fast) inhaltsleer — analog `ingest/pdf.ts` `SPARSE_PAGE_CHARS`. */
const SPARSE_SECTION_CHARS = 80

function toBodyLines(lines: string[]): BodyLine[] {
  return lines
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    // x/y/size sind bei diesen Formaten bedeutungslos (kein Layout, das
    // pdf.js-Koordinaten entspräche) — 0 als neutraler Platzhalter, wird
    // von keiner der hier aufgerufenen Funktionen ausgewertet
    // (`chaptersFromHeadingSections`/`uniqueCharCount` lesen nur `text`).
    .map((text) => ({ text, x: 0, y: 0, size: 0 }))
}

function sectionsToSlides(sections: HeadingSection[]): Slide[] {
  return sections.map((section, index) => {
    const bodyLines = toBodyLines(section.bodyLines)
    return {
      pageNumbers: [index + 1],
      title: section.title,
      bodyLines,
      isDivider: bodyLines.length === 0,
      chars: bodyLines.map((l) => l.text).join(' ').length,
    }
  })
}

/**
 * Kapitel aus Überschriftsabschnitten: die **flachste** im Dokument
 * vorkommende Ebene (kleinste Zahl, z. B. `#` vor `##`) markiert eine neue
 * Kapitelgrenze; tiefere Überschriften werden zu Folien innerhalb dieses
 * Kapitels — dieselbe Rolle, die bei PDF-Foliensätzen die einzelne Folie
 * unter ihrem Kapitel spielt. Text vor der ersten Kapitel-Ebene-Überschrift
 * (`level: 0`-Platzhalter oder eine tiefere Überschrift ganz am Anfang)
 * fällt auf den Dateinamen zurück — dieselbe Konvention wie bei PDFs ohne
 * erkennbares Signal (`ingest/chapters.ts` `chapterNameFromFilename`).
 *
 * Bewusst **keine** Fuzzy-Namenszusammenführung wie bei PDF-Kapiteln
 * (`ingest/chapters.ts` `buildChapters`): Überschriften sind vom Autor
 * selbst getippt, nicht aus PDF-Fragmenten mit Formatierungsartefakten
 * rekonstruiert — das Problem, das die Fuzzy-Zusammenführung dort löst,
 * tritt hier praktisch nicht auf.
 */
export function chaptersFromHeadingSections(
  sections: HeadingSection[],
  filename: string,
): { chapters: Chapter[]; slides: Slide[] } {
  const nonEmptySections = sections.filter(
    (s) => s.title.trim().length > 0 || s.bodyLines.some((l) => l.trim().length > 0),
  )
  if (nonEmptySections.length === 0) return { chapters: [], slides: [] }

  const slides = sectionsToSlides(nonEmptySections)
  const realLevels = nonEmptySections.filter((s) => s.level >= 1).map((s) => s.level)
  const chapterLevel = realLevels.length > 0 ? Math.min(...realLevels) : null
  const fallbackTitle = chapterNameFromFilename(filename) || 'Ohne Kapitel'

  const order: string[] = []
  const slidesByTitle = new Map<string, Slide[]>()
  let currentTitle: string | null = null

  nonEmptySections.forEach((section, index) => {
    if (chapterLevel !== null && section.level === chapterLevel) currentTitle = section.title
    const title = currentTitle ?? fallbackTitle
    if (!slidesByTitle.has(title)) {
      slidesByTitle.set(title, [])
      order.push(title)
    }
    slidesByTitle.get(title)!.push(slides[index]!)
  })

  const chapters: Chapter[] = order.map((title) => ({
    title,
    normalized: normalizeForCompare(title),
    slides: slidesByTitle.get(title)!,
    source: 'heading' as ChapterSource,
  }))

  return { chapters, slides }
}

/**
 * Diagnosewerte für Formate ohne PDF-spezifische Konzepte (keine
 * Animationsschritte, keine rohe „Seitenzahl" ≠ Folienzahl) —
 * `buildGroups`/`inflation` bleiben neutral (0 bzw. 1), der Rest wird aus
 * den bereits gebauten Folien abgeleitet. Von `markdown.ts`/`docx.ts`
 * geteilt; `pptx.ts` nutzt dieselbe Funktion (echte PowerPoint-Folien
 * haben ebenfalls keine Animationsschritt-Aufblähung, siehe dort).
 */
export function genericDiagnostics(slides: Slide[]): Diagnostics {
  const titled = slides.filter((s) => s.title.trim().length > 0).length
  return {
    titleCoverage: slides.length === 0 ? 0 : titled / slides.length,
    buildGroups: 0,
    inflation: 1,
    dividers: slides.filter((s) => s.isDivider).length,
    sparsePages: slides.filter((s) => s.chars < SPARSE_SECTION_CHARS).length,
  }
}
