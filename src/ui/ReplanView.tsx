import { useState } from 'react'
import { replan, type PlanDiffChange, type ReplanResult } from '../domain/replanning'
import { applyReplan } from '../data/studyBlocks'
import { KIND_LABELS } from './kindLabels'
import type {
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Blocker,
  StudyBlock,
  Topic,
} from '../data/schema'

/**
 * Neuberechnung mit Diff-Ansicht (ROADMAP.md Phase 3), verdrahtet nach
 * ADR-005 „Umplanung als Vorschlag, nie automatisch": `domain/replanning.ts`
 * berechnet einen Vorschlag, diese Ansicht zeigt ihn als Diff, **nichts**
 * wird ohne den „Übernehmen"-Klick angewendet. Reine Präsentation nach
 * außen (ARCHITECTURE.md „ui/") — `onApply` reicht das Ergebnis (neue
 * `StudyBlock[]` plus der Grund für `plan_versions`) an den Aufrufer, der
 * Zustand/Persistenz trägt.
 */

export interface ReplanViewProps {
  studyBlocks: StudyBlock[]
  topics: Topic[]
  assessments: Assessment[]
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  blockers: Blocker[]
  /** "Heute", ISO-Datum — vom Aufrufer übergeben, keine Systemuhr in der Komponente. */
  from: string
  onApply: (blocks: StudyBlock[], reason: string) => void
}

const CHANGE_LABELS: Record<PlanDiffChange, string> = {
  neu: 'Neu',
  entfernt: 'Entfernt',
  verschoben: 'Verschoben',
  dauer_geändert: 'Dauer geändert',
}

function sideLabel(side: { dates: string[]; minutes: number } | null): string {
  if (!side) return '—'
  return `${side.dates.join(', ')} (${side.minutes} Min.)`
}

export function ReplanView({ studyBlocks, topics, assessments, pattern, exceptions, blockers, from, onApply }: ReplanViewProps) {
  const [preview, setPreview] = useState<ReplanResult | null>(null)
  const topicById = new Map(topics.map((t) => [t.id, t]))

  const hasErstdurchgangHistory = studyBlocks.some((b) => b.kind === 'erstdurchgang')

  const compute = () => {
    const schedulingAssessments = assessments.map((a) => ({ id: a.id, date: a.date }))
    setPreview(replan(studyBlocks, schedulingAssessments, from, pattern, exceptions, blockers))
  }

  const apply = () => {
    if (!preview) return
    onApply(applyReplan(studyBlocks, preview), `Neuberechnung am ${from}`)
    setPreview(null)
  }

  const discard = () => setPreview(null)

  return (
    <section aria-label="Neuberechnung">
      <h2>Neuberechnung</h2>

      {!hasErstdurchgangHistory ? (
        <p>Erst einen Plan übernehmen, bevor eine Neuberechnung möglich ist.</p>
      ) : (
        <button type="button" onClick={compute}>
          Rückstand prüfen und neu berechnen
        </button>
      )}

      {preview && (
        <div>
          {preview.diff.length === 0 ? (
            <p>Keine Änderungen gegenüber dem aktuellen Plan.</p>
          ) : (
            <ul>
              {preview.diff.map((entry, i) => (
                <li key={i}>
                  {topicById.get(entry.topicId)?.name ?? `Thema ${entry.topicId}`} — {KIND_LABELS[entry.kind] ?? entry.kind} —{' '}
                  {CHANGE_LABELS[entry.change]}: {sideLabel(entry.before)} → {sideLabel(entry.after)}
                </li>
              ))}
            </ul>
          )}

          {preview.unscheduled.length > 0 && (
            <div>
              <h3>Weiterhin nicht untergebracht</h3>
              <ul>
                {preview.unscheduled.map((u, i) => (
                  <li key={i}>
                    {topicById.get(u.topicId)?.name ?? `Thema ${u.topicId}`}: {u.minutes} Min. fehlen
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" onClick={apply} disabled={preview.diff.length === 0}>
            Übernehmen
          </button>
          <button type="button" onClick={discard}>
            Verwerfen
          </button>
        </div>
      )}
    </section>
  )
}
