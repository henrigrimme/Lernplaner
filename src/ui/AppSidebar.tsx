import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// "Dock-Magnify": Einträge nahe der Maus wachsen leicht, mit sanftem
// Ausklingen über den Abstand — an macOS' Dock-Vergrößerung angelehnt
// (Nutzerwunsch), aber bewusst gedämpft (max. 10%, nicht das Vielfache wie
// beim echten Dock): das hier sind Textzeilen, keine quadratischen
// Icon-Glyphen, ein zu starker Sprung würde nur unruhig wirken.
const DOCK_MAGNIFY_RADIUS_PX = 70
const DOCK_MAGNIFY_MAX_SCALE = 0.1

// Bewusst so niedrig (nicht z. B. 200px): der Nutzer soll die Leiste per
// Ziehen auch deutlich schmaler machen können als der Text braucht — die
// Beschriftung wird dann vom schmaleren Rahmen abgeschnitten (siehe
// `white-space: nowrap`/`text-overflow: ellipsis` auf `.app-nav-item`/
// `.app-brand` in global.css), statt umzubrechen. Ein eigenes,
// vollständiges Wegklappen bleibt trotzdem der Toggle-Button in der
// Toolbar (`collapsed`-Prop) — dieser Minimalwert ist nur die Grenze
// beim Ziehen, keine zweite Art des Einklappens.
export const MIN_SIDEBAR_WIDTH = 64
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
  const navRef = useRef<HTMLElement | null>(null)

  // Skaliert jeden `.app-nav-item` nach Abstand zur Mausposition (nur
  // Y-Achse, die Leiste ist eine vertikale Liste) über die CSS-Custom-
  // Property `--dock-scale`, die `.app-nav-item` in global.css als
  // `transform: scale(var(--dock-scale, 1))` liest. Direkte DOM-Mutation
  // statt React-State/Re-Render — bei jeder Mausbewegung neu zu rendern
  // wäre für einen rein optischen Effekt unnötig teuer.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    let latestY: number | null = null
    let frame: number | null = null

    const applyMagnify = () => {
      frame = null
      const items = nav.querySelectorAll<HTMLElement>('.app-nav-item')
      for (const item of items) {
        if (latestY === null) {
          item.style.removeProperty('--dock-scale')
          continue
        }
        const rect = item.getBoundingClientRect()
        const distance = Math.abs(latestY - (rect.top + rect.height / 2))
        const proximity = Math.max(0, 1 - distance / DOCK_MAGNIFY_RADIUS_PX)
        item.style.setProperty('--dock-scale', (1 + proximity * DOCK_MAGNIFY_MAX_SCALE).toFixed(3))
      }
    }

    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(applyMagnify)
    }

    const handleMouseMove = (event: MouseEvent) => {
      latestY = event.clientY
      scheduleUpdate()
    }
    const handleMouseLeave = () => {
      latestY = null
      scheduleUpdate()
    }

    nav.addEventListener('mousemove', handleMouseMove)
    nav.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      nav.removeEventListener('mousemove', handleMouseMove)
      nav.removeEventListener('mouseleave', handleMouseLeave)
      if (frame !== null) cancelAnimationFrame(frame)
      for (const item of nav.querySelectorAll<HTMLElement>('.app-nav-item')) {
        item.style.removeProperty('--dock-scale')
      }
    }
  }, [collapsed])

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
    <nav className="app-sidebar" aria-label="Hauptnavigation" style={{ width }} ref={navRef}>
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
