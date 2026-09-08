import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Kopiert die WASM-Datei von `sql.js` nach `public/`, damit sie zur
// Laufzeit unter `/sql-wasm.wasm` erreichbar ist (siehe
// `src/ingest/anki.ts` `createSqlDatabase` — `.apkg`-Import liest die
// eingebettete SQLite-Sammlung). `buildStart` läuft für `vite` (Dev) wie
// `vite build`. Die Datei selbst ist gitignored (generiert aus einer
// Abhängigkeit).
function copySqlJsWasm() {
  return {
    name: 'copy-sql-js-wasm',
    buildStart() {
      copyFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'), resolve(here, 'public/sql-wasm.wasm'))
    },
  }
}

// Reine Build-/Dev-Server-Konfiguration, auch fürs Tauri-Fenster (siehe
// src-tauri/tauri.conf.json, "beforeDevCommand"/"beforeBuildCommand").
// Testkonfiguration lebt bewusst getrennt in vitest.config.ts: `defineConfig`
// aus `vitest/config` würde hier eine eigene, verschachtelte `vite`-Kopie
// mitziehen, die mit `@vitejs/plugin-react`s Typen aus der Top-Level-`vite`-
// Installation kollidiert (siehe CONTEXT.md Abschnitt 8).
export default defineConfig({
  plugins: [react(), copySqlJsWasm()],
  resolve: {
    alias: { '@': resolve(here, 'src') },
  },
  // Tauri erwartet einen festen Port und meldet Fehler klar durch
  clearScreen: false,
  server: { port: 1420, strictPort: true },
})
