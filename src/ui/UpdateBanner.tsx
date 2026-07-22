import { useState } from 'react'
import type { UpdateInfo } from './UpdateChecker'

/**
 * Automatischer Update-Hinweis (Gegenstück zu `UpdateChecker` in
 * "Einstellungen", das ein manuelles Prüfen bleibt). Erscheint von selbst,
 * sobald `App.tsx` beim Start ein verfügbares Update meldet — nach dem
 * Vorbild der Claude-Desktop-App, damit niemand von sich aus auf die Idee
 * kommen muss, in den Einstellungen nachzuschauen.
 *
 * Reine Präsentation wie jede andere `ui/`-Komponente: bekommt das Ergebnis
 * fertig (`update`), kennt `platform/updater.ts` nicht direkt.
 * "Schließen" blendet den Hinweis nur für die laufende Sitzung aus (lokaler
 * State hier) — kein Datenbankfeld nötig, bei jedem Neustart wird ohnehin
 * neu geprüft.
 */

export interface UpdateBannerProps {
  update: UpdateInfo | null
  onInstall: () => Promise<void>
}

export function UpdateBanner({ update, onInstall }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!update?.available || dismissed) return null

  const install = async () => {
    setInstalling(true)
    setError(null)
    try {
      await onInstall()
    } catch {
      setError('Update konnte nicht installiert werden.')
      setInstalling(false)
    }
  }

  return (
    <div className="update-banner" role="status">
      <span>
        Ein neues Update ist verfügbar{update.version && ` (Version ${update.version})`}.
        {error && ` ${error}`}
      </span>
      <div className="update-banner-actions">
        <button type="button" onClick={install} disabled={installing}>
          {installing ? 'Wird installiert…' : 'Neu starten zum Aktualisieren'}
        </button>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Update-Hinweis schließen">
          ×
        </button>
      </div>
    </div>
  )
}
