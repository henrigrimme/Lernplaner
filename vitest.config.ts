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
  },
})
