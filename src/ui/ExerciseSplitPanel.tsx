import { useState } from 'react'
import type { Course, Document, Topic } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'
import { matchSolutions, type ExerciseSplitResult, type MatchedExercise } from '../ingest/exerciseSplit'

/**
 * Übungsblatt-Zerlegung (ROADMAP.md „Später/offen", Nutzerwunsch
 * 09.09.2026): ein importiertes Übungsblatt in Einzelaufgaben zerlegen und
 * die ausgewählten als Karteikarten übernehmen (Vorderseite = Aufgabe,
 * Rückseite leer zum Selberlösen, Quelle verlinkt). Die Erkennung
 * (`ingest/exerciseSplit.ts`) ist rein deterministisch, kein KI-Aufruf.
 *
 * **Optional eine Musterlösung koppeln** (Nutzerwunsch 09.09.2026, zweiter
 * Durchgang): ist zusätzlich ein Lösungsdokument gewählt, füllt die über
 * die Aufgabennummer zugeordnete Lösung die **Rückseite** der Karte
 * (`matchSolutions`) — sonst bleibt sie leer.
 *
 * Reine Präsentation (ARCHITECTURE.md „ui/"): `onSplit` liest ein Dokument
 * und liefert das Ergebnis, `onCreateCards` schreibt die Karten — nach
 * ausdrücklichem Klick, nie automatisch. Angeboten nur für Dokumente vom
 * Typ „Übungsblatt"/„Musterlösung" mit geladenen Bytes, dieselbe
 * Einschränkung wie bei `ui/AltklausurAnalysis.tsx`.
 */

export interface ExerciseSplitPanelProps {
  course: Course
  topics: Topic[]
  documents: Document[]
  documentBytes: Record<number, Uint8Array>
  onSplit: (documentId: number) => Promise<ExerciseSplitResult>
  onCreateCards: (inputs: NewCardInput[]) => Promise<void>
}

