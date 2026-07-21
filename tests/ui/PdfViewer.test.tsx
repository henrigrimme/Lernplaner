import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer } from '../../src/ui/PdfViewer'

// pdfjs-dist rendert echt nur im Browser sinnvoll (siehe ingest/pdf.ts-Kommentar
// zum Worker-Setup) — hier gemockt, damit die Komponente unabhängig von echten
// PDF-Bytes/Canvas-Unterstützung in jsdom getestet werden kann.
const { getDocumentMock } = vi.hoisted(() => ({ getDocumentMock: vi.fn() }))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {},
  getDocument: getDocumentMock,
}))

function fakeDoc(numPages: number) {
  return {
    numPages,
    getPage: vi.fn().mockResolvedValue({
      getViewport: () => ({ width: 100, height: 100 }),
      render: () => ({ promise: Promise.resolve() }),
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
  }
}

describe('PdfViewer', () => {
  beforeEach(() => {
    getDocumentMock.mockReset()
  })

  it('zeigt die Startseite und die Gesamtseitenzahl', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc(5)) })
    render(<PdfViewer data={new Uint8Array()} initialPage={3} />)

    await waitFor(() => expect(screen.getByDisplayValue('3')).toBeInTheDocument())
    expect(screen.getByText('/ 5')).toBeInTheDocument()
  })

  it('deaktiviert "Zurück" auf Seite 1 und "Weiter" auf der letzten Seite', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc(2)) })
    render(<PdfViewer data={new Uint8Array()} initialPage={1} />)

    await waitFor(() => expect(screen.getByText('/ 2')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled()
  })

  it('springt bei Klick auf "Weiter" eine Seite vor', async () => {
    const user = userEvent.setup()
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc(5)) })
    render(<PdfViewer data={new Uint8Array()} initialPage={1} />)

    await waitFor(() => expect(screen.getByText('/ 5')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument())
  })

  it('springt über die Eingabe direkt zu einer Seite und kappt außerhalb des Bereichs', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(fakeDoc(5)) })
    render(<PdfViewer data={new Uint8Array()} initialPage={1} />)

    await waitFor(() => expect(screen.getByText('/ 5')).toBeInTheDocument())
    const input = screen.getByLabelText('Seite')
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(screen.getByDisplayValue('5')).toBeInTheDocument()) // gekappt auf letzte Seite
  })

  it('zeigt eine Fehlermeldung, wenn das Dokument nicht geladen werden kann', async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error('kaputt')) })
    render(<PdfViewer data={new Uint8Array()} />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/nicht angezeigt werden/i))
  })
})
