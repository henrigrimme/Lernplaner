import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(here, 'src') },
  },
  // Tauri erwartet einen festen Port und meldet Fehler klar durch
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: {
    globals: true,
    environment: 'node',
    // ui/-Tests brauchen ein DOM, alle anderen (domain/ingest/data) sind
    // reine Funktionen und laufen schneller ohne jsdom — siehe
    // ARCHITECTURE.md "Tests".
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
})
