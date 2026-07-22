import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { configureWorker } from '../ingest/pdf'

/**
 * PDF-Viewer mit Seitensprung (ROADMAP.md Phase 3) und markierbarem Text
 * (ROADMAP.md Phase 4 „Markieren im Dokument → Karteikarten"). Rendert
 * eine Seite eines bereits im Speicher gehaltenen PDFs (`data`) auf ein
 * Canvas, mit Vor/Zurück und direktem Sprung zu einer Seitenzahl. Reine
 * Präsentationskomponente (ARCHITECTURE.md „ui/") — welche Bytes/Startseite
 * angezeigt werden, entscheidet der Aufrufer (siehe `ui/SourceViewer.tsx`).
 *
 * Nutzt `pdfjs-dist`, dieselbe Abhängigkeit wie `ingest/pdf.ts` — dort
 * bisher nur für Textextraktion, hier erstmals für echtes Rendern
 * (`page.render`). Der Worker-Setup-Kommentar/-Guard ist von dort
 * übernommen: nur im Browser setzen, sonst wirft `getDocument` unter
 * Vitest/Node keinen Fehler, weil pdf.js dort automatisch auf einen „Fake
 * Worker" zurückfällt.
 *
 * **Textebene für echte Markierung:** das Canvas allein zeigt nur ein Bild,
 * keinen auswählbaren Text. `pdfjs.TextLayer` (Teil desselben
 * `pdf.mjs`-Bundles, keine neue Abhängigkeit) legt unsichtbare, exakt
 * positionierte `<span>`s über das Canvas — Standardtechnik von pdf.js'
 * eigenem Viewer für Textsuche/-markierung. Das minimale CSS dafür ist aus
 * `pdfjs-dist/legacy/web/pdf_viewer.css`s `.textLayer`-Regeln übernommen
 * (nur die für Positionierung/Auswahl nötigen, nicht das komplette,
 * Annotation-Editor-lastige Stylesheet).
 */

const TEXT_LAYER_STYLE = `
  .pdf-text-layer { position: absolute; inset: 0; overflow: clip; line-height: 1; transform-origin: 0 0; }
  .pdf-text-layer span, .pdf-text-layer br { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
  .pdf-text-layer ::selection { background: rgba(0, 0, 255, 0.25); }
`

export interface PdfViewerProps {
  data: Uint8Array
  /** Seite, mit der die Ansicht startet (1-basiert). Default 1. */
  initialPage?: number
  /**
   * Feuert bei jeder Änderung der Textauswahl innerhalb dieser Seite —
   * leerer String, wenn die Auswahl aufgehoben wurde. `page` ist die
   * aktuell angezeigte Seite (1-basiert), damit der Aufrufer die
   * Markierung einem `topic_sections`-Eintrag zuordnen kann.
   */
  onSelectionChange?: (text: string, page: number) => void
}

export function PdfViewer({ data, initialPage = 1, onSelectionChange }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [page, setPage] = useState(initialPage)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const [error, setError] = useState<string | null>(null)

  // Neues Dokument/neue Startseite -> Zustand zurücksetzen.
  useEffect(() => {
    setNumPages(null)
    setPage(initialPage)
    setPageInput(String(initialPage))
    setError(null)
  }, [data, initialPage])

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        await configureWorker()
        // `data.slice()`: derselbe Grund wie in `ingest/pdf.ts` `readPages` —
        // pdf.js überträgt den Buffer an den Worker, ohne Kopie wäre `data`
        // nach dem ersten Seitenaufruf "detached" und jeder Seitenwechsel
        // (dieser Effekt läuft bei jeder `page`-Änderung erneut mit
        // demselben `data`) würde ab der zweiten Seite fehlschlagen.
        const doc = await pdfjs.getDocument({ data: data.slice() }).promise
        if (cancelled) {
          await doc.destroy()
          return
        }
        setNumPages(doc.numPages)

        const clamped = Math.min(Math.max(1, page), doc.numPages)
        if (clamped !== page) {
          setPage(clamped)
          setPageInput(String(clamped))
          await doc.destroy()
          return // Effekt läuft mit dem korrigierten `page` erneut.
        }

        const pdfPage = await doc.getPage(page)
        if (cancelled) {
          await doc.destroy()
          return
        }

        const viewport = pdfPage.getViewport({ scale: 1.2 })
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
          canvas.width = viewport.width
          canvas.height = viewport.height
          await pdfPage.render({ canvasContext: ctx, viewport }).promise
        }

        const textLayerContainer = textLayerRef.current
        if (textLayerContainer && !cancelled) {
          textLayerContainer.replaceChildren()
          const textContent = await pdfPage.getTextContent()
          if (!cancelled) {
            await new pdfjs.TextLayer({ textContentSource: textContent, container: textLayerContainer, viewport }).render()
          }
        }

        await doc.destroy()
      } catch {
        if (!cancelled) setError('PDF konnte nicht angezeigt werden.')
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [data, page])

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      const container = textLayerRef.current
      if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        onSelectionChange?.('', page)
        return
      }
      const anchor = selection.anchorNode
      if (anchor && container.contains(anchor)) {
        onSelectionChange?.(selection.toString(), page)
      } else {
        onSelectionChange?.('', page)
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [page])

  const goToPage = (target: number) => {
    const clamped = numPages === null ? Math.max(1, target) : Math.min(Math.max(1, target), numPages)
    setPage(clamped)
    setPageInput(String(clamped))
  }

  const submitPageInput = (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(pageInput)
    if (Number.isFinite(target)) goToPage(target)
  }

  return (
    <div aria-label="PDF-Ansicht">
      <div>
        <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
          Zurück
        </button>
        <form onSubmit={submitPageInput}>
          <label>
            Seite
            <input
              type="number"
              min={1}
              max={numPages ?? undefined}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
            />
          </label>
          {numPages !== null && <span> / {numPages}</span>}
        </form>
        <button type="button" onClick={() => goToPage(page + 1)} disabled={numPages !== null && page >= numPages}>
          Weiter
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <style>{TEXT_LAYER_STYLE}</style>
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} />
        <div ref={textLayerRef} className="pdf-text-layer" />
      </div>
    </div>
  )
}
