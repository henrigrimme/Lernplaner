import { useState } from 'react'
import type { Assessment, Course, Document, Topic, TopicSection } from '../data/schema'
import type { QuestionFocus, QuizDifficulty } from '../ai/types'

/**
 * Quiz/Probeklausur anlegen (ROADMAP.md Phase 4 „Quiz-Generierung"/
 * „Probeklausur-Simulation"). Reine Präsentation (ARCHITECTURE.md „ui/") —
 * `onGenerate` kapselt sowohl den KI-Aufruf als auch das Speichern in
 * `quizzes`/`questions`, diese Komponente kennt nur Auswahl und Ergebnis.
 *
 * **Als Schritt-für-Schritt-Assistent statt eines einzigen Formulars**
 * (Nutzerwunsch 2026-07-23: „tieferer Quiz-Konfigurationsdialog mit
 * echten Rückfragen, wie bei Claude" — vorher stand alles gleichzeitig auf
 * einer Seite). Jeder Schritt fragt gezielt genau eine Sache: Material →
 * Fragenschwerpunkt → Umfang → Art/Schwierigkeit → Zusammenfassung. Reiner
 * `step`-Zustand, keine Geschäftslogik — die eigentliche Erzeugung läuft
 * unverändert über `onGenerate`, erst im letzten Schritt ausgelöst.
 *
 * **Nur Themenabschnitte mit geladenen PDF-Bytes wählbar** — Belegtext für
 * die KI-Anfrage kommt aus `documentBytes` (seit ADR-013 von der
 * Festplatte nachgeladen, siehe `platform/documentStorage.ts`; nur für vor
 * diesem Fix importierte Dokumente mit dem alten `in-memory://`-
 * Platzhalter fehlt das PDF dauerhaft); ohne echten Belegtext ließe sich
 * `questions.source_page` nicht rechtfertigen (DATA_MODEL.md).
 *
 * „Probeklausur" unterscheidet sich von einem gewöhnlichen Quiz nur durch
 * eine zusätzliche Prüfungs-Zuordnung (für die spätere Zeitbegrenzung in
 * `ui/QuizSession.tsx`, `assessment.duration_minutes`) — keine eigene
 * Tabelle, siehe `data/quizzesRepo.ts`-Kommentar.
 */

export interface GenerateQuizInput {
  courseId: number
  sectionIds: number[]
  questionsPerSection: number
  difficulty: QuizDifficulty
  focus: QuestionFocus
  mode: 'quiz' | 'probeklausur'
  assessmentId: number | null
}

export interface QuizSetupProps {
  courses: Course[]
  topics: Topic[]
  topicSections: TopicSection[]
  documents: Document[]
  documentBytes: Record<number, Uint8Array>
  assessments: Assessment[]
  onGenerate: (input: GenerateQuizInput) => Promise<void>
}

type Step = 'material' | 'fokus' | 'umfang' | 'art' | 'zusammenfassung'
const STEPS: { key: Step; label: string }[] = [
  { key: 'material', label: 'Material' },
  { key: 'fokus', label: 'Fragen-Fokus' },
  { key: 'umfang', label: 'Umfang' },
  { key: 'art', label: 'Art & Schwierigkeit' },
  { key: 'zusammenfassung', label: 'Zusammenfassung' },
]

const FOCUS_OPTIONS: { value: QuestionFocus; label: string; hint: string }[] = [
  { value: 'gemischt', label: 'Gemischt', hint: 'Konzeptverständnis und, falls passend, Rechenaufgaben' },
  { value: 'rechnen', label: 'Nur Rechenfragen', hint: 'Jede Frage verlangt eine echte Berechnung' },
  { value: 'konzept', label: 'Nur Konzeptverständnis', hint: 'Definitionen, Zusammenhänge, keine Rechenaufgaben' },
]

