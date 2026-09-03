import { useEffect } from 'react'

/**
 * Eigenes Bestätigungs-Overlay für destruktive Aktionen (Löschen), als
 * Ersatz für `window.confirm` (Design-Review 2026-09-03, `apple-design`-
 * Skill: natives Browser-Dialog bricht aus dem Glas-/Warm-Designsystem
 * aus und lässt sich nicht stylen). Folgt demselben Backdrop-/Panel-Muster
 * wie `QuickSearch.tsx` (Glas erlaubt — DESIGN.md „Glass-Not-Shadow Rule"
 * nennt Overlays explizit als legitimen Anwendungsfall). `role="alertdialog"`
 * statt `role="dialog"`, weil eine Antwort verlangt wird (WAI-ARIA-Konvention
 * für Bestätigungsprompts).
 */

export interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          {/* Fokus standardmäßig auf Abbrechen, nicht die destruktive Aktion —
              verhindert versehentliches Löschen durch schnelles Enter. */}
          <button type="button" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-dialog-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
