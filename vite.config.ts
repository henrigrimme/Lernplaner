import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Reine Build-/Dev-Server-Konfiguration, auch fürs Tauri-Fenster (siehe
// src-tauri/tauri.conf.json, "beforeDevCommand"/"beforeBuildCommand").
// Testkonfiguration lebt bewusst getrennt in vitest.config.ts: `defineConfig`
// aus `vitest/config` würde hier eine eigene, verschachtelte `vite`-Kopie
// mitziehen, die mit `@vitejs/plugin-react`s Typen aus der Top-Level-`vite`-
// Installation kollidiert (siehe CONTEXT.md Abschnitt 8).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(here, 'src') },
  },
  // Tauri erwartet einen festen Port und meldet Fehler klar durch
  clearScreen: false,
  server: { port: 1420, strictPort: true },
})
