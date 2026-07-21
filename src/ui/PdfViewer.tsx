import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

/**
 * PDF-Viewer mit Seitensprung (ROADMAP.md Phase 3). Rendert eine Seite
 * eines bereits im Speicher gehaltenen PDFs (`data`) auf ein Canvas, mit
 * Vor/Zurück und direktem Sprung zu einer Seitenzahl. Reine
 * Präsentationskomponente (ARCHITECTURE.md „ui/") — welche Bytes/Startseite
 * angezeigt werden, entscheidet der Aufrufer (siehe `ui/SourceViewer.tsx`).
 *
 * Nutzt `pdfjs-dist`, dieselbe Abhängigkeit wie `ingest/pdf.ts` — dort
 * bisher nur für Textextraktion, hier erstmals für echtes Rendern
 * (`page.render`). Der Worker-Setup-Kommentar/-Guard ist von dort
 * übernommen: nur im Browser setzen, sonst wirft `getDocument` unter
 * Vitest/Node keinen Fehler, weil pdf.js dort automatisch auf einen „Fake
 * Worker" zurückfällt.
 */
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).href
}

export interface PdfViewerProps {
  data: Uint8Array
  /** Seite, mit der die Ansicht startet (1-basiert). Default 1. */
  initialPage?: number
}

export function PdfViewer({ data, initialPage = 1 }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
        const doc = await pdfjs.getDocument({ data }).promise
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
      <canvas ref={canvasRef} />
    </div>
  )
}
