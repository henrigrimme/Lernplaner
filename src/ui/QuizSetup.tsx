import { useState } from 'react'
import type { Assessment, Course, Document, Topic, TopicSection } from '../data/schema'

/**
 * Quiz/Probeklausur anlegen (ROADMAP.md Phase 4 „Quiz-Generierung"/
 * „Probeklausur-Simulation"). Reine Präsentation (ARCHITECTURE.md „ui/") —
 * `onGenerate` kapselt sowohl den KI-Aufruf als auch das Speichern in
 * `quizzes`/`questions`, diese Komponente kennt nur Auswahl und Ergebnis.
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

export function QuizSetup({ courses, topics, topicSections, documents, documentBytes, assessments, onGenerate }: QuizSetupProps) {
  const activeCourses = courses.filter((c) => c.archived === 0)
  const [courseId, setCourseId] = useState<number | null>(activeCourses[0]?.id ?? null)
  const [mode, setMode] = useState<'quiz' | 'probeklausur'>('quiz')
  const [assessmentId, setAssessmentId] = useState<number | null>(null)
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set())
  const [questionsPerSection, setQuestionsPerSection] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topicById = new Map(topics.map((t) => [t.id, t]))
  const documentById = new Map(documents.map((d) => [d.id, d]))

  const availableSections = topicSections.filter((s) => {
    const topic = topicById.get(s.topic_id)
    return topic?.course_id === courseId && documentBytes[s.document_id] !== undefined
  })

  const courseAssessments = assessments.filter((a) => a.course_id === courseId)

  const toggleSection = (id: number) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
        mode,
        assessmentId: mode === 'probeklausur' ? assessmentId : null,
      })
      setSelectedSectionIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz konnte nicht erzeugt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Quiz erzeugen">
      <h2>Neues Quiz</h2>

      <label>
        Fach
        <select value={courseId ?? ''} onChange={(e) => setCourseId(Number(e.target.value))}>
          {activeCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Art</legend>
        <label>
          <input type="radio" name="quiz-mode" checked={mode === 'quiz'} onChange={() => setMode('quiz')} />
          Quiz
        </label>
        <label>
          <input type="radio" name="quiz-mode" checked={mode === 'probeklausur'} onChange={() => setMode('probeklausur')} />
          Probeklausur (zeitbegrenzt)
        </label>
      </fieldset>

      {mode === 'probeklausur' && (
        <label>
          Prüfung
          <select value={assessmentId ?? ''} onChange={(e) => setAssessmentId(e.target.value ? Number(e.target.value) : null)}>
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
        Fragen je ausgewähltem Abschnitt
        <input
          type="number"
          min={1}
          max={10}
          value={questionsPerSection}
          onChange={(e) => setQuestionsPerSection(Math.max(1, Math.min(10, Number(e.target.value))))}
        />
      </label>

      {availableSections.length === 0 ? (
        <p>
          Keine Themenabschnitte mit geladenem PDF verfügbar — entweder noch kein Material für dieses Fach importiert,
          oder das Dokument wurde vor der Änderung importiert, die Materialien dauerhaft speichert (siehe „Fächer &
          Themen"). Einmal neu importieren, danach bleibt es erhalten.
        </p>
      ) : (
        <ul>
          {availableSections.map((section) => (
            <li key={section.id}>
              <label>
                <input type="checkbox" checked={selectedSectionIds.has(section.id)} onChange={() => toggleSection(section.id)} />
                {topicById.get(section.topic_id)?.name ?? `Thema ${section.topic_id}`} —{' '}
                {documentById.get(section.document_id)?.filename ?? `Dokument ${section.document_id}`}, Seite{' '}
                {section.page_start}
                {section.page_end !== section.page_start && `–${section.page_end}`}
              </label>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={busy || courseId === null || selectedSectionIds.size === 0 || (mode === 'probeklausur' && assessmentId === null)}
      >
        {busy ? 'Wird erzeugt…' : 'Quiz erzeugen'}
      </button>

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
