import { useEffect, useRef, useState } from 'react'
import { isMcAnswerCorrect } from '../domain/quiz'
import type { Question, Topic } from '../data/schema'

/**
 * Ein Quiz/eine Probeklausur durchgehen (ROADMAP.md Phase 4). Reine
 * Präsentation (ARCHITECTURE.md „ui/") — `onAnswer` speichert je Frage in
 * `answers`, `onFinish` schließt das Quiz ab (Score-Berechnung liegt beim
 * Aufrufer, `domain/quiz.ts` `computeQuizScore`).
 *
 * Multiple-Choice wird automatisch bewertet (Buchstabe gegen Buchstabe,
 * `domain/quiz.ts`), Freitext wird wie bei den Karteikarten durch
 * Selbsteinschätzung bewertet (Musterantwort zeigen, Nutzer entscheidet
 * richtig/falsch) — ein automatischer Textvergleich wäre bei freien
 * Formulierungen unzuverlässig.
 *
 * `durationMinutes` (nur bei Probeklausur gesetzt, aus
 * `assessment.duration_minutes`) zeigt einen einfachen Countdown — läuft
 * er ab, wird nur eine Warnung angezeigt, nichts wird automatisch
 * abgebrochen (passt zu ADR-005 „nie automatisch").
 */

export interface QuizSessionProps {
  questions: Question[]
  topics: Topic[]
  durationMinutes: number | null
  onAnswer: (questionId: number, given: string, correct: 0 | 1, seconds: number) => void
  onFinish: () => void
}

function formatRemaining(totalSeconds: number): string {
  const m = Math.floor(Math.abs(totalSeconds) / 60)
  const s = Math.abs(totalSeconds) % 60
  const sign = totalSeconds < 0 ? '-' : ''
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function QuizSession({ questions, topics, durationMinutes, onAnswer, onFinish }: QuizSessionProps) {
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [mcResult, setMcResult] = useState<0 | 1 | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes !== null ? durationMinutes * 60 : null)
  const startedAt = useRef(Date.now())
  const topicById = new Map(topics.map((t) => [t.id, t]))

  useEffect(() => {
    if (remainingSeconds === null) return
    const id = setInterval(() => setRemainingSeconds((s) => (s === null ? null : s - 1)), 1000)
    return () => clearInterval(id)
  }, [remainingSeconds === null])

  const question = questions[index]
  const done = index >= questions.length

  const secondsSpent = () => Math.round((Date.now() - startedAt.current) / 1000)

  const nextQuestion = () => {
    setIndex((i) => i + 1)
    setGiven('')
    setRevealed(false)
    setMcResult(null)
    startedAt.current = Date.now()
  }

  const submitMc = () => {
    if (!question) return
    const correct = isMcAnswerCorrect(given, question.answer) ? 1 : 0
    setMcResult(correct)
    onAnswer(question.id, given, correct, secondsSpent())
  }

  // Anklickbare Optionen (Migration 0004 `questions.options`, Nutzerwunsch
  // 2026-07-22 — vorher musste der Buchstabe getippt werden). Der Klick
  // wählt UND reicht sofort ein, kein zusätzlicher „Einreichen"-Schritt
  // nötig — `given` (State) wäre hier noch nicht aktualisiert, deshalb der
  // Buchstabe direkt statt über `submitMc()`.
  const selectMcOption = (letter: string) => {
    if (!question) return
    setGiven(letter)
    const correct = isMcAnswerCorrect(letter, question.answer) ? 1 : 0
    setMcResult(correct)
    onAnswer(question.id, letter, correct, secondsSpent())
  }

  const reveal = () => setRevealed(true)

  const rateFreitext = (correct: 0 | 1) => {
    if (!question) return
    onAnswer(question.id, given, correct, secondsSpent())
    nextQuestion()
  }

  if (questions.length === 0) {
    return (
      <section aria-label="Quiz">
        <p>Dieses Quiz hat keine Fragen.</p>
      </section>
    )
  }

  if (done) {
    return (
      <section aria-label="Quiz">
        <p>Quiz abgeschlossen.</p>
        <button type="button" onClick={onFinish}>
          Auswerten und speichern
        </button>
      </section>
    )
  }

  return (
    <section aria-label="Quiz">
      <p>
        Frage {index + 1} von {questions.length}
        {question!.topic_id !== null && ` — ${topicById.get(question!.topic_id)?.name ?? `Thema ${question!.topic_id}`}`}
      </p>

      {remainingSeconds !== null && (
        <p aria-label="Verbleibende Zeit">
          Verbleibende Zeit: {formatRemaining(remainingSeconds)}
          {remainingSeconds < 0 && ' — Zeit abgelaufen, kein Zwang zum Abbrechen'}
        </p>
      )}

      <p style={{ whiteSpace: 'pre-line' }}>{question!.prompt}</p>

      {question!.type === 'mc' ? (
        <>
          {question!.options !== null ? (
            <div role="group" aria-label="Antwortoptionen">
              {question!.options.map((option, i) => {
                const letter = String.fromCharCode(65 + i) // 0 -> "A", 1 -> "B", …
                const isGiven = given === letter
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => selectMcOption(letter)}
                    disabled={mcResult !== null}
                    aria-pressed={isGiven}
                  >
                    {letter}) {option}
                    {mcResult !== null && letter === question!.answer && ' ✓'}
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <label>
                Antwort (Buchstabe)
                <input value={given} onChange={(e) => setGiven(e.target.value)} disabled={mcResult !== null} />
              </label>
              {mcResult === null && (
                <button type="button" onClick={submitMc} disabled={given.trim().length === 0}>
                  Antwort einreichen
                </button>
              )}
            </>
          )}
          {mcResult !== null && (
            <>
              <p>{mcResult === 1 ? 'Richtig!' : `Leider falsch — richtige Antwort: ${question!.answer}`}</p>
              {question!.explanation && <p>{question!.explanation}</p>}
              <button type="button" onClick={nextQuestion}>
                Weiter
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <label>
            Deine Antwort (optional, nur zur eigenen Erinnerung)
            <textarea value={given} onChange={(e) => setGiven(e.target.value)} disabled={revealed} />
          </label>
          {!revealed ? (
            <button type="button" onClick={reveal}>
              Antwort zeigen
            </button>
          ) : (
            <>
              <p>{question!.answer}</p>
              {question!.explanation && <p>{question!.explanation}</p>}
              <div>
                <button type="button" onClick={() => rateFreitext(1)}>
                  Richtig
                </button>
                <button type="button" onClick={() => rateFreitext(0)}>
                  Falsch
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
