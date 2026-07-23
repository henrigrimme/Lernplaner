import { useState } from 'react'
import { Timer } from './Timer'
import { KIND_LABELS } from './kindLabels'
import { completeStudyBlock } from '../data/studyBlocks'
import type { StudyBlock, Topic } from '../data/schema'

/**
 * Heute-Ansicht mit Timer und Schwierigkeits-Feedback (ROADMAP.md Phase 3,
 * erster Punkt). Zeigt den aktuellen (ersten noch offenen) Block des Tages
 * mit eingebettetem `Timer`, lässt ihn mit tatsächlicher Dauer und
 * Schwierigkeits-Feedback (`-1`/`0`/`1`, siehe `StudyBlock`) abschließen —
 * über `data/studyBlocks.ts`, keine eigene Geschäftslogik hier
 * (ARCHITECTURE.md „ui/").
 *
 * Reine Präsentationskomponente wie `TopicTree`/`CourseSetup`: `onChange`
 * reicht den neuen `StudyBlock[]`-Zustand nach außen, `now` kommt von außen
 * (kein `Date.now()` in der Komponente).
 */

export interface TodayViewProps {
  studyBlocks: StudyBlock[]
  topics: Topic[]
  onChange: (blocks: StudyBlock[]) => void
  /** "Heute", ISO-Datum — vom Aufrufer übergeben, keine Systemuhr in der Komponente. */
  today: string
  now: () => string
}

const FEEDBACK_OPTIONS: { value: -1 | 0 | 1; label: string }[] = [
  { value: -1, label: 'Zu leicht' },
  { value: 0, label: 'Passend' },
  { value: 1, label: 'Zu schwer' },
]

function blockLabel(block: StudyBlock, topicById: Map<number, Topic>): string {
  const name = block.topic_id !== null ? topicById.get(block.topic_id)?.name : undefined
  return `${name ?? `Thema ${block.topic_id}`} — ${KIND_LABELS[block.kind] ?? block.kind}`
}

export function TodayView({ studyBlocks, topics, onChange, today, now }: TodayViewProps) {
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const todaysBlocks = studyBlocks
    .filter((b) => b.planned_date === today)
    .sort((a, b) => a.planned_order - b.planned_order)
  const open = todaysBlocks.filter((b) => b.status === 'offen')
  const done = todaysBlocks.filter((b) => b.status === 'erledigt')
  const current = open[0] ?? null

  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [actualMinutesOverride, setActualMinutesOverride] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<-1 | 0 | 1 | null>(null)

  const actualMinutes = actualMinutesOverride ?? elapsedMinutes

  const submit = () => {
    if (!current || feedback === null) return
    const minutes = actualMinutes > 0 ? actualMinutes : current.planned_minutes
    onChange(
      completeStudyBlock(studyBlocks, current.id, {
        actualMinutes: minutes,
        difficultyFeedback: feedback,
        completedAt: now(),
      }),
    )
    setElapsedMinutes(0)
    setActualMinutesOverride(null)
    setFeedback(null)
  }

  return (
    <section aria-label="Heute">
      <h2>Heute — {today}</h2>

      {todaysBlocks.length === 0 && (
        <p className="empty-state">
          Für heute ist nichts geplant. Sobald ein Plan übernommen wurde (siehe „Planung"), erscheinen die
          heutigen Lernblöcke hier.
        </p>
      )}

      {current && (
        <div>
          <h3>
            {blockLabel(current, topicById)} — {current.planned_minutes} Min.
          </h3>

          <Timer key={current.id} onElapsedWorkMinutesChange={setElapsedMinutes} />

          <label>
            Tatsächliche Minuten
            <input
              type="number"
              min={0}
              value={actualMinutes}
              onChange={(e) => setActualMinutesOverride(Number(e.target.value))}
            />
          </label>

          <fieldset className="segmented-fieldset">
            <legend>Schwierigkeit</legend>
            <div className="segmented-options">
              {FEEDBACK_OPTIONS.map((opt) => (
                <label key={opt.value}>
                  <input
                    type="radio"
                    name={`feedback-${current.id}`}
                    checked={feedback === opt.value}
                    onChange={() => setFeedback(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" onClick={submit} disabled={feedback === null}>
            Fertig
          </button>
        </div>
      )}

      {open.length > 1 && (
        <div>
          <h3>Noch heute</h3>
          <ul>
            {open.slice(1).map((b) => (
              <li key={b.id}>
                {blockLabel(b, topicById)} — {b.planned_minutes} Min.
              </li>
            ))}
          </ul>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3>Heute erledigt</h3>
          <ul>
            {done.map((b) => (
              <li key={b.id}>
                {blockLabel(b, topicById)} — {b.actual_minutes} Min.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
