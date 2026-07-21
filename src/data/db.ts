import Database from '@tauri-apps/plugin-sql'

/**
 * Echte SQLite-Anbindung (ARCHITECTURE.md „data/"). Einzige Datei, die
 * `@tauri-apps/plugin-sql` importiert — wie `platform/notifications.ts`
 * für das Notification-Plugin. Funktioniert nur im echten Tauri-Fenster:
 * die IPC-Bridge, über die dieses Plugin mit der SQLite-Datei spricht,
 * existiert im Vite-Dev-Server/Browser nicht (dieselbe Einschränkung wie
 * bei den Benachrichtigungen).
 *
 * **Migrationen laufen nicht hier**, sondern in `src-tauri/src/lib.rs`
 * (`tauri_plugin_sql::Builder::add_migrations`, liest dieselben
 * `src/data/migrations/*.sql`-Dateien, die auch `tests/data/schema.test.ts`
 * gegen `better-sqlite3` prüft) — das Plugin verfolgt selbst, welche
 * Version schon angewendet wurde, ein eigener Migrationsrunner ist damit
 * nicht nötig. Diese Datei öffnet nur die bereits migrierte Datenbank.
 *
 * Der Datenbankname (`sqlite:lernplaner.db`) muss mit dem in
 * `src-tauri/src/lib.rs` übereinstimmen — beide verweisen auf dieselbe
 * Datei im App-Datenverzeichnis (SECURITY.md: „~/Library/Application
 * Support/Lernplaner/"), `@tauri-apps/plugin-sql` löst den relativen Namen
 * automatisch dorthin auf.
 */

const DATABASE_URL = 'sqlite:lernplaner.db'

let dbPromise: Promise<Database> | null = null

/** Lazy-Singleton — die Verbindung wird beim ersten Aufruf einmalig aufgebaut. */
export function getDb(): Promise<Database> {
  dbPromise ??= Database.load(DATABASE_URL)
  return dbPromise
}

/**
 * Die Teilmenge von `Database`, die die `data/*Repo.ts`-Module brauchen —
 * als eigenes Interface, damit Repository-Funktionen nicht direkt gegen
 * `@tauri-apps/plugin-sql`s Klasse geschrieben werden (schmalere
 * Abhängigkeit, leichter durch eine Test-Implementierung ersetzbar, analog
 * zum bereits bestehenden `SqlExecutor` in `data/importTopics.ts`).
 */
export interface SqlConnection {
  execute(sql: string, params?: unknown[]): Promise<{ lastInsertId: number; rowsAffected: number }>
  select<T>(sql: string, params?: unknown[]): Promise<T[]>
}
