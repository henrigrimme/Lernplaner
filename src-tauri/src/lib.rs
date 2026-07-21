use tauri_plugin_sql::{Migration, MigrationKind};

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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
