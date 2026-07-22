import { invoke } from '@tauri-apps/api/core'

/**
 * Dünner Wrapper um die Rust-Commands `keychain_*` (`src-tauri/src/lib.rs`)
 * — analog zu `platform/notifications.ts`/`platform/updater.ts` die einzige
 * Datei, die diese Commands direkt aufruft (ARCHITECTURE.md „platform/ …
 * Gekapselt"). Speichert Geheimnisse in der macOS-Keychain, nie in der
 * Datenbank oder einer Datei (SECURITY.md „Im Programm: in der
 * macOS-Keychain").
 *
 * Funktioniert nur im echten Tauri-Fenster — keine IPC-Bridge im
 * Vite-Dev-Server/Browser (dieselbe Einschränkung wie `data/db.ts`).
 *
 * **In-Memory-Cache pro `account`, für die Dauer der laufenden Sitzung**
 * (Nutzerwunsch, 2026-07-22: der macOS-Keychain-Zugriffsdialog erschien
 * störend oft). Jeder native `keychain_get_secret`-Aufruf kann macOS' "App
 * möchte auf Ihre Keychain zugreifen"-Abfrage auslösen — ohne Cache holte
 * `AiSettings.tsx` (bei jedem Öffnen von „Einstellungen") und jede
 * KI-Funktion (`ai/index.ts` `getConfiguredAIProvider`, bei jeder einzelnen
 * Nutzung) den Wert frisch aus der Keychain, auch mehrfach pro Sitzung.
 * Mit dem Cache passiert der eigentliche natives Lesen höchstens einmal je
 * `account` und App-Start; danach bedient dieselbe Sitzung sich aus dem
 * Speicher. Der Cache wird beim Neustart der App verworfen (reines
 * Modul-Level-`Map`, kein `localStorage`) — kein Sicherheitsproblem, da nie
 * mehr im Speicher gehalten wird als ohnehin während der Sitzung gebraucht
 * würde. **Löst nicht** den separaten, dokumentierten Grund, warum der
 * Dialog nach jedem neuen Release-Build erneut erscheint (fehlende
 * Apple-Developer-ID-Signatur, siehe CONTEXT.md ADR-008/009) — das bleibt
 * bestehen, ist aber ein Signatur-, kein Zugriffshäufigkeits-Problem.
 */
const secretCache = new Map<string, string | null>()

export async function setKeychainSecret(account: string, value: string): Promise<void> {
  await invoke('keychain_set_secret', { account, value })
  secretCache.set(account, value)
}

export async function getKeychainSecret(account: string): Promise<string | null> {
  if (secretCache.has(account)) return secretCache.get(account)!
  const value = (await invoke<string | null>('keychain_get_secret', { account })) ?? null
  secretCache.set(account, value)
  return value
}

export async function deleteKeychainSecret(account: string): Promise<void> {
  await invoke('keychain_delete_secret', { account })
  secretCache.set(account, null)
}
