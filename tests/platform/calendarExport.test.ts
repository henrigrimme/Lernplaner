import { describe, expect, it } from 'vitest'
import { buildCalendarEvents, serializeIcs } from '../../src/platform/calendarExport'
import type { StudyBlock, Topic } from '../../src/data/schema'

function block(overrides: Partial<StudyBlock> & { id: number }): StudyBlock {
  return {
    topic_id: 1,
    assessment_id: 1,
    kind: 'erstdurchgang',
    planned_date: '2026-08-03',
    planned_minutes: 45,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

function topic(id: number, name: string): Pick<Topic, 'id' | 'name'> {
  return { id, name }
}

describe('buildCalendarEvents', () => {
  it('legt den ersten Block eines Tages auf die Startzeit', () => {
    const events = buildCalendarEvents([block({ id: 1, planned_minutes: 45 })], [topic(1, 'Consumer Theory')], '09:00')
    expect(events).toHaveLength(1)
    expect(events[0]!.start.toISOString()).toBe('2026-08-03T09:00:00.000Z')
    expect(events[0]!.end.toISOString()).toBe('2026-08-03T09:45:00.000Z')
    expect(events[0]!.summary).toBe('Erstdurchgang: Consumer Theory')
  })

  it('legt Blöcke desselben Tages nach planned_order lückenlos hintereinander', () => {
    const blocks = [
      block({ id: 1, planned_order: 0, planned_minutes: 45 }),
      block({ id: 2, planned_order: 1, planned_minutes: 30 }),
    ]
    const events = buildCalendarEvents(blocks, [topic(1, 'X')], '09:00')
    expect(events[0]!.start.toISOString()).toBe('2026-08-03T09:00:00.000Z')
    expect(events[0]!.end.toISOString()).toBe('2026-08-03T09:45:00.000Z')
    expect(events[1]!.start.toISOString()).toBe('2026-08-03T09:45:00.000Z') // direkt im Anschluss
    expect(events[1]!.end.toISOString()).toBe('2026-08-03T10:15:00.000Z')
  })

  it('respektiert planned_order unabhängig von der Reihenfolge im Eingabe-Array', () => {
    const blocks = [
      block({ id: 2, planned_order: 1, planned_minutes: 30 }),
      block({ id: 1, planned_order: 0, planned_minutes: 45 }),
    ]
    const events = buildCalendarEvents(blocks, [], '09:00')
    expect(events.map((e) => e.uid)).toEqual(['lernplaner-block-1@lernplaner.local', 'lernplaner-block-2@lernplaner.local'])
  })

  it('behandelt verschiedene Tage unabhängig voneinander, jeweils ab der Startzeit', () => {
    const blocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45 }),
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 30 }),
    ]
    const events = buildCalendarEvents(blocks, [], '09:00')
    expect(events[0]!.start.toISOString()).toBe('2026-08-03T09:00:00.000Z')
    expect(events[1]!.start.toISOString()).toBe('2026-08-04T09:00:00.000Z') // nicht kumulativ über Tage hinweg
  })

  it('ignoriert erledigte und gestrichene Blöcke', () => {
    const blocks = [block({ id: 1, status: 'erledigt' }), block({ id: 2, status: 'gestrichen' })]
    expect(buildCalendarEvents(blocks, [], '09:00')).toEqual([])
  })

  it('fällt auf "Lernblock" zurück, wenn kein Thema zugeordnet ist', () => {
    const events = buildCalendarEvents([block({ id: 1, topic_id: null })], [], '09:00')
    expect(events[0]!.summary).toBe('Erstdurchgang: Lernblock')
  })
})

describe('serializeIcs', () => {
  it('erzeugt eine gültige ICS-Struktur mit CRLF-Zeilenenden', () => {
    const events = buildCalendarEvents([block({ id: 1 })], [topic(1, 'Consumer Theory')], '09:00')
    const ics = serializeIcs(events, '2026-07-21T12:00:00.000Z')

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('DTSTAMP:20260721T120000Z') // echter UTC-Zeitpunkt, mit Z
    expect(ics).toContain('DTSTART:20260803T090000') // floatende lokale Zeit, ohne Z
    expect(ics).toContain('SUMMARY:Erstdurchgang: Consumer Theory')
    expect(ics).toContain('UID:lernplaner-block-1@lernplaner.local')
  })

  it('maskiert Sonderzeichen in SUMMARY/DESCRIPTION', () => {
    const events = [
      {
        uid: 'x',
        start: new Date('2026-08-03T09:00:00.000Z'),
        end: new Date('2026-08-03T09:45:00.000Z'),
        summary: 'Thema; mit, Komma',
        description: 'Zeile 1\nZeile 2',
      },
    ]
    const ics = serializeIcs(events, '2026-07-21T12:00:00.000Z')
    expect(ics).toContain('SUMMARY:Thema\\; mit\\, Komma')
    expect(ics).toContain('DESCRIPTION:Zeile 1\\nZeile 2')
  })

  it('liefert ein leeres Kalendergerüst ohne Ereignisse', () => {
    const ics = serializeIcs([], '2026-07-21T12:00:00.000Z')
    expect(ics).not.toContain('BEGIN:VEVENT')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
  })
})
