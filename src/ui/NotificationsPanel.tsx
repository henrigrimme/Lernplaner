import { useState } from 'react'
import type { NotificationContent } from '../domain/notifications'

/**
 * Lokale Benachrichtigungen (ROADMAP.md Phase 3). Reine Präsentation nach
 * außen (ARCHITECTURE.md „ui/") — `onCheckNow` kapselt sowohl die
 * Entscheidung (`domain/notifications.ts`) als auch das tatsächliche
 * Anzeigen (`platform/notifications.ts`); diese Komponente kennt nur das
 * Ergebnis bzw. einen eventuellen Fehler.
 *
 * **Kein automatischer Hintergrund-Trigger:** `App.tsx` hat keinen echten
 * Scheduler (kein `tauri-plugin-cron` o. Ä.), deshalb ein manueller
 * „Jetzt prüfen"-Knopf statt einer festen Uhrzeit — ein täglicher
 * Hintergrund-Check ist eine spätere Erweiterung, kein Teil dieses
 * Schritts.
 */

export interface NotificationsPanelProps {
  onCheckNow: () => Promise<NotificationContent[]>
}

export function NotificationsPanel({ onCheckNow }: NotificationsPanelProps) {
  const [checking, setChecking] = useState(false)
  const [shown, setShown] = useState<NotificationContent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkNow = async () => {
    setChecking(true)
    setError(null)
    try {
      const result = await onCheckNow()
      setShown(result)
    } catch {
      setError('Benachrichtigungen sind nur in der echten App verfügbar, nicht im Dev-Server-Browser.')
      setShown(null)
    } finally {
      setChecking(false)
    }
  }

  return (
    <section aria-label="Benachrichtigungen">
      <h2>Benachrichtigungen</h2>

      <button type="button" onClick={checkNow} disabled={checking}>
        Jetzt prüfen
      </button>

      {shown !== null &&
        (shown.length === 0 ? (
          <p>Keine neuen Benachrichtigungen.</p>
        ) : (
          <ul>
            {shown.map((n, i) => (
              <li key={i}>
                {n.title}: {n.body}
              </li>
            ))}
          </ul>
        ))}

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
