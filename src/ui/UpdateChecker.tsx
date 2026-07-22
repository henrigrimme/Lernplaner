import { useState } from 'react'

/**
 * Auto-Update-Prüfung (ADR-008, auf Rückfrage entschieden: Repo public,
 * damit der unauthentifizierte Update-Check der App funktioniert). Reine
 * Präsentation wie `NotificationsPanel` — `onCheckNow`/`onInstall` kapseln
 * `platform/updater.ts`, diese Komponente kennt nur das Ergebnis.
 */

export interface UpdateInfo {
  available: boolean
  version?: string
  body?: string
}

export interface UpdateCheckerProps {
  onCheckNow: () => Promise<UpdateInfo>
  onInstall: () => Promise<void>
}

export function UpdateChecker({ onCheckNow, onInstall }: UpdateCheckerProps) {
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkNow = async () => {
    setChecking(true)
    setError(null)
    try {
      setUpdate(await onCheckNow())
    } catch {
      setError('Update-Prüfung ist nur in der echten App verfügbar, nicht im Dev-Server-Browser.')
      setUpdate(null)
    } finally {
      setChecking(false)
    }
  }

  const install = async () => {
    setInstalling(true)
    setError(null)
    try {
      await onInstall()
    } catch {
      setError('Update konnte nicht installiert werden.')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <section aria-label="App-Updates">
      <h2>App-Updates</h2>

      <button type="button" onClick={checkNow} disabled={checking}>
        Nach Updates suchen
      </button>

      {update !== null &&
        (update.available ? (
          <div>
            <p>
              Version {update.version} ist verfügbar.
              {update.body && ` ${update.body}`}
            </p>
            <button type="button" onClick={install} disabled={installing}>
              {installing ? 'Wird installiert…' : 'Installieren und neu starten'}
            </button>
          </div>
        ) : (
          <p>Du hast die aktuelle Version.</p>
        ))}

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
