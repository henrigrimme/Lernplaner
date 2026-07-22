import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 420
export const DEFAULT_SIDEBAR_WIDTH = 260

interface AppSidebarProps {
  width: number
  collapsed: boolean
  onResize: (width: number) => void
  children: ReactNode
}

/**
 * Reine Präsentationskomponente für die linke Navigationsleiste
 * (`App.tsx`). Breite und Ein-/Ausgeklappt-Status kommen von außen (App.tsx
 * hält den Zustand und spiegelt ihn in `localStorage`, siehe dortiger
 * Kommentar) — diese Komponente hält nur den kurzlebigen Zustand während
 * einer laufenden Größenänderung per Maus, nichts, was einen Neustart
 * überstehen müsste.
 *
 * Ein Wegklappen (`collapsed`) entfernt die Leiste vollständig aus dem DOM
 * (`return null`) statt sie nur unsichtbar zu machen — die Breite im
 * umgebenden Grid (`app-shell`, `App.tsx`) fällt dann auf 0, der Inhalt
 * nimmt die volle Breite ein. Das erneute Einblenden läuft über einen
 * Schalter in der Toolbar (`App.tsx`), nicht über ein Element in der Leiste
 * selbst — sonst gäbe es bei vollständig weggeklappter Leiste keinen Weg
 * mehr zurück.
 */
export function AppSidebar({ width, collapsed, onResize, children }: AppSidebarProps) {
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      onResize(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX)))
    }
    const stopResizing = () => setIsResizing(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    // Während des Ziehens soll der Cursor col-resize bleiben, auch wenn die
    // Maus kurz über andere Elemente (Inhalt, Toolbar) wandert — ohne das
    // würde der Cursor bei schnellen Bewegungen flackern.
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onResize])

  if (collapsed) return null

  return (
    <nav className="app-sidebar" aria-label="Hauptnavigation" style={{ width }}>
      {children}
      <button
        type="button"
        className={`app-sidebar-resize-handle${isResizing ? ' app-sidebar-resize-handle--active' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Breite der Seitenleiste (Pfeiltasten zum Anpassen, doppelklicken für Standardbreite)"
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        aria-valuenow={width}
        onMouseDown={(event) => {
          event.preventDefault()
          setIsResizing(true)
        }}
        onDoubleClick={() => onResize(DEFAULT_SIDEBAR_WIDTH)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onResize(Math.max(MIN_SIDEBAR_WIDTH, width - 16))
          else if (event.key === 'ArrowRight') onResize(Math.min(MAX_SIDEBAR_WIDTH, width + 16))
          else if (event.key === 'Home') onResize(MIN_SIDEBAR_WIDTH)
          else if (event.key === 'End') onResize(MAX_SIDEBAR_WIDTH)
        }}
      />
    </nav>
  )
}
