import { useState } from 'react'
import type { Course, Document, Topic } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'
import type { ExerciseSplitResult } from '../ingest/exerciseSplit'

/**
 * Übungsblatt-Zerlegung (ROADMAP.md „Später/offen", Nutzerwunsch
 * 09.09.2026): ein importiertes Übungsblatt in Einzelaufgaben zerlegen und
 * die ausgewählten als Karteikarten übernehmen (Vorderseite = Aufgabe,
 * Rückseite leer zum Selberlösen, Quelle verlinkt). Die Erkennung
 * (`ingest/exerciseSplit.ts`) ist rein deterministisch, kein KI-Aufruf.
 *
 * Reine Präsentation (ARCHITECTURE.md „ui/"): `onSplit` liest das Dokument
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
  const [result, setResult] = useState<ExerciseSplitResult | null>(null)
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

  const split = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await onSplit(effectiveDocId)
      setResult(res)
      setResultDocId(effectiveDocId)
      setSelected(new Set(res.exercises.map((_, i) => i)))
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

  const createCards = async () => {
    if (!result || resultDocId === null || targetTopicId === null) return
    const inputs: NewCardInput[] = result.exercises
      .filter((_, i) => selected.has(i))
      .map((ex) => ({
        topic_id: targetTopicId,
        document_id: resultDocId,
        page: ex.pageStart,
        front: (ex.label ? `Aufgabe ${ex.number} — ${ex.label}` : `Aufgabe ${ex.number}`) + `\n\n${ex.text}`,
        back: '',
        source_quote: ex.text,
      }))
    if (inputs.length === 0) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await onCreateCards(inputs)
      setStatus(`${inputs.length} Karteikarte${inputs.length === 1 ? '' : 'n'} angelegt — Rückseite jeweils leer zum Selberlösen.`)
      setResult(null)
      setResultDocId(null)
      setSelected(new Set())
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
        Dokument
        <select
          value={effectiveDocId}
          onChange={(e) => {
            setDocId(Number(e.target.value))
            setResult(null)
            setResultDocId(null)
            setStatus(null)
          }}
        >
          {availableDocs.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.filename}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={split} disabled={busy}>
        {busy && !result ? 'Wird zerlegt…' : 'In Einzelaufgaben zerlegen'}
      </button>

      {result && (
        <div>
          {result.exercises.length === 0 ? (
            <p>Keine nummerierten Aufgaben erkannt. Erkannt werden Aufgaben, die mit „1.", „2." oder „1)", „2)" beginnen.</p>
          ) : (
            <>
              {!result.looksLikeExerciseSheet && (
                <p role="status">
                  Hinweis: Das sieht eher nach einer Folien-/Agenda-Liste aus als nach einem Übungsblatt. Prüfe die
                  erkannten Aufgaben unten, bevor du sie übernimmst.
                </p>
              )}
              <p>{result.exercises.length} Aufgaben erkannt:</p>
              <ul className="exercise-split-list">
                {result.exercises.map((ex, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                      <strong>
                        {ex.number}
                        {ex.label ? ` — ${ex.label}` : ''}
                      </strong>{' '}
                      <span title={ex.text}>
                        {ex.text.replace(/\s+/g, ' ').slice(0, 140)}
                        {ex.text.length > 140 ? '…' : ''}
                      </span>{' '}
                      <span className="exercise-split-page">
                        S.&nbsp;{ex.pageStart}
                        {ex.pageEnd !== ex.pageStart ? `–${ex.pageEnd}` : ''}
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
