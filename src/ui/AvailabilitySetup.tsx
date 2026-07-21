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
 * Primärschlüssel keine neue `id` — „Anlegen" ist immer ein Upsert.
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
  const [newException, setNewException] = useState({ date: '', minutes: '', note: '' })

  const minutesFor = (weekday: number) => pattern.find((p) => p.weekday === weekday)?.minutes ?? 0

  const addException = (e: React.FormEvent) => {
    e.preventDefault()
    if (newException.date.trim().length === 0) return
    onAddException(
      newException.date,
      Number(newException.minutes) || 0,
      newException.note.trim() === '' ? null : newException.note.trim(),
    )
    setNewException({ date: '', minutes: '', note: '' })
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
          <input
            type="date"
            value={newException.date}
            onChange={(e) => setNewException({ ...newException, date: e.target.value })}
            required
          />
        </label>
        <label>
          Minuten
          <input
            type="number"
            min={0}
            value={newException.minutes}
            onChange={(e) => setNewException({ ...newException, minutes: e.target.value })}
          />
        </label>
        <label>
          Notiz
          <input value={newException.note} onChange={(e) => setNewException({ ...newException, note: e.target.value })} />
        </label>
        <button type="submit">Ausnahme hinzufügen</button>
      </form>
    </section>
  )
}
