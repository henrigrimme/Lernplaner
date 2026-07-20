import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  bodyLinesOf,
  detectTitle,
  findRepeatingLines,
  itemsToLines,
} from './extract'
import { groupIntoSlides, uniqueCharCount } from './slides'
import type { BodyLine, Diagnostics, ExtractedDocument, Page, TextItem } from './types'

/** Unterhalb dieser Zeichenzahl gilt eine Seite als (fast) grafisch. */
const SPARSE_PAGE_CHARS = 80

/** PDF-Bytes in Seiten mit Zeilen und Titeln zerlegen. */
export async function readPages(data: Uint8Array): Promise<Page[]> {
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const pages: Page[] = []

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const items: TextItem[] = content.items.flatMap((item) => {
      if (!('str' in item)) return []
      return [{
        text: item.str,
        size: Math.abs(item.transform[3] as number),
        x: item.transform[4] as number,
        y: item.transform[5] as number,
      }]
    })

    const lines = itemsToLines(items)
    pages.push({
      number: n,
      title: detectTitle(lines, viewport.height),
      lines,
      bodyLines: [],
      width: viewport.width,
      height: viewport.height,
    })
  }

  await doc.destroy()
  return pages
}

/** Vollständige Import-Pipeline für ein Dokument. */
export async function extractDocument(
  data: Uint8Array,
  filename: string,
): Promise<ExtractedDocument> {
  const pages = await readPages(data)
  const repeating = findRepeatingLines(pages)

  const bodyLinesByPage = new Map<number, BodyLine[]>()
  for (const page of pages) {
    const body = bodyLinesOf(page, repeating)
    page.bodyLines = body
    bodyLinesByPage.set(page.number, body)
  }

  const slides = groupIntoSlides(pages, bodyLinesByPage)
  const contentSlides = slides.filter((s) => !s.isDivider)

  const diagnostics: Diagnostics = {
    titleCoverage:
      pages.length === 0
        ? 0
        : pages.filter((p) => p.title.length > 0).length / pages.length,
    buildGroups: slides.filter((s) => s.pageNumbers.length > 1).length,
    inflation:
      contentSlides.length === 0 ? 0 : pages.length / contentSlides.length,
    dividers: slides.filter((s) => s.isDivider).length,
    sparsePages: pages.filter(
      (p) => p.bodyLines.map((l) => l.text).join(' ').length < SPARSE_PAGE_CHARS,
    ).length,
  }

  return {
    filename,
    pdfPages: pages.length,
    slideCount: contentSlides.length,
    uniqueChars: uniqueCharCount(contentSlides),
    chapters: [],
    slides,
    diagnostics,
  }
}
