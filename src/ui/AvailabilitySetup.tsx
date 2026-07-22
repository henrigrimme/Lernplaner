import { useState } from 'react'
import type { AvailabilityException, AvailabilityPattern } from '../data/schema'

/**
 * Verfügbarkeits-Setup: Wochenmuster (Minuten je Wochentag) plus einzelne
 * abweichende Tage. Liefert die Eingaben für `capacity.ts`
 * (`availableMinutesForDay`/`-InRange`).
 *
 * **Wochentag-Konvention:** 0 = Sonntag (JS `Date#getUTCDay()`), siehe
 * Kommentar in `capacity.ts` — hier übernommen, nirgends in DATA_MODEL.md
 * beziffert.
 *
 * Reine Präsentationskomponente wie `CourseSetup`/`AssessmentSetup` — kennt
 * seit der Persistenz-Härtung `data/availability.ts`/`-Repo.ts` nicht
 * direkt: jede Aktion geht über einen eigenen Callback
 * (`onSetPatternMinutes`/`onAddException`/`onRemoveException`) nach außen,
 * siehe dortiger Kommentar zur Begründung. Anders als bei
 * `CourseSetup`/`AssessmentSetup` bräuchte `weekday`/`date` als
 * Primärschlüssel keine neue `id` — "Anlegen" ist immer ein Upsert.
 *
 * **Mehrfachauswahl bei Ausnahme-Tagen:** `onAddException` erwartet weiterhin
 * genau ein Datum (Primärschlüssel `date`, siehe oben) — statt das
 * Datenmodell dafür zu verbiegen, sammelt diese Komponente mehrere gewählte
 * Tage lokal (`selectedDates`) und ruft `onAddException` beim Speichern
 * einmal pro Tag auf, mit denselben Minuten/derselben Notiz für alle. Wird
 * kein Tag explizit zur Auswahl hinzugefügt (der einfache Ein-Tag-Fall),
 * fällt "Speichern" auf das aktuell im Datumsfeld stehende Datum zurück —
 * der bisherige Ein-Tag-Ablauf bleibt dadurch unverändert nutzbar.
 */

const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const

export interface AvailabilitySetupProps {
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  onSetPatternMinutes: (weekday: AvailabilityPattern['weekday'], minutes: number) => void
  onAddException: (date: string, minutes: number, note: string | null) => void
  onRemoveException: (date: string) => void
}

export function AvailabilitySetup({
  pattern,
  exceptions,
  onSetPatternMinutes,
  onAddException,
  onRemoveException,
}: AvailabilitySetupProps) {
  const [draftDate, setDraftDate] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')

  const minutesFor = (weekday: number) => pattern.find((p) => p.weekday === weekday)?.minutes ?? 0

  const addToSelection = () => {
    if (draftDate.trim().length === 0) return
    setSelectedDates((prev) => (prev.includes(draftDate) ? prev : [...prev, draftDate]))
    setDraftDate('')
  }

  const removeFromSelection = (date: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== date))
  }

  const addException = (e: React.FormEvent) => {
    e.preventDefault()
    const dates = selectedDates.length > 0 ? selectedDates : draftDate.trim().length > 0 ? [draftDate] : []
    if (dates.length === 0) return

    const parsedMinutes = Number(minutes) || 0
    const trimmedNote = note.trim() === '' ? null : note.trim()
    for (const date of dates) {
      onAddException(date, parsedMinutes, trimmedNote)
    }

    setDraftDate('')
    setSelectedDates([])
    setMinutes('')
    setNote('')
  }

  return (
    <section aria-label="Verfügbarkeit">
      <h2>Verfügbarkeit</h2>

      <h3>Wochenmuster</h3>
      <ul>
        {WEEKDAY_LABELS.map((label, weekday) => (
          <li key={weekday}>
            <label>
              {label}
              <input
                type="number"
                min={0}
                value={minutesFor(weekday)}
                onChange={(e) =>
                  onSetPatternMinutes(weekday as AvailabilityPattern['weekday'], Math.max(0, Number(e.target.value) || 0))
                }
              />
              Minuten
            </label>
          </li>
        ))}
      </ul>

      <h3>Abweichende Tage</h3>
      <ul>
        {exceptions.map((exception) => (
          <li key={exception.date}>
            {exception.date}: {exception.minutes} Min.
            {exception.note && ` (${exception.note})`}
            <button type="button" onClick={() => onRemoveException(exception.date)}>
              Entfernen
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addException} aria-label="Ausnahme hinzufügen">
        <label>
          Datum
          <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
        </label>
        <button type="button" onClick={addToSelection}>
          Tag zur Auswahl hinzufügen
        </button>

        {selectedDates.length > 0 && (
          <ul aria-label="Ausgewählte Tage">
            {selectedDates.map((date) => (
              <li key={date}>
                {date}
                <button type="button" onClick={() => removeFromSelection(date)} aria-label={`${date} aus Auswahl entfernen`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <label>
          Minuten
          <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label>
          Notiz
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit">Ausnahme hinzufügen</button>
      </form>
    </section>
  )
}