/** Grobe Zielumfänge nach Übungszeit — Details siehe `label`. `totalQuestions` ist die Gesamtfragenzahl, nicht je Abschnitt. */
const SCOPE_PRESETS: { minutes: number; totalQuestions: number; label: string }[] = [
  { minutes: 10, totalQuestions: 6, label: 'Kurz (~10 Min., ~6 Fragen)' },
  { minutes: 20, totalQuestions: 12, label: 'Mittel (~20 Min., ~12 Fragen)' },
  { minutes: 35, totalQuestions: 20, label: 'Lang (~35 Min., ~20 Fragen)' },
]

export function QuizSetup({ courses, topics, topicSections, documents, documentBytes, assessments, onGenerate }: QuizSetupProps) {
  const activeCourses = courses.filter((c) => c.archived === 0)
  const [step, setStep] = useState<Step>('material')
  const [courseId, setCourseId] = useState<number | null>(activeCourses[0]?.id ?? null)
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set())
  const [focus, setFocus] = useState<QuestionFocus>('gemischt')
  const [totalQuestions, setTotalQuestions] = useState(SCOPE_PRESETS[1]!.totalQuestions)
  const [customTotal, setCustomTotal] = useState(false)
  const [mode, setMode] = useState<'quiz' | 'probeklausur'>('quiz')
  const [assessmentId, setAssessmentId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('mittel')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topicById = new Map(topics.map((t) => [t.id, t]))
  const documentById = new Map(documents.map((d) => [d.id, d]))

  const availableSections = topicSections.filter((s) => {
    const topic = topicById.get(s.topic_id)
    return topic?.course_id === courseId && documentBytes[s.document_id] !== undefined
  })

  const courseAssessments = assessments.filter((a) => a.course_id === courseId)
  const questionsPerSection =
    selectedSectionIds.size === 0 ? 0 : Math.max(1, Math.min(20, Math.round(totalQuestions / selectedSectionIds.size)))

  const toggleSection = (id: number) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)
  const canLeaveMaterial = courseId !== null && selectedSectionIds.size > 0
  const canLeaveArt = mode === 'quiz' || assessmentId !== null

  const goNext = () => {
    if (step === 'material' && !canLeaveMaterial) return
    if (step === 'art' && !canLeaveArt) return
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next.key)
  }
  const goBack = () => {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev.key)
  }

  const generate = async () => {
    if (courseId === null || selectedSectionIds.size === 0) return
    setBusy(true)
    setError(null)
    try {
      await onGenerate({
        courseId,
        sectionIds: Array.from(selectedSectionIds),
        questionsPerSection,
        difficulty,
        focus,
        mode,
        assessmentId: mode === 'probeklausur' ? assessmentId : null,
      })
      setSelectedSectionIds(new Set())
      setStep('material')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz konnte nicht erzeugt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Quiz erzeugen">
      <h2>Neues Quiz</h2>
      <div className="quiz-wizard-steps" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={
              i === stepIndex
                ? 'quiz-wizard-step-dot quiz-wizard-step-dot--active'
                : i < stepIndex
                  ? 'quiz-wizard-step-dot quiz-wizard-step-dot--done'
                  : 'quiz-wizard-step-dot'
            }
          />
        ))}
      </div>
      <p className="quiz-wizard-progress">
        Schritt {stepIndex + 1} von {STEPS.length}: {STEPS[stepIndex]!.label}
      </p>

      {step === 'material' && (
        <>
          <label>
            Fach
            <select
              value={courseId ?? ''}
              onChange={(e) => {
                setCourseId(Number(e.target.value))
                setSelectedSectionIds(new Set())
              }}
            >
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {availableSections.length === 0 ? (
            <p>
              Keine Themenabschnitte mit geladenem PDF verfügbar — entweder noch kein Material für dieses Fach
              importiert, oder das Dokument wurde vor der Änderung importiert, die Materialien dauerhaft speichert
              (siehe „Fächer & Themen"). Einmal neu importieren, danach bleibt es erhalten.
            </p>
          ) : (
            <ul>
              {availableSections.map((section) => (
                <li key={section.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSectionIds.has(section.id)}
                      onChange={() => toggleSection(section.id)}
                    />
                    {topicById.get(section.topic_id)?.name ?? `Thema ${section.topic_id}`} —{' '}
                    {documentById.get(section.document_id)?.filename ?? `Dokument ${section.document_id}`}, Seite{' '}
                    {section.page_start}
                    {section.page_end !== section.page_start && `–${section.page_end}`}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {step === 'fokus' && (
        <fieldset className="segmented-fieldset">
          <legend>Was für Fragen möchtest du?</legend>
          <div className="segmented-options">
            {FOCUS_OPTIONS.map((opt) => (
              <label key={opt.value}>
                <input type="radio" name="quiz-focus" checked={focus === opt.value} onChange={() => setFocus(opt.value)} />
                {opt.label} — {opt.hint}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 'umfang' && (
        <fieldset className="segmented-fieldset">
          <legend>Wie viel möchtest du üben?</legend>
          <div className="segmented-options">
            {SCOPE_PRESETS.map((preset) => (
              <label key={preset.minutes}>
                <input
                  type="radio"
                  name="quiz-scope"
                  checked={!customTotal && totalQuestions === preset.totalQuestions}
                  onChange={() => {
                    setCustomTotal(false)
                    setTotalQuestions(preset.totalQuestions)
                  }}
                />
                {preset.label}
              </label>
            ))}
            <label>
              <input type="radio" name="quiz-scope" checked={customTotal} onChange={() => setCustomTotal(true)} />
              Eigene Anzahl
            </label>
          </div>
          {customTotal && (
            <label>
              Fragen insgesamt
              <input
                type="number"
                min={1}
                max={20 * Math.max(1, selectedSectionIds.size)}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
          {selectedSectionIds.size > 0 && (
            <p>
              Ergibt {questionsPerSection} Frage(n) je ausgewähltem Abschnitt ({selectedSectionIds.size} Abschnitte),
              insgesamt etwa {questionsPerSection * selectedSectionIds.size} Fragen.
            </p>
          )}
        </fieldset>
      )}

      {step === 'art' && (
        <>
          <fieldset className="segmented-fieldset">
            <legend>Art</legend>
            <div className="segmented-options">
              <label>
                <input type="radio" name="quiz-mode" checked={mode === 'quiz'} onChange={() => setMode('quiz')} />
                Quiz
              </label>
              <label>
                <input
                  type="radio"
                  name="quiz-mode"
                  checked={mode === 'probeklausur'}
                  onChange={() => setMode('probeklausur')}
                />
                Probeklausur (zeitbegrenzt)
              </label>
            </div>
          </fieldset>

          {mode === 'probeklausur' && (
            <label>
              Prüfung
              <select
                value={assessmentId ?? ''}
                onChange={(e) => setAssessmentId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— auswählen —</option>
                {courseAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.date})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Schwierigkeit
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}>
              <option value="einfach">Einfach</option>
              <option value="mittel">Mittel</option>
              <option value="schwer">Schwer</option>
            </select>
          </label>
        </>
      )}

      {step === 'zusammenfassung' && (
        <div>
          <ul>
            <li>Fach: {activeCourses.find((c) => c.id === courseId)?.name ?? '—'}</li>
            <li>Abschnitte: {selectedSectionIds.size}</li>
            <li>Fokus: {FOCUS_OPTIONS.find((o) => o.value === focus)?.label}</li>
            <li>
              Umfang: {questionsPerSection} Frage(n) je Abschnitt, insgesamt etwa{' '}
              {questionsPerSection * selectedSectionIds.size} Fragen
            </li>
            <li>Art: {mode === 'quiz' ? 'Quiz' : 'Probeklausur'}</li>
            <li>Schwierigkeit: {difficulty}</li>
          </ul>
          <button type="button" onClick={generate} disabled={busy}>
            {busy ? 'Wird erzeugt…' : 'Quiz erzeugen'}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}

      <div className="quiz-wizard-nav">
        {stepIndex > 0 && (
          <button type="button" onClick={goBack}>
            Zurück
          </button>
        )}
        {step !== 'zusammenfassung' && (
          <button
            type="button"
            onClick={goNext}
            disabled={(step === 'material' && !canLeaveMaterial) || (step === 'art' && !canLeaveArt)}
          >
            Weiter
          </button>
        )}
      </div>
    </section>
  )
}
