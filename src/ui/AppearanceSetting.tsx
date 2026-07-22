export type ThemePreference = 'system' | 'light' | 'dark'
export type PalettePreference = 'terrakotta' | 'racing-green' | 'nato-olive' | 'petrol' | 'bordeaux'

interface AppearanceSettingProps {
  theme: ThemePreference
  onChangeTheme: (theme: ThemePreference) => void
  palette: PalettePreference
  onChangePalette: (palette: PalettePreference) => void
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

/** Swatch-Farben rein zur Vorschau im Formular — echte Werte kommen aus tokens.css `[data-palette]`, hier nur dupliziert für die Anzeige ohne Laufzeit-CSS-Auslesen. */
export const PALETTE_OPTIONS: { value: PalettePreference; label: string; swatch: string }[] = [
  { value: 'terrakotta', label: 'Terrakotta (Standard)', swatch: '#c9754f' },
  { value: 'racing-green', label: 'British Racing Green', swatch: '#2c5a3e' },
  { value: 'nato-olive', label: 'NATO Olive', swatch: '#6b6234' },
  { value: 'petrol', label: 'Petrol', swatch: '#3d7a8c' },
  { value: 'bordeaux', label: 'Bordeaux', swatch: '#7a3838' },
]

/**
 * Reine Präsentationskomponente (ARCHITECTURE.md „ui/") — der eigentliche
 * Zustand (`theme`/`palette`, `localStorage`-Persistenz, `data-theme`/
 * `data-palette`-Attribute auf `<html>`) lebt in `App.tsx`, analog zu
 * `sidebarWidth`/`sidebarCollapsed`. „System" (Default-Theme) und
 * „Terrakotta" (Default-Palette) setzen kein Attribut — dann gelten
 * unverändert die bisherigen Grundwerte (`tokens.css`).
 */
export function AppearanceSetting({ theme, onChangeTheme, palette, onChangePalette }: AppearanceSettingProps) {
  return (
    <section aria-label="Erscheinungsbild">
      <h2>Erscheinungsbild</h2>
      <div role="radiogroup" aria-label="Hell/Dunkel-Modus">
        {THEME_OPTIONS.map((opt) => (
          <label key={opt.value}>
            <input type="radio" name="theme" value={opt.value} checked={theme === opt.value} onChange={() => onChangeTheme(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>

      <div role="radiogroup" aria-label="Farbpalette">
        {PALETTE_OPTIONS.map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name="palette"
              value={opt.value}
              checked={palette === opt.value}
              onChange={() => onChangePalette(opt.value)}
            />
            <span className="color-swatch" style={{ backgroundColor: opt.swatch }} aria-hidden="true" />
            {opt.label}
          </label>
        ))}
      </div>
    </section>
  )
}
