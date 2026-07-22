export type ThemePreference = 'system' | 'light' | 'dark'

interface AppearanceSettingProps {
  theme: ThemePreference
  onChange: (theme: ThemePreference) => void
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

/**
 * Reine Präsentationskomponente (ARCHITECTURE.md „ui/") — der eigentliche
 * Zustand (`theme`, `localStorage`-Persistenz, `data-theme`-Attribut auf
 * `<html>`) lebt in `App.tsx`, analog zu `sidebarWidth`/`sidebarCollapsed`.
 * „System" (Default) setzt kein Attribut — dann greift ausschließlich
 * `prefers-color-scheme` (`tokens.css`), genau wie vor dieser Funktion.
 */
export function AppearanceSetting({ theme, onChange }: AppearanceSettingProps) {
  return (
    <section aria-label="Erscheinungsbild">
      <h2>Erscheinungsbild</h2>
      <div role="radiogroup" aria-label="Hell/Dunkel-Modus">
        {OPTIONS.map((opt) => (
          <label key={opt.value}>
            <input type="radio" name="theme" value={opt.value} checked={theme === opt.value} onChange={() => onChange(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    </section>
  )
}
