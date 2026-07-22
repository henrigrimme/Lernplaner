use tauri_plugin_sql::{Migration, MigrationKind};

const KEYCHAIN_SERVICE: &str = "com.henrigrimme.lernplaner";

/// Schreibt einen Wert (z. B. den Claude-API-Key) in die macOS-Keychain
/// (SECURITY.md „Im Programm: in der macOS-Keychain"). `account` ist der
/// Schlüsselname innerhalb des Service (z. B. `"anthropic_api_key"`), nicht
/// der Wert selbst.
#[tauri::command]
fn keychain_set_secret(account: String, value: String) -> Result<(), String> {
  keyring::Entry::new(KEYCHAIN_SERVICE, &account)
    .and_then(|entry| entry.set_password(&value))
    .map_err(|e| e.to_string())
}

/// Liest einen Wert aus der Keychain. `Ok(None)`, wenn noch kein Schlüssel
/// gespeichert wurde — kein Fehlerfall, sondern der normale Erststart.
#[tauri::command]
fn keychain_get_secret(account: String) -> Result<Option<String>, String> {
  match keyring::Entry::new(KEYCHAIN_SERVICE, &account) {
    Ok(entry) => match entry.get_password() {
      Ok(value) => Ok(Some(value)),
      Err(keyring::Error::NoEntry) => Ok(None),
      Err(e) => Err(e.to_string()),
    },
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn keychain_delete_secret(account: String) -> Result<(), String> {
  match keyring::Entry::new(KEYCHAIN_SERVICE, &account) {
    Ok(entry) => match entry.delete_credential() {
      Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
      Err(e) => Err(e.to_string()),
    },
    Err(e) => Err(e.to_string()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Migrationen liegen als reine SQL-Dateien in src/data/migrations/ (siehe
  // ARCHITECTURE.md), damit tests/data/schema.test.ts sie gegen
  // better-sqlite3 prüfen kann, ohne eine Tauri-Laufzeit zu brauchen.
  // tauri-plugin-sql wendet dieselben Dateien hier zur Laufzeit an und
  // verfolgt selbst, welche Version schon angewendet wurde — kein eigener
  // Migrationsrunner nötig.
  let migrations = vec![
    Migration {
      version: 1,
      description: "init",
      sql: include_str!("../../src/data/migrations/0001_init.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "ai_usage",
      sql: include_str!("../../src/data/migrations/0002_ai_usage.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "document_type_label",
      sql: include_str!("../../src/data/migrations/0003_document_type_label.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 4,
      description: "quiz_language_and_options",
      sql: include_str!("../../src/data/migrations/0004_quiz_language_and_options.sql"),
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_notification::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:lernplaner.db", migrations)
        .build(),
    )
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![
      keychain_set_secret,
      keychain_get_secret,
      keychain_delete_secret
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
