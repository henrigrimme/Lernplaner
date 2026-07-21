import { useState } from 'react'
import type { Assessment, Course, PaperStep } from '../data/schema'
import type { NewPaperStepInput } from '../data/paperSteps'

/**
 * Paper-Teilschritte je Paper-Abgabe (ROADMAP.md Phase 4 „Paper-Workflow",
 * DATA_MODEL.md „paper_steps — Teilschritte für Abgaben"). War von Anfang
 * an im Datenmodell mitgedacht (CONTEXT.md Abschnitt 3: „der Planer muss
 * Paper-Teilschritte von Anfang an mitdenken, auch wenn der Paper-Workflow
 * erst in Phase 4 ausgebaut wird") — hier nur die Checklisten-Verwaltung,
 * kein automatisches Ableiten von Schritten aus dem Prüfungsformat.
 *
 * Reine Präsentationskomponente wie `AssessmentSetup`: jede Aktion geht
 * über einen eigenen Callback (`onAdd`/`onUpdate`/`onRemove`) nach außen,
 * kennt `data/paperStepsRepo.ts` nicht direkt.
 */

export interface PaperStepsProps {
  course: Course
  assessments: Assessment[]
  steps: PaperStep[]
  onAdd: (input: NewPaperStepInput) => void
  onUpdate: (id: number, changes: Partial<NewPaperStepInput>) => void
  onRemove: (id: number) => void
}

const STATUS_LABELS: Record<PaperStep['status'], string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  erledigt: 'Erledigt',
}
const STATUSES: PaperStep['status'][] = ['offen', 'in_arbeit', 'erledigt']

interface Draft {
  title: string
  dueDate: string
}
const EMPTY_DRAFT: Draft = { title: '', dueDate: '' }

export function PaperSteps({ course, assessments, steps, onAdd, onUpdate, onRemove }: PaperStepsProps) {
  const [draftByAssessment, setDraftByAssessment] = useState<Record<number, Draft>>({})

  const paperAssessments = assessments.filter((a) => a.course_id === course.id && a.type === 'paper')
  if (paperAssessments.length === 0) return null

  const draftFor = (assessmentId: number) => draftByAssessment[assessmentId] ?? EMPTY_DRAFT
  const setDraft = (assessmentId: number, draft: Draft) =>
    setDraftByAssessment((prev) => ({ ...prev, [assessmentId]: draft }))

  const submit = (e: React.FormEvent, assessmentId: number) => {
    e.preventDefault()
    const draft = draftFor(assessmentId)
    if (draft.title.trim().length === 0) return
    onAdd({
      assessment_id: assessmentId,
      title: draft.title.trim(),
      due_date: draft.dueDate.trim() === '' ? null : draft.dueDate,
      status: 'offen',
      notes: null,
    })
    setDraft(assessmentId, EMPTY_DRAFT)
  }

  return (
    <section aria-label={`Paper-Teilschritte: ${course.name}`}>
      <h3>Paper-Teilschritte — {course.name}</h3>
      {paperAssessments.map((assessment) => {
        const assessmentSteps = steps.filter((s) => s.assessment_id === assessment.id)
        const draft = draftFor(assessment.id)
        return (
          <div key={assessment.id} aria-label={assessment.title}>
            <h4>{assessment.title}</h4>
            <ul>
              {assessmentSteps.map((step) => (
                <li key={step.id} data-paper-step-id={step.id}>
                  <span>{step.title}</span>
                  {step.due_date && <span> — fällig {step.due_date}</span>}
                  <select
                    value={step.status}
                    aria-label={`Status von ${step.title}`}
                    onChange={(e) => onUpdate(step.id, { status: e.target.value as PaperStep['status'] })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => onRemove(step.id)}>
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => submit(e, assessment.id)} aria-label={`Teilschritt hinzufügen: ${assessment.title}`}>
              <label>
                Titel
                <input
                  value={draft.title}
                  onChange={(e) => setDraft(assessment.id, { ...draft, title: e.target.value })}
                  required
                />
              </label>
              <label>
                Fällig (optional)
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft(assessment.id, { ...draft, dueDate: e.target.value })}
                />
              </label>
              <button type="submit">Teilschritt hinzufügen</button>
            </form>
          </div>
        )
      })}
    </section>
  )
}
