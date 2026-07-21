import type { StudyBlock, StudyBlockKind, Topic } from '../data/schema'

/**
 * Kalender-Export (ROADMAP.md Phase 3; ADR-006 „Einseitiger
 * Kalenderexport": „Lernblöcke werden in einen eigenen Kalender
 * exportiert. Kein Rückkanal."). Reine Textformat-Erzeugung (ICS,
 * RFC 5545) — kein Tauri-Plugin/OS-Aufruf nötig, anders als
 * `platform/notifications.ts`; trotzdem hier statt in `domain/`, weil
 * ARCHITECTURE.md „Kalender-Export" explizit der `platform/`-Schicht
 * zuordnet.
 *
 * **Uhrzeit-Entscheidung (mit dem Nutzer geklärt, da `study_blocks` nur
 * ein Datum trägt, keine Tageszeit):** feste, vom Nutzer einstellbare
 * tägliche Startzeit; Blöcke eines Tages werden ab dort lückenlos
 * hintereinander gelegt, sortiert nach `planned_order`. Keine neue Spalte
 * im Schema — die Uhrzeit wird beim Export aus Startzeit + Reihenfolge +
 * `planned_minutes` berechnet, nicht gespeichert (Speichern würde bei
 * jeder Neuplanung veralten, ähnlich der Begründung für „Abgeleitete
 * Werte" in DATA_MODEL.md).
 *
 * **Bewusst „floatende" Uhrzeiten (kein `Z`-Suffix, keine `TZID`):** beide
 * Nutzer lernen in derselben Zeitzone (WHU, CONTEXT.md „Nutzer") — eine
 * echte Zeitzonen-Behandlung wäre hier reine Komplexität ohne Nutzen.
 * `DTSTAMP` ist die einzige Ausnahme (echter UTC-Zeitpunkt der Erzeugung,
 * mit `Z`) — dafür verlangt RFC 5545 einen echten Zeitpunkt, keine lokale
 * Uhrzeit.
 *
 * **Nur `study_blocks` mit Status `offen`** — Vergangenes/Erledigtes
 * braucht keinen Kalender-Eintrag mehr, Gestrichenes erst recht nicht.
 */

const KIND_LABELS: Record<StudyBlockKind, string> = {
  erstdurchgang: 'Erstdurchgang',
  wiederholung: 'Wiederholung',
  uebung: 'Übung',
  quiz: 'Quiz',
  puffer: 'Puffer',
}

export interface CalendarEvent {
  uid: string
  start: Date
  end: Date
  summary: string
  description: string
}

function parseTimeOfDay(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours: hours ?? 0, minutes: minutes ?? 0 }
}

/**
 * Baut Kalender-Ereignisse aus offenen `study_blocks`: pro Tag werden die
 * Blöcke nach `planned_order` sortiert und ab `dailyStartTime` („HH:MM")
 * lückenlos hintereinander gelegt.
 */
export function buildCalendarEvents(
  studyBlocks: StudyBlock[],
  topics: Pick<Topic, 'id' | 'name'>[],
  dailyStartTime: string,
): CalendarEvent[] {
  const { hours, minutes } = parseTimeOfDay(dailyStartTime)
  const topicById = new Map(topics.map((t) => [t.id, t.name]))

  const byDate = new Map<string, StudyBlock[]>()
  for (const block of studyBlocks.filter((b) => b.status === 'offen')) {
    const forDate = byDate.get(block.planned_date) ?? []
    forDate.push(block)
    byDate.set(block.planned_date, forDate)
  }

  const events: CalendarEvent[] = []
  for (const [date, dayBlocks] of byDate) {
    const sorted = [...dayBlocks].sort((a, b) => a.planned_order - b.planned_order)
    let offsetMinutes = 0
    for (const block of sorted) {
      const start = new Date(`${date}T00:00:00.000Z`)
      start.setUTCHours(hours, minutes + offsetMinutes, 0, 0)
      const end = new Date(start.getTime() + block.planned_minutes * 60_000)

      const topicName = block.topic_id !== null ? (topicById.get(block.topic_id) ?? `Thema ${block.topic_id}`) : 'Lernblock'
      events.push({
        uid: `lernplaner-block-${block.id}@lernplaner.local`,
        start,
        end,
        summary: `${KIND_LABELS[block.kind]}: ${topicName}`,
        description: `${block.planned_minutes} Minuten geplant.`,
      })
      offsetMinutes += block.planned_minutes
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Floatende ICS-Uhrzeit (kein `Z`) — siehe Modul-Kommentar. */
function formatFloating(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes(),
  )}${pad(date.getUTCSeconds())}`
}

/** Echte UTC-ICS-Uhrzeit (mit `Z`) — nur für `DTSTAMP`, siehe Modul-Kommentar. */
function formatUtc(date: Date): string {
  return `${formatFloating(date)}Z`
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Serialisiert Ereignisse zu einer ICS-Datei (RFC 5545, CRLF-Zeilenenden). */
export function serializeIcs(events: CalendarEvent[], exportedAt: string): string {
  const stamp = formatUtc(new Date(exportedAt))
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lernplaner//DE', 'CALSCALE:GREGORIAN']

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatFloating(event.start)}`,
      `DTEND:${formatFloating(event.end)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
