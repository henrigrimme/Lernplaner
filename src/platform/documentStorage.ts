import { exists, mkdir, readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs'

/**
 * Persistiert importierte PDFs auf der Festplatte statt nur im
 * Programmspeicher (Nutzerwunsch 2026-07-22: Materialien sollen einen
 * Neustart der App bzw. des Rechners überstehen, nicht nur für die
 * laufende Sitzung verfügbar sein). Dünner Wrapper um
 * `@tauri-apps/plugin-fs` — analog zu `platform/keychain.ts`/
 * `platform/notifications.ts` die einzige Datei, die diese Abhängigkeit
 * direkt importiert (ARCHITECTURE.md „platform/ … Gekapselt").
 *
 * Ablage unter `$APPDATA/documents/<sha256>.pdf` — derselbe App-
 * Datenordner, in dem laut `data/db.ts`-Kommentar auch `lernplaner.db`
 * liegt (`~/Library/Application Support/Lernplaner/` unter macOS). Der
 * Dateiname ist der sha256-Hash des Inhalts (ohnehin schon berechnet,
 * siehe `data/importTopics.ts` `computeSha256`) statt des Original-
 * Dateinamens — vermeidet Kollisionen zwischen Dokumenten mit demselben
 * Dateinamen aus unterschiedlichen Fächern.
 *
 * Funktioniert nur im echten Tauri-Fenster (dieselbe IPC-Einschränkung
 * wie `data/db.ts`) — Aufrufer fangen Fehler ab und behandeln ein Fach
 * ohne wiederherstellbares PDF wie bisher schon (`ui/SourceViewer.tsx`
 * „PDF nicht mehr verfügbar").
 */

const DOCUMENTS_DIR = 'documents'

async function ensureDocumentsDir(): Promise<void> {
  if (!(await exists(DOCUMENTS_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(DOCUMENTS_DIR, { baseDir: BaseDirectory.AppData, recursive: true })
  }
}

/** Schreibt die PDF-Bytes auf die Festplatte und liefert den relativen `stored_path` für `documents.stored_path`. */
export async function saveDocumentFile(sha256: string, data: Uint8Array): Promise<string> {
  await ensureDocumentsDir()
  const path = `${DOCUMENTS_DIR}/${sha256}.pdf`
  await writeFile(path, data, { baseDir: BaseDirectory.AppData })
  return path
}

/** `null`, wenn die Datei fehlt (z. B. ein vor dieser Änderung importiertes Dokument mit `in-memory://`-Platzhalter). */
export async function loadDocumentFile(storedPath: string): Promise<Uint8Array | null> {
  try {
    return await readFile(storedPath, { baseDir: BaseDirectory.AppData })
  } catch {
    return null
  }
}
