/**
 * Globales Fehler-Banner für fehlgeschlagene Schreibvorgänge in die
 * Datenbank — die rund zwei Dutzend `handle*`-Funktionen in `App.tsx`.
 * Bis v0.28.0 endeten deren Fehler ausschließlich in `console.error`: der
 * Nutzer erfuhr nie, ob eine Änderung (neues Fach, Wiederholung, Prüfung,
 * gelöschte Karte …) wirklich gespeichert wurde. Für eine App, die über
 * Wochen die Prüfungsvorbereitung begleitet, ist unbemerkter Datenverlust
 * das größte Einzelrisiko (Impeccable-Kritik v0.28.0, Befund P0).
 *
 * Bewusst wie `UpdateBanner`/`NotificationBanner` aufgebaut (dieselbe
 * `.update-banner`-Optik, schwebend am oberen Rand des Inhalts), aber mit
 * `role="alert"` statt `role="status"` — ein fehlgeschlagenes Speichern
 * ist dringlicher als ein Hinweis und soll von Screenreadern sofort
 * angesagt werden. Reine Präsentation: die fertig formulierte Meldung
 * kommt aus `App.tsx` (`reportDbError`).
 *
 * **Nicht** an die Lade-Effekte in `App.tsx` angebunden: dort ist ein
 * Fehlschlag im Vite-Dev-Server/Browser der Normalfall (keine
 * Tauri-IPC-Bridge) und kein echter Datenverlust — die fangen weiterhin
 * still ab.
 */
export interface ErrorBannerProps {
  /** Fertige Fehlermeldung, oder `null` wenn nichts anzuzeigen ist. */
  message: string | null
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  // Kein automatisches Ausblenden — anders als eine Erfolgsmeldung muss
  // ein fehlgeschlagenes Speichern stehen bleiben, bis der Nutzer es
  // gesehen und weggeklickt hat.
  if (message === null) return null

  return (
    <div className="update-banner error-banner" role="alert">
      <span>
        <strong>Nicht gespeichert.</strong> {message}. Bitte den Vorgang erneut versuchen.
      </span>
      <div className="update-banner-actions">
        <button type="button" onClick={onDismiss} aria-label="Fehlermeldung schließen">
          ×
        </button>
      </div>
    </div>
  )
}
