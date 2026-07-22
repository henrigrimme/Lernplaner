import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { detectChapters } from './chapters'
import {
  bodyLinesOf,
  detectTitle,
  findRepeatingLines,
  itemsToLines,
} from './extract'
import { groupIntoSlides, uniqueCharCount } from './slides'
import type { BodyLine, Diagnostics, ExtractedDocument, Page, TextItem } from './types'

/**
 * Im Browser braucht pdf.js einen expliziten Worker (`GlobalWorkerOptions.
 * workerSrc`), sonst wirft `getDocument` „No GlobalWorkerOptions.workerSrc
 * specified." — im echten Browser gefunden (Playwright-Check gegen
 * `npm run dev`, siehe CONTEXT.md), nicht durch Tests, weil pdf.js unter
 * Node automatisch auf einen „Fake Worker" zurückfällt. Nur im Browser
 * setzen (`typeof window`-Guard), damit Vitest/`tsx`-Skripte unter Node
 * unverändert funktionieren.
 *
 * **Blob-URL-Umweg statt direktem Pfad — Bugfix (2026-07-22, Nutzerbericht
 * „PDF-/Ordner-Import: Dialog öffnet sich, danach passiert nichts"):**
 * bekannter, ungelöster Tauri-Bug auf macOS (tauri-apps/tauri#9975) — im
 * gebauten (nicht dem Dev-Server-)Fenster liefert der eigene, verschachtelte
 * Modul-Import des Workers über Tauris Asset-Protokoll manchmal fälschlich
 * `index.html` statt der echten Worker-Datei zurück
 * („SyntaxError: Unexpected token '<'"), `getDocument()` hängt dadurch
 * lautlos. Traf im Dev-Server (anderes Protokoll) und in
 * `scripts/analyze-material.ts` (Node, kein echter Worker, siehe
 * `readPages`-Kommentar unten) nie auf, deshalb bisher unentdeckt. Umgehung:
 * die Worker-Datei ganz normal per `fetch` laden (derselbe Mechanismus, über
 * den auch das Haupt-Bundle zuverlässig lädt) und über eine Blob-URL
 * bereitstellen, statt pdf.js selbst den betroffenen, verschachtelten
 * Worker-Import aufzulösen. Schlägt der Fetch/Blob-Weg aus irgendeinem Grund
 * fehl, fällt es auf den bisherigen direkten Pfad zurück (funktionierte im
 * Dev-Server ohnehin zuverlässig).
 */
let workerSrcReady: Promise<void> | null = null

/**
 * Exportiert, weil `ui/PdfViewer.tsx` denselben Worker braucht (eigener
 * `getDocument()`-Aufruf zum Rendern, nicht nur zur Textextraktion hier) —
 * beide teilen sich `pdfjs.GlobalWorkerOptions` (Modul-Singleton), aber
 * ohne gemeinsamen Aufruf dieser Funktion bliebe `PdfViewer.tsx` beim alten,
 * betroffenen direkten Pfad, falls in der Sitzung noch kein Import über
 * `readPages` gelaufen ist.
 */
// jsdom (Vitest `tests/ui/**`, siehe vitest.config.ts) definiert `window`,
// ist aber kein echter Browser — der Blob-Umweg unten würde dort einen
// echten `fetch()` gegen eine `file://`-URL auslösen (schlägt fehl/dauert,
// bringt in jsdom ohnehin nichts) statt wie im echten Browser nur einmal
// harmlos zu greifen. Dasselbe `navigator.userAgent`-Erkennungsmuster wie
// in vielen anderen Projekten, um jsdom von einem echten Fenster zu
// unterscheiden.
const isRealBrowser = typeof window !== 'undefined' && !/jsdom/i.test(window.navigator?.userAgent ?? '')

export function configureWorker(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const directUrl = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href

  if (!isRealBrowser) {
    pdfjs.GlobalWorkerOptions.workerSrc = directUrl
    return Promise.resolve()
  }

  workerSrcReady ??= (async () => {
    try {
      const response = await fetch(directUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const code = await response.text()
      const blob = new Blob([code], { type: 'text/javascript' })
      pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
    } catch (error) {
      console.warn('pdf.js-Worker: Blob-Umgehung fehlgeschlagen, verwende direkten Pfad', error)
      pdfjs.GlobalWorkerOptions.workerSrc = directUrl
    }
  })()
  return workerSrcReady
}

/** Unterhalb dieser Zeichenzahl gilt eine Seite als (fast) grafisch. */
const SPARSE_PAGE_CHARS = 80

/** PDF-Bytes in Seiten mit Zeilen und Titeln zerlegen. */
export async function readPages(data: Uint8Array): Promise<Page[]> {
  await configureWorker()
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
        width: item.width,
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

/**
 * Reiner Fließtext einer Seitenspanne (inklusive `pageEnd`) — Grundlage für
 * KI-Aufrufe, die echten Belegtext brauchen (ROADMAP.md Phase 4:
 * Quiz-Generierung, Altklausur-Analyse). Nutzt `readPages` erneut statt
 * `Page.bodyLines` wiederzuverwenden, weil Letztere nur während eines
 * laufenden Imports existieren (`extractDocument` setzt sie, aber nur
 * `topics`/`topic_sections` werden persistiert, siehe
 * `data/importTopics.ts`) — die PDF-Rohbytes selbst bleiben ohnehin nur
 * für die laufende Sitzung im Speicher (`documentBytes` in `App.tsx`).
 */
export async function extractPageRangeText(data: Uint8Array, pageStart: number, pageEnd: number): Promise<string> {
  const pages = await readPages(data)
  return pages
    .filter((p) => p.number >= pageStart && p.number <= pageEnd)
    .map((p) => p.lines.map((l) => l.text).join(' '))
    .join('\n')
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
  const chapters = detectChapters(pages, bodyLinesByPage, slides, filename)

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
    chapters,
    slides,
    diagnostics,
  }
}
