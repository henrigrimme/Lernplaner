import { open } from '@tauri-apps/plugin-dialog'
import { readDir, readFile } from '@tauri-apps/plugin-fs'
import { isSupportedDocument } from '../ingest/documentImport'

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

export interface PickedDocumentFile {
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

// Versteckte Systemdateien, die beim Durchsuchen eines vom Nutzer
// gewählten Ordners nie als "übersprungenes Dokument" zählen sollen (kein
// Lernmaterial, entstehen automatisch, z. B. macOS' `.DS_Store`).
const IGNORED_FILENAMES = new Set(['.ds_store', 'thumbs.db'])

async function collectPaths(
  dir: string,
  relativePrefix: string,
  documents: { absolute: string; relative: string }[],
  skipped: string[],
): Promise<void> {
  const entries = await readDir(dir)
  for (const entry of entries) {
    const absolute = `${dir}/${entry.name}`
    const relative = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name
    if (entry.isDirectory) {
      await collectPaths(absolute, relative, documents, skipped)
    } else if (entry.isFile) {
      if (isSupportedDocument(entry.name)) documents.push({ absolute, relative })
      else if (!IGNORED_FILENAMES.has(entry.name.toLowerCase())) skipped.push(relative)
    }
  }
}

export interface FolderReadResult {
  files: PickedDocumentFile[]
  /**
   * Pfade (relativ zum gewählten Ordner) aller gefundenen Dateien, die
   * NICHT importiert wurden, weil ihr Format nicht unterstützt ist
   * (`ingest/documentImport.ts` `isSupportedDocument` — z. B. `.csv`/
   * `.html`, bewusst ausgeschlossen, siehe dort). Wird sichtbar gemeldet
   * statt still übersprungen (Nutzerbericht 2026-07-22: „nicht alle
   * Dokumente wurden komplett übernommen" — betraf genau diesen Fall,
   * ohne jeden Hinweis, damals noch bei „nur PDF").
   */
  skipped: string[]
}

/** Liest alle unterstützten Dokumente unter `rootPath` rekursiv (Unterordner inklusive), meldet alle übrigen Dateien als übersprungen. */
export async function readDocumentFilesRecursively(rootPath: string): Promise<FolderReadResult> {
  const paths: { absolute: string; relative: string }[] = []
  const skipped: string[] = []
  await collectPaths(rootPath, '', paths, skipped)

  const files: PickedDocumentFile[] = []
  for (const { absolute, relative } of paths) {
    const data = await readFile(absolute)
    files.push({ relativePath: relative, name: relative.split('/').pop()!, data })
  }
  return { files, skipped }
}
