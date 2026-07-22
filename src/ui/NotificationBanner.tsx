import { useState } from 'react'
import type { NotificationContent } from '../domain/notifications'

/**
 * In-App-Hinweis für fällige Benachrichtigungen (Tagesübersicht,
 * Fälligkeiten) — Gegenstück zu `UpdateBanner`. Auf Rückfrage entschieden
 * (2026-07-22, siehe DECISIONS.md): echte native macOS-Benachrichtigungen
 * (`platform/notifications.ts`) brauchen für die Berechtigungsabfrage
 * eine richtige Apple-Entwickler-ID-Signatur — ohne die registriert sich
 * die App beim System nicht, `requestPermission` verpufft lautlos (an
 * echter Nutzung entdeckt). Dieser Banner ist deshalb der *primäre*
 * Übertragungsweg, nicht nur ein Fallback: erscheint unabhängig davon, ob
 * die native Berechtigung je erteilt wurde.
 *
 * Reine Präsentation wie `UpdateBanner` — bekommt die fertig berechneten
 * `NotificationContent`s, kennt `domain/notifications.ts` nicht direkt.
 * Jede Art einzeln schließbar (nur für die laufende Sitzung, kein
 * Datenbankfeld nötig — beim nächsten Fällig-Werden erscheint sie ohnehin
 * wieder, `App.tsx`/`notificationLog` verhindert nur mehrfaches Anzeigen
 * am selben Tag).
 */

export interface NotificationBannerProps {
  notifications: NotificationContent[]
  onDismiss: (kind: NotificationContent['kind']) => void
}

export function NotificationBanner({ notifications, onDismiss }: NotificationBannerProps) {
  const [locallyDismissed, setLocallyDismissed] = useState<Set<string>>(new Set())

  const visible = notifications.filter((n) => !locallyDismissed.has(n.kind))
  if (visible.length === 0) return null

  const dismiss = (kind: NotificationContent['kind']) => {
    setLocallyDismissed((prev) => new Set(prev).add(kind))
    onDismiss(kind)
  }

  return (
    <>
      {visible.map((notification) => (
        <div className="update-banner" role="status" key={notification.kind}>
          <span>
            <strong>{notification.title}</strong> — {notification.body}
          </span>
          <div className="update-banner-actions">
            <button type="button" onClick={() => dismiss(notification.kind)} aria-label={`${notification.title} schließen`}>
              ×
            </button>
          </div>
        </div>
      ))}
    </>
  )
}
