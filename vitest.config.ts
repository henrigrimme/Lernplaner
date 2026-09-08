import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Getrennt von vite.config.ts (siehe dort) — Tests brauchen keinen
// @vitejs/plugin-react, esbuild transformiert JSX/TSX bereits gemäß
// tsconfig.json ("jsx": "react-jsx").
export default defineConfig({
  resolve: {
    alias: { '@': resolve(here, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    // ui/-Tests brauchen ein DOM, alle anderen (domain/ingest/data) sind
    // reine Funktionen und laufen schneller ohne jsdom — siehe
    // ARCHITECTURE.md "Tests".
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    // `forks` statt des Standard-`threads`-Pools: mehrere Testdateien
    // nutzen native Addons (`better-sqlite3` in `tests/data/*` und
    // `tests/ingest/anki`) bzw. sql.js-WASM. Unter dem Worker-**Threads**-
    // Pool trat im vollen Parallel-Lauf selten (~10 %) ein Fehlschlag auf,
    // der in Einzel-/erneuten Läufen nie reproduzierbar war — ein
    // bekanntes Muster bei nativen Node-Addons in Worker-Threads.
    // Prozess-Isolation (`forks`) beseitigt das; minimal langsamer.
    pool: 'forks',
  },
})
