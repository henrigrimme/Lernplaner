import { useState } from 'react'
import type { AvailabilityException, AvailabilityPattern, RecurringBlocker } from '../data/schema'
import type { NewRecurringBlockerInput } from '../data/recurringBlockers'
import { TabbedPanel } from './TabbedPanel'

/**
 * Verfügbarkeits-Setup: Wochenmuster (Minuten je Wochentag) plus einzelne
 * oder mehrtägige abweichende Zeiträume plus wiederkehrende Blocker.
 * Liefert die Eingaben für `capacity.ts`
 * (`availableMinutesForDay`/`-InRange`).
 *
 * **Wochentag-Konvention:** 0 = Sonntag (JS `Date#getUTCDay()`), siehe
 * Kommentar in `capacity.ts` — hier übernommen, nirgends in DATA_MODEL.md
 * beziffert. Die Auswahl-Dropdowns zeigen die Woche bewusst
 * montagsbeginnend (`MO_FIRST_WEEKDAYS`), weil die Nutzer so denken
 * („Mo–Fr"); die an `capacity.ts` übergebenen `weekday`-Zahlen bleiben
 * unverändert 0–6.
 *
 * Reine Präsentationskomponente wie `CourseSetup`/`AssessmentSetup` — kennt
 * seit der Persistenz-Härtung `data/availability.ts`/`-Repo.ts` nicht
 * direkt: jede Aktion geht über einen eigenen Callback
 * (`onSetPatternMinutes`/`onAddException`/`onRemoveException`) nach außen,
 * siehe dortiger Kommentar zur Begründung. Anders als bei
 * `CourseSetup`/`AssessmentSetup` bräuchte `weekday`/`date` als
 * Primärschlüssel keine neue `id` — "Anlegen" ist immer ein Upsert.
 *
 * **Drei Reiter statt einer langen Seite** (Impeccable-Kritik v0.28.0,
 * Befund P1): Wochenmuster, abweichende Tage und wiederkehrende Blocker
 * sind konzeptionell verschiedene Aufgaben — auf einer einzigen sehr
 * langen Seite überlasteten sie in der für den App-Erfolg entscheidenden
 * Setup-Phase das Arbeitsgedächtnis. Wiederverwendung von `TabbedPanel`
 * (wie `CourseWorkspace`/`SettingsView`), kein viertes
 * Organisationsprinzip. Alle Panels bleiben über `hidden` im DOM — ein
 * Reiterwechsel verwirft keinen halb ausgefüllten Ausnahme-/Blocker-
 * Entwurf.
 *
 * **Regel im Wochenmuster** (Nutzerwunsch 2026-09-08, „wie bei einer
 * Hotelbuchung"): statt sieben Felder einzeln zu tippen, einen
 * Wochentag-Bereich (von–bis) auf denselben Minutenwert setzen. Ruft
 * `onSetPatternMinutes` einfach einmal je betroffenem Wochentag auf — kein
 * neues Datenmodell, die Einzelfelder darunter bleiben danach frei
 * anpassbar.
 *
 * **Zeitraum bei abweichenden Tagen** (Nutzerwunsch 2026-09-08, „ein
 * ganzes Wochenende auf einmal"): Umschalter „Einzelner Tag" / „Zeitraum".
 * `onAddException` erwartet weiterhin genau ein Datum (Primärschlüssel
 * `date`) — im Zeitraum-Modus wird der Bereich lokal zu Einzeltagen
 * expandiert und `onAddException` einmal pro Tag mit denselben
 * Minuten/derselben Notiz aufgerufen. Ein zu großer Bereich (mehr als
 * `MAX_RANGE_DAYS`) wird abgelehnt, damit ein Vertipper im Jahr nicht
 * hunderte Upserts auslöst.
 */

const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const

/** Wochentage montagsbeginnend — nur für die Anzeige-Reihenfolge der Regel-Dropdowns. */
const MO_FIRST_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const

const MAX_RANGE_DAYS = 92

/** Alle ISO-Datumsstrings von `startISO` bis `endISO`, **beide inklusive**. */
function expandDateRange(startISO: string, endISO: string): string[] {
  const out: string[] = []
  let cursor = new Date(`${startISO}T00:00:00.000Z`)
  const end = new Date(`${endISO}T00:00:00.000Z`)
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return out
}

export interface AvailabilitySetupProps {
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  onSetPatternMinutes: (weekday: AvailabilityPattern['weekday'], minutes: number) => void
  onAddException: (date: string, minutes: number, note: string | null) => void
  onRemoveException: (date: string) => void
  recurringBlockers: RecurringBlocker[]
  onAddRecurringBlocker: (input: NewRecurringBlockerInput) => void
  onRemoveRecurringBlocker: (id: number) => void
}

