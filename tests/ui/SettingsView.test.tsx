import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsView } from '../../src/ui/SettingsView'

/**
 * Rendert absichtlich die echten Unterkomponenten (kein Mock) — dieselbe
 * Zusammensetzung wie in `App.tsx`. `AiSettings`/`NotificationsPanel`
 * greifen beim Mounten auf Tauri-Plugins zu, die in jsdom fehlschlagen;
 * das ist erwartetes, bereits an anderer Stelle etabliertes Verhalten
 * (abgefangene Fehler, kein Absturz) — hier geht es nur darum, dass die
 * Reiter-Struktur selbst richtig funktioniert.
 */
function baseProps() {
  return {
    onCheckForUpdate: vi.fn().mockResolvedValue({ version: '1.0.0', notes: '', pubDate: '', downloadAndInstall: vi.fn() }),
    onInstallUpdate: vi.fn().mockResolvedValue(undefined),
    theme: 'system' as const,
    onChangeTheme: vi.fn(),
    palette: 'terrakotta' as const,
    onChangePalette: vi.fn(),
    onCheckNotifications: vi.fn().mockResolvedValue([]),
    studyBlocks: [],
    topics: [],
    courses: [],
    topicSections: [],
    assessments: [],
    onImportCourse: vi.fn(),
  }
}

describe('SettingsView', () => {
  it('zeigt standardmäßig den Reiter "Allgemein" mit den App-Updates', () => {
    render(<SettingsView {...baseProps()} />)
    expect(screen.getByRole('tab', { name: 'Allgemein' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'App-Updates' })).toBeVisible()
  })

  it('listet alle fünf Kategorien als Reiter', () => {
    render(<SettingsView {...baseProps()} />)
    expect(screen.getByRole('tab', { name: 'Allgemein' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Erscheinungsbild' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'KI-Anbindung' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Benachrichtigungen' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Daten' })).toBeInTheDocument()
  })

  it('wechselt zum Reiter "Erscheinungsbild" und zeigt dessen Inhalt', async () => {
    const user = userEvent.setup()
    render(<SettingsView {...baseProps()} />)

    await user.click(screen.getByRole('tab', { name: 'Erscheinungsbild' }))

    expect(screen.getByRole('region', { name: 'Erscheinungsbild' })).toBeVisible()
    // `hidden` entfernt das Panel komplett aus dem Accessibility-Tree (anders
    // als reines CSS-Verstecken) — `getByRole` fände es dort gar nicht mehr,
    // deshalb `queryByRole` statt `getByRole` für den ausgeblendeten Reiter.
    expect(screen.queryByRole('region', { name: 'App-Updates' })).not.toBeInTheDocument()
  })

  it('zeigt im Reiter "Daten" sowohl Kalender-Export als auch Kurs-Export/Import', async () => {
    const user = userEvent.setup()
    render(<SettingsView {...baseProps()} />)

    await user.click(screen.getByRole('tab', { name: 'Daten' }))

    expect(screen.getByRole('region', { name: 'Kalender-Export' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Kurs-Export/Import' })).toBeVisible()
  })
})