export function ExerciseSplitPanel({ course, topics, documents, documentBytes, onSplit, onCreateCards }: ExerciseSplitPanelProps) {
  const availableDocs = documents.filter(
    (d) =>
      d.course_id === course.id &&
      (d.doc_type === 'uebung' || d.doc_type === 'musterloesung') &&
      documentBytes[d.id] !== undefined,
  )
  const courseTopics = topics.filter((t) => t.course_id === course.id)

  const [docId, setDocId] = useState<number | null>(null)
  const [solutionDocId, setSolutionDocId] = useState<number | null>(null)
  const [matched, setMatched] = useState<MatchedExercise[] | null>(null)
  const [looksLikeSheet, setLooksLikeSheet] = useState(true)
  const [resultDocId, setResultDocId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [targetTopicId, setTargetTopicId] = useState<number | null>(courseTopics[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  if (availableDocs.length === 0) {
    return (
      <section aria-label="Übungsblatt zerlegen">
        <h3>Übungsblatt in Einzelaufgaben zerlegen</h3>
        <p>
          Kein als „Übungsblatt" oder „Musterlösung" importiertes Dokument mit geladenem Inhalt für {course.name}. Den
          Dokumenttyp kannst du oben in der Dokumentenliste anpassen.
        </p>
      </section>
    )
  }

  const effectiveDocId = docId ?? availableDocs[0]!.id
  const solutionDocs = availableDocs.filter((d) => d.id !== effectiveDocId)

  const resetResult = () => {
    setMatched(null)
    setResultDocId(null)
    setStatus(null)
  }

  const split = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await onSplit(effectiveDocId)
      const solutionRes =
        solutionDocId !== null && solutionDocs.some((d) => d.id === solutionDocId) ? await onSplit(solutionDocId) : null
      const pairs = matchSolutions(res.exercises, solutionRes?.exercises ?? [])
      setMatched(pairs)
      setLooksLikeSheet(res.looksLikeExerciseSheet)
      setResultDocId(effectiveDocId)
      setSelected(new Set(pairs.map((_, i) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Das Übungsblatt konnte nicht zerlegt werden.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const matchedCount = matched?.filter((m) => m.solution !== null).length ?? 0

  const createCards = async () => {
    if (!matched || resultDocId === null || targetTopicId === null) return
    const inputs: NewCardInput[] = matched
      .filter((_, i) => selected.has(i))
      .map(({ exercise, solution }) => ({
        topic_id: targetTopicId,
        document_id: resultDocId,
        page: exercise.pageStart,
        front: (exercise.label ? `Aufgabe ${exercise.number} — ${exercise.label}` : `Aufgabe ${exercise.number}`) + `\n\n${exercise.text}`,
        back: solution ? solution.text : '',
        source_quote: exercise.text,
      }))
    if (inputs.length === 0) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await onCreateCards(inputs)
      const withSolution = inputs.filter((c) => c.back.length > 0).length
      const suffix =
        withSolution > 0
          ? ` ${withSolution} davon mit Musterlösung auf der Rückseite, der Rest leer zum Selberlösen.`
          : ' Rückseite jeweils leer zum Selberlösen.'
      // Ergebnisliste einklappen, aber die Erfolgsmeldung stehen lassen
      // (`resetResult` würde sie mit wegräumen).
      setMatched(null)
      setResultDocId(null)
      setSelected(new Set())
      setStatus(`${inputs.length} Karteikarte${inputs.length === 1 ? '' : 'n'} angelegt.${suffix}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Karteikarten konnten nicht angelegt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Übungsblatt zerlegen">
      <h3>Übungsblatt in Einzelaufgaben zerlegen</h3>

      <label>
        Übungsblatt
        <select
          value={effectiveDocId}
          onChange={(e) => {
            const next = Number(e.target.value)
            setDocId(next)
            if (solutionDocId === next) setSolutionDocId(null)
            resetResult()
          }}
        >
          {availableDocs.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.filename}
            </option>
          ))}
        </select>
      </label>

      {solutionDocs.length > 0 && (
        <label>
          Musterlösung (optional) — füllt die Rückseite der Karten
          <select
            value={solutionDocId ?? ''}
            onChange={(e) => {
              setSolutionDocId(e.target.value === '' ? null : Number(e.target.value))
              resetResult()
            }}
          >
            <option value="">— keine —</option>
            {solutionDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="button" onClick={split} disabled={busy}>
        {busy && !matched ? 'Wird zerlegt…' : 'In Einzelaufgaben zerlegen'}
      </button>

      {matched && (
        <div className="exercise-split-result">
          {matched.length === 0 ? (
            <p>Keine nummerierten Aufgaben erkannt. Erkannt werden Aufgaben, die mit „1.", „2." oder „1)", „2)" beginnen.</p>
          ) : (
            <>
              {!looksLikeSheet && (
                <p role="status">
                  Hinweis: Das sieht eher nach einer Folien-/Agenda-Liste aus als nach einem Übungsblatt. Prüfe die
                  erkannten Aufgaben unten, bevor du sie übernimmst.
                </p>
              )}
              <p>
                {matched.length} Aufgaben erkannt
                {solutionDocId !== null ? ` — ${matchedCount} mit Musterlösung zugeordnet` : ''}:
              </p>
              <ul className="exercise-split-list">
                {matched.map(({ exercise, solution }, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                      <strong>
                        {exercise.number}
                        {exercise.label ? ` — ${exercise.label}` : ''}
                      </strong>{' '}
                      <span title={exercise.text}>
                        {exercise.text.replace(/\s+/g, ' ').slice(0, 140)}
                        {exercise.text.length > 140 ? '…' : ''}
                      </span>{' '}
                      {solutionDocId !== null && (
                        <span className="exercise-split-solution" title={solution ? solution.text : 'keine Lösung zugeordnet'}>
                          {solution ? '＋ Lösung' : 'ohne Lösung'}
                        </span>
                      )}
                      <span className="exercise-split-page">
                        S.&nbsp;{exercise.pageStart}
                        {exercise.pageEnd !== exercise.pageStart ? `–${exercise.pageEnd}` : ''}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              {courseTopics.length === 0 ? (
                <p>Für dieses Fach gibt es noch kein Thema — lege im Reiter „Themen &amp; Quellen" eines an, dann lassen sich die Aufgaben als Karteikarten übernehmen.</p>
              ) : (
                <>
                  <label>
                    Als Karteikarten unter Thema
                    <select
                      value={targetTopicId ?? ''}
                      onChange={(e) => setTargetTopicId(e.target.value === '' ? null : Number(e.target.value))}
                    >
                      {courseTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={createCards} disabled={busy || selected.size === 0 || targetTopicId === null}>
                    {busy ? 'Wird übernommen…' : `Als Karteikarten übernehmen (${selected.size})`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
