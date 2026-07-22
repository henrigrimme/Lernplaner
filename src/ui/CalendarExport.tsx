import { useState } from 'react'
import { buildCalendarEvents, openInCalendarApp, serializeIcs } from '../platform/calendarExport'
import { triggerDownload } from './triggerDownload'
import type { StudyBlock, Topic } from '../data/schema'

/**
 * Kalender-Export (ROADMAP.md Phase 3; ADR-006). Reine Präsentation nach
 * außen (ARCHITECTURE.md „ui/") — ICS-Erzeugung/-Export lebt vollständig in
 * `platform/calendarExport.ts`. Tägliche Startzeit ist hier lokaler
 * Zustand (kein Bestandteil des Schemas, siehe dortiger Kommentar).
 *
 * **„Exportieren" öffnet direkt Kalender.app** (`openInCalendarApp`) statt
 * nur eine Datei herunterzuladen — im Dev-Server-Browser (keine echte
 * Tauri-IPC-Bridge, dieselbe Einschränkung wie bei jedem anderen
 * `platform/`-Aufruf) fällt es auf den reinen Download zurück
 * (`triggerDownload`), dann muss die Datei manuell geöffnet werden.
 */

export interface CalendarExportProps {
  studyBlocks: StudyBlock[]
  topics: Topic[]
  /** ISO-Zeitstempel für `DTSTAMP` — vom Aufrufer, keine Systemuhr in der Komponente. */
  now: () => string
}

const DEFAULT_DAILY_START_TIME = '09:00'

export function CalendarExport({ studyBlocks, topics, now }: CalendarExportProps) {
  const [dailyStartTime, setDailyStartTime] = useState(DEFAULT_DAILY_START_TIME)
  const [error, setError] = useState<string | null>(null)

  const openBlocks = studyBlocks.filter((b) => b.status === 'offen')

  const handleExport = async () => {
    setError(null)
    const events = buildCalendarEvents(openBlocks, topics, dailyStartTime)
    const ics = serializeIcs(events, now())
    try {
      await openInCalendarApp(ics)
    } catch {
      triggerDownload('lernplaner.ics', ics, 'text/calendar')
      setError('Kalender.app konnte nicht direkt geöffnet werden (nur in der echten App verfügbar) — Datei wurde stattdessen heruntergeladen.')
    }
  }

  return (
    <section aria-label="Kalender-Export">
      <h2>Kalender-Export</h2>

      <label>
        Tägliche Startzeit
        <input type="time" value={dailyStartTime} onChange={(e) => setDailyStartTime(e.target.value)} />
      </label>

      <button type="button" onClick={handleExport} disabled={openBlocks.length === 0}>
        Exportieren
      </button>

      {openBlocks.length === 0 && <p>Noch keine offenen Lernblöcke zum Exportieren.</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
