import { open } from '@tauri-apps/plugin-dialog'
import { readDir, readFile } from '@tauri-apps/plugin-fs'

/**
 * Nativer Ordner-Import statt `<input type="file" webkitdirectory>`
 * (Bugfix 2026-07-22, Nutzerbericht „Ordner-Upload: es passiert gar
 * nichts"): `webkitdirectory` gilt in WKWebView — dem Webview, das Tauri
 * unter macOS nutzt — als bekannt unzuverlässig (der „Auswählen"-Button im
 * Systemdialog kann beim Navigieren in einen Ordner deaktiviert bleiben).
 * `@tauri-apps/plugin-dialog`/`@tauri-apps/plugin-fs` sprechen stattdessen
 * direkt mit dem echten macOS-Öffnen-Dialog und dem Dateisystem — dieselbe
 * Technik, die `platform/documentStorage.ts` schon für
 * `$APPDATA/documents` nutzt, hier auf einen vom Nutzer frei gewählten
 * Ordner ausgeweitet (`$HOME/**`-Berechtigung in
 * `src-tauri/capabilities/default.json`).
 *
 * Funktioniert nur im echten Tauri-Fenster (dieselbe IPC-Einschränkung wie
 * `data/db.ts`/`platform/keychain.ts`).
 */

/** Öffnet den nativen Ordnerauswahl-Dialog. `null`, wenn abgebrochen. */
export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false })
  return typeof selected === 'string' ? selected : null
}

export interface PickedPdfFile {
  /**
   * Pfad relativ zum gewählten Wurzelordner, ohne dessen eigenen Namen
   * (z. B. `"Consumer Theory/Budget/folien.pdf"`, nicht
   * `"Microeconomics/Consumer Theory/Budget/folien.pdf"`) — analog zu
   * `File.webkitRelativePath`, aber ohne den Wurzelordner-Präfix, den der
   * Browser dort mitliefert. `App.tsx` `importFolder` erwartet dieses
   * Format (siehe dortiger Kommentar zu `folderNames`).
   */
  relativePath: string
  name: string
  data: Uint8Array
}

async function collectPdfPaths(dir: string, relativePrefix: string, out: { absolute: string; relative: string }[]): Promise<void> {
  const entries = await readDir(dir)
  for (const entry of entries) {
    const absolute = `${dir}/${entry.name}`
    const relative = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name
    if (entry.isDirectory) {
      await collectPdfPaths(absolute, relative, out)
    } else if (entry.isFile && entry.name.toLowerCase().endsWith('.pdf')) {
      out.push({ absolute, relative })
    }
  }
}

/** Liest alle PDFs unter `rootPath` rekursiv (Unterordner inklusive). */
export async function readPdfFilesRecursively(rootPath: string): Promise<PickedPdfFile[]> {
  const paths: { absolute: string; relative: string }[] = []
  await collectPdfPaths(rootPath, '', paths)

  const files: PickedPdfFile[] = []
  for (const { absolute, relative } of paths) {
    const data = await readFile(absolute)
    files.push({ relativePath: relative, name: relative.split('/').pop()!, data })
  }
  return files
}
