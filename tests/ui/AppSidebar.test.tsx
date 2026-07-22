import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppSidebar, DEFAULT_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from '../../src/ui/AppSidebar'

describe('AppSidebar', () => {
  it('zeigt die Kinder an und setzt die übergebene Breite', () => {
    render(
      <AppSidebar width={300} collapsed={false} onResize={vi.fn()}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    expect(screen.getByText('Inhalt')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveStyle({ width: '300px' })
  })

  it('rendert nichts, wenn eingeklappt', () => {
    render(
      <AppSidebar width={300} collapsed onResize={vi.fn()}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    expect(screen.queryByText('Inhalt')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('ruft onResize während des Ziehens am Trenngriff mit der Mausposition auf (innerhalb der Grenzen)', () => {
    const onResize = vi.fn()
    render(
      <AppSidebar width={DEFAULT_SIDEBAR_WIDTH} collapsed={false} onResize={onResize}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    const handle = screen.getByRole('separator')
    fireEvent.mouseDown(handle)
    fireEvent.mouseMove(document, { clientX: 320 })
    expect(onResize).toHaveBeenCalledWith(320)

    fireEvent.mouseUp(document)
    onResize.mockClear()
    fireEvent.mouseMove(document, { clientX: 400 })
    expect(onResize).not.toHaveBeenCalled()
  })

  it('klemmt die gezogene Breite auf MIN_SIDEBAR_WIDTH/MAX_SIDEBAR_WIDTH', () => {
    const onResize = vi.fn()
    render(
      <AppSidebar width={DEFAULT_SIDEBAR_WIDTH} collapsed={false} onResize={onResize}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    const handle = screen.getByRole('separator')
    fireEvent.mouseDown(handle)
    fireEvent.mouseMove(document, { clientX: 10 })
    expect(onResize).toHaveBeenCalledWith(MIN_SIDEBAR_WIDTH)

    fireEvent.mouseMove(document, { clientX: 5000 })
    expect(onResize).toHaveBeenCalledWith(MAX_SIDEBAR_WIDTH)
  })

  it('passt die Breite über Pfeiltasten an, klemmt an den Grenzen', () => {
    const onResize = vi.fn()
    render(
      <AppSidebar width={MIN_SIDEBAR_WIDTH + 5} collapsed={false} onResize={onResize}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    const handle = screen.getByRole('separator')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(onResize).toHaveBeenCalledWith(MIN_SIDEBAR_WIDTH)

    onResize.mockClear()
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(onResize).toHaveBeenCalledWith(MIN_SIDEBAR_WIDTH + 5 + 16)
  })

  it('springt per Home/End auf Minimal-/Maximalbreite', () => {
    const onResize = vi.fn()
    render(
      <AppSidebar width={DEFAULT_SIDEBAR_WIDTH} collapsed={false} onResize={onResize}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    const handle = screen.getByRole('separator')
    fireEvent.keyDown(handle, { key: 'Home' })
    expect(onResize).toHaveBeenCalledWith(MIN_SIDEBAR_WIDTH)

    fireEvent.keyDown(handle, { key: 'End' })
    expect(onResize).toHaveBeenCalledWith(MAX_SIDEBAR_WIDTH)
  })

  it('setzt per Doppelklick auf den Trenngriff die Standardbreite zurück', () => {
    const onResize = vi.fn()
    render(
      <AppSidebar width={400} collapsed={false} onResize={onResize}>
        <div>Inhalt</div>
      </AppSidebar>,
    )

    fireEvent.doubleClick(screen.getByRole('separator'))
    expect(onResize).toHaveBeenCalledWith(DEFAULT_SIDEBAR_WIDTH)
  })
})
