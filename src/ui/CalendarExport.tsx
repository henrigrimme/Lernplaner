import { useState } from 'react'
import { buildCalendarEvents, serializeIcs } from '../platform/calendarExport'
import { triggerDownload } from './triggerDownload'
import type { StudyBlock, Topic } from '../data/schema'

/**
 * Kalender-Export (ROADMAP.md Phase 3; ADR-006). Reine Präsentation nach
 * außen (ARCHITECTURE.md „ui/") — ICS-Erzeugung lebt vollständig in
 * `platform/calendarExport.ts`. Tägliche Startzeit ist hier lokaler
 * Zustand (kein Bestandteil des Schemas, siehe dortiger Kommentar).
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

  const openBlocks = studyBlocks.filter((b) => b.status === 'offen')

  const handleExport = () => {
    const events = buildCalendarEvents(openBlocks, topics, dailyStartTime)
    triggerDownload('lernplaner.ics', serializeIcs(events, now()), 'text/calendar')
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
    </section>
  )
}
