import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

/**
 * Dünner Wrapper um `@tauri-apps/plugin-notification` — die einzige Datei,
 * die diese Abhängigkeit importiert (ARCHITECTURE.md „platform/ …
 * Benachrichtigungen … Gekapselt, damit eine spätere iOS-Version nicht die
 * halbe App anfassen muss"). **Was** benachrichtigt wird, entscheidet
 * `domain/notifications.ts` — diese Datei kennt nur **wie**.
 *
 * Funktioniert ausschließlich im echten Tauri-Fenster: die IPC-Bridge
 * (`window.__TAURI_INTERNALS__`), über die dieses Plugin mit dem
 * macOS-Benachrichtigungssystem spricht, existiert im Vite-Dev-Server/
 * Browser nicht. Nicht per Vitest testbar — bewusst so belassen wie
 * `ingest/pdf.ts`s Worker-Setup, das ebenfalls nur im Browser verifiziert
 * werden konnte.
 *
 * **Im Dev-Server-Browser geprüft (kein echtes Tauri-Fenster):**
 * `isPermissionGranted()`/`requestPermission()` werfen dort keinen Fehler,
 * sondern lösen sich zu „nicht erteilt" auf — `ensureNotificationPermission`
 * liefert `false`, `NotificationsPanel` zeigt dann ruhig „Keine neuen
 * Benachrichtigungen" statt eines Fehlers. `NotificationsPanel`s
 * Fehleranzeige bleibt trotzdem sinnvoll (Verteidigung für den Fall, dass
 * ein zukünftiges Tauri-Plugin doch wirft), wurde in dieser Form aber nicht
 * am echten Browser ausgelöst. **Noch nicht geprüft:** echtes Anzeigen
 * einer Benachrichtigung im tatsächlichen Tauri-Fenster (`npx tauri dev`,
 * System-Dialog zur Erlaubnis bestätigen) — bisher nicht in dieser Sitzung
 * gemacht, siehe CONTEXT.md.
 */

export async function ensureNotificationPermission(): Promise<boolean> {
  let granted = await isPermissionGranted()
  if (!granted) {
    const permission = await requestPermission()
    granted = permission === 'granted'
  }
  return granted
}

export async function showNotification(title: string, body: string): Promise<void> {
  await sendNotification({ title, body })
}
