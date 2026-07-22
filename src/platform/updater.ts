import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/**
 * Dünner Wrapper um `@tauri-apps/plugin-updater` — analog zu
 * `platform/notifications.ts` die einzige Datei, die diese Abhängigkeit
 * importiert (ARCHITECTURE.md „platform/ … Gekapselt"). Funktioniert nur im
 * echten Tauri-Fenster (dieselbe IPC-Einschränkung wie bei
 * `notifications.ts`/`data/db.ts` — kein Update-Check im Vite-Dev-Server).
 *
 * Update-Quelle ist der öffentliche GitHub-Release
 * (`tauri.conf.json`, `plugins.updater.endpoints`) — funktioniert nur, weil
 * das Repo public ist (auf Rückfrage entschieden): private Release-Assets
 * ließen sich vom unauthentifizierten Update-Check der App nicht abrufen.
 */

export interface UpdateCheckResult {
  available: boolean
  version?: string
  body?: string
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const update = await check()
  if (!update) return { available: false }
  return {
    available: true,
    version: update.version,
    ...(update.body !== undefined && { body: update.body }),
  }
}

export async function installUpdateAndRestart(): Promise<void> {
  const update = await check()
  if (!update) return
  await update.downloadAndInstall()
  await relaunch()
}