export function AvailabilitySetup({
  pattern,
  exceptions,
  onSetPatternMinutes,
  onAddException,
  onRemoveException,
  recurringBlockers,
  onAddRecurringBlocker,
  onRemoveRecurringBlocker,
}: AvailabilitySetupProps) {
  const [ruleFrom, setRuleFrom] = useState<AvailabilityPattern['weekday']>(1)
  const [ruleTo, setRuleTo] = useState<AvailabilityPattern['weekday']>(5)
  const [ruleMinutes, setRuleMinutes] = useState('')

  const [exceptionMode, setExceptionMode] = useState<'single' | 'range'>('single')
  const [draftDate, setDraftDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  const [blockerWeekday, setBlockerWeekday] = useState<AvailabilityPattern['weekday']>(1)
  const [blockerStart, setBlockerStart] = useState('12:00')
  const [blockerEnd, setBlockerEnd] = useState('13:00')
  const [blockerLabel, setBlockerLabel] = useState('')

  const minutesFor = (weekday: number) => pattern.find((p) => p.weekday === weekday)?.minutes ?? 0

  const ruleFromPos = MO_FIRST_WEEKDAYS.indexOf(ruleFrom as (typeof MO_FIRST_WEEKDAYS)[number])
  const ruleToPos = MO_FIRST_WEEKDAYS.indexOf(ruleTo as (typeof MO_FIRST_WEEKDAYS)[number])
  const ruleValid = ruleFromPos <= ruleToPos

  const applyRule = () => {
    if (!ruleValid) return
    const parsed = Math.max(0, Number(ruleMinutes) || 0)
    for (const weekday of MO_FIRST_WEEKDAYS.slice(ruleFromPos, ruleToPos + 1)) {
      onSetPatternMinutes(weekday, parsed)
    }
  }

  const addException = (e: React.FormEvent) => {
    e.preventDefault()
    setRangeError(null)

    let dates: string[] = []
    if (exceptionMode === 'single') {
      if (draftDate.trim().length > 0) dates = [draftDate]
    } else {
      if (rangeStart.trim().length === 0 || rangeEnd.trim().length === 0) return
      if (rangeEnd < rangeStart) {
        setRangeError('„Bis" muss auf oder nach „Von" liegen.')
        return
      }
      dates = expandDateRange(rangeStart, rangeEnd)
      if (dates.length > MAX_RANGE_DAYS) {
        setRangeError(`Zeitraum zu groß (${dates.length} Tage) — höchstens ${MAX_RANGE_DAYS} auf einmal.`)
        return
      }
    }
    if (dates.length === 0) return

    const parsedMinutes = Number(minutes) || 0
    const trimmedNote = note.trim() === '' ? null : note.trim()
    for (const date of dates) {
      onAddException(date, parsedMinutes, trimmedNote)
    }

    setDraftDate('')
    setRangeStart('')
    setRangeEnd('')
    setMinutes('')
    setNote('')
  }

  const addRecurringBlocker = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedLabel = blockerLabel.trim()
    if (trimmedLabel.length === 0) return
    if (blockerEnd <= blockerStart) return
    onAddRecurringBlocker({ weekday: blockerWeekday, starts_at: blockerStart, ends_at: blockerEnd, label: trimmedLabel })
    setBlockerLabel('')
  }

  const wochenmusterTab = (
    <>
      <div className="availability-rule" role="group" aria-label="Regel auf mehrere Wochentage anwenden">
        <span>Regel: von</span>
        <select
          aria-label="Regel von Wochentag"
          value={ruleFrom}
          onChange={(e) => setRuleFrom(Number(e.target.value) as AvailabilityPattern['weekday'])}
        >
          {MO_FIRST_WEEKDAYS.map((weekday) => (
            <option key={weekday} value={weekday}>
              {WEEKDAY_LABELS[weekday]}
            </option>
          ))}
        </select>
        <span>bis</span>
        <select
          aria-label="Regel bis Wochentag"
          value={ruleTo}
          onChange={(e) => setRuleTo(Number(e.target.value) as AvailabilityPattern['weekday'])}
        >
          {MO_FIRST_WEEKDAYS.map((weekday) => (
            <option key={weekday} value={weekday}>
              {WEEKDAY_LABELS[weekday]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          aria-label="Regel Minuten"
          value={ruleMinutes}
          onChange={(e) => setRuleMinutes(e.target.value)}
          placeholder="z. B. 120"
        />
        <span>Minuten</span>
        <button type="button" onClick={applyRule} disabled={!ruleValid}>
          Anwenden
        </button>
      </div>
      {!ruleValid && <p role="alert" className="empty-state-inline">„bis" muss auf oder nach „von" liegen.</p>}
      <p className="empty-state-inline">
        Setzt alle Tage im gewählten Bereich auf denselben Wert (wie „Mo–Fr je 2 Stunden"). Einzelne Tage darunter
        bleiben danach frei anpassbar.
      </p>

      <ul>
        {WEEKDAY_LABELS.map((label, weekday) => (
          <li key={weekday} className="field-row">
            <span>{label}</span>
            <span className="field-row-input">
              <input
                type="number"
                min={0}
                aria-label={label}
                value={minutesFor(weekday)}
                onChange={(e) =>
                  onSetPatternMinutes(weekday as AvailabilityPattern['weekday'], Math.max(0, Number(e.target.value) || 0))
                }
              />
              Minuten
            </span>
          </li>
        ))}
      </ul>
    </>
  )

  const ausnahmenTab = (
    <>
      <ul>
        {exceptions.map((exception) => (
          <li key={exception.date}>
            {exception.date}: {exception.minutes} Min.
            {exception.note && ` (${exception.note})`}
            <button
              type="button"
              aria-label={`Ausnahme am ${exception.date} entfernen`}
              onClick={() => onRemoveException(exception.date)}
            >
              Entfernen
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addException} aria-label="Ausnahme hinzufügen">
        <fieldset className="segmented-fieldset">
          <legend>Zeitraum</legend>
          <div className="segmented-options">
            <label>
              <input
                type="radio"
                name="exception-mode"
                checked={exceptionMode === 'single'}
                onChange={() => {
                  setExceptionMode('single')
                  setRangeError(null)
                }}
              />
              Einzelner Tag
            </label>
            <label>
              <input
                type="radio"
                name="exception-mode"
                checked={exceptionMode === 'range'}
                onChange={() => {
                  setExceptionMode('range')
                  setRangeError(null)
                }}
              />
              Zeitraum
            </label>
          </div>
        </fieldset>

        {exceptionMode === 'single' ? (
          <label>
            Datum
            <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
          </label>
        ) : (
          <>
            <label>
              Von (erster Tag)
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </label>
            <label>
              Bis (letzter Tag)
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </label>
          </>
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
        {rangeError && <p role="alert">{rangeError}</p>}
        {exceptionMode === 'range' && !rangeError && (
          <p className="empty-state-inline">
            Alle Tage im Zeitraum bekommen dieselben Minuten und dieselbe Notiz — z. B. ein ganzes Wochenende oder eine
            Urlaubswoche auf 0 Minuten.
          </p>
        )}
      </form>
    </>
  )

  const blockerTab = (
    <>
      <p>
        Feste Zeitfenster an einem Wochentag, die automatisch von der verfügbaren Lernzeit abgezogen werden — z. B.
        eine tägliche Mittagspause oder ein wöchentlicher Gym-Termin.
      </p>
      <ul>
        {recurringBlockers.map((blocker) => (
          <li key={blocker.id}>
            {WEEKDAY_LABELS[blocker.weekday]}, {blocker.starts_at}–{blocker.ends_at}: {blocker.label}
            <button
              type="button"
              aria-label={`Blocker "${blocker.label}" entfernen`}
              onClick={() => onRemoveRecurringBlocker(blocker.id)}
            >
              Entfernen
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addRecurringBlocker} aria-label="Wiederkehrenden Blocker hinzufügen">
        <label>
          Wochentag
          <select
            value={blockerWeekday}
            onChange={(e) => setBlockerWeekday(Number(e.target.value) as AvailabilityPattern['weekday'])}
          >
            {WEEKDAY_LABELS.map((label, weekday) => (
              <option key={weekday} value={weekday}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Von
          <input type="time" value={blockerStart} onChange={(e) => setBlockerStart(e.target.value)} />
        </label>
        <label>
          Bis
          <input type="time" value={blockerEnd} onChange={(e) => setBlockerEnd(e.target.value)} />
        </label>
        <label>
          Bezeichnung
          <input value={blockerLabel} onChange={(e) => setBlockerLabel(e.target.value)} placeholder="z. B. Mittagspause" />
        </label>
        <button type="submit" disabled={blockerEnd <= blockerStart}>
          Blocker hinzufügen
        </button>
        {blockerEnd <= blockerStart && <p role="alert">„Bis" muss nach „Von" liegen.</p>}
      </form>
    </>
  )

  return (
    <section aria-label="Verfügbarkeit">
      <h2>Verfügbarkeit</h2>
      <TabbedPanel
        tablistLabel="Verfügbarkeitsbereiche"
        tabs={[
          { key: 'wochenmuster', label: 'Wochenmuster', content: wochenmusterTab },
          { key: 'ausnahmen', label: 'Abweichende Tage', content: ausnahmenTab },
          { key: 'blocker', label: 'Wiederkehrende Blocker', content: blockerTab },
        ]}
      />
    </section>
  )
}
