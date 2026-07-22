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
 */

export async function setKeychainSecret(account: string, value: string): Promise<void> {
  await invoke('keychain_set_secret', { account, value })
}

export async function getKeychainSecret(account: string): Promise<string | null> {
  const value = await invoke<string | null>('keychain_get_secret', { account })
  return value ?? null
}

export async function deleteKeychainSecret(account: string): Promise<void> {
  await invoke('keychain_delete_secret', { account })
}
