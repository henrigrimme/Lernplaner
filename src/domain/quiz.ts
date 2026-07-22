/**
 * Reine Bewertungslogik für Quiz-Fragen (ROADMAP.md Phase 4:
 * Quiz-Generierung/Probeklausur-Simulation). Kennt weder DB noch UI noch
 * KI (ARCHITECTURE.md „domain/").
 *
 * Nur Multiple-Choice-Fragen werden automatisch verglichen (Buchstabe
 * gegen Buchstabe) — Freitext-Antworten automatisch mit der Musterantwort
 * zu vergleichen wäre unzuverlässig (unterschiedliche Formulierung glei-
 * cher Inhalte, Abkürzungen, Rechtschreibung). Für Freitext gilt dieselbe
 * Selbsteinschätzung wie bei den Karteikarten (`ui/FlashcardReview.tsx`):
 * die Musterantwort wird gezeigt, der Nutzer entscheidet selbst
 * richtig/falsch — `isMcAnswerCorrect` ist dafür nicht zuständig, die
 * Selbsteinschätzung fließt direkt als `Answer.correct` ein.
 */

/** Normalisiert Groß-/Kleinschreibung und umgebende Leerzeichen vor dem Vergleich. */
export function isMcAnswerCorrect(given: string, expected: string): boolean {
  return given.trim().toLowerCase() === expected.trim().toLowerCase()
}

/** Anteil richtiger Antworten (0–1) — `null` bei einem Quiz ohne beantwortete Fragen. */
export function computeQuizScore(answers: { correct: 0 | 1 }[]): number | null {
  if (answers.length === 0) return null
  return answers.filter((a) => a.correct === 1).length / answers.length
}
