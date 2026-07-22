import { useState } from 'react'
import type { WeightSuggestion } from '../domain/examWeighting'
import type { Course, Document, Topic } from '../data/schema'

/**
 * Altklausur-Analyse → automatische Gewichtung (ROADMAP.md Phase 4),
 * verdrahtet nach demselben ADR-005-Prinzip wie `ui/ReplanView.tsx`:
 * **Vorschlag, nie automatisch** — `onAnalyze` liefert nur eine
 * Vorschau (`domain/examWeighting.ts`), erst der ausdrückliche
 * „Übernehmen"-Klick (`onApply`) ändert echte Themengewichte. Reine
 * Präsentation (ARCHITECTURE.md „ui/").
 *
 * Nur Dokumente vom Typ `altklausur` mit noch geladenen PDF-Bytes
 * wählbar — dieselbe Einschränkung wie bei `ui/QuizSetup.tsx` (Belegtext
 * nur für in dieser Sitzung importierte Dokumente verfügbar).
 */

export interface AltklausurAnalysisProps {
  course: Course
  topics: Topic[]
  documents: Document[]
  documentBytes: Record<number, Uint8Array>
  onAnalyze: (documentIds: number[]) => Promise<WeightSuggestion[]>
  onApply: (suggestions: WeightSuggestion[]) => Promise<void>
}

export function AltklausurAnalysis({ course, topics, documents, documentBytes, onAnalyze, onApply }: AltklausurAnalysisProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set())
  const [preview, setPreview] = useState<WeightSuggestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topicById = new Map(topics.map((t) => [t.id, t]))
  const availableDocs = documents.filter(
    (d) => d.course_id === course.id && d.doc_type === 'altklausur' && documentBytes[d.id] !== undefined,
  )

  const toggleDoc = (id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const analyze = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await onAnalyze(Array.from(selectedDocIds))
      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Altklausuren konnten nicht analysiert werden.')
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      await onApply(preview)
      setPreview(null)
      setSelectedDocIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gewichte konnten nicht übernommen werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Altklausur-Analyse">
      <h3>Altklausur-Analyse — automatische Gewichtung</h3>

      {availableDocs.length === 0 ? (
        <p>
          Keine als „Altklausur" importierten Dokumente mit noch geladenem PDF für {course.name} verfügbar (PDFs bleiben
          nur für die laufende Sitzung im Speicher).
        </p>
      ) : (
        <>
          <ul>
            {availableDocs.map((doc) => (
              <li key={doc.id}>
                <label>
                  <input type="checkbox" checked={selectedDocIds.has(doc.id)} onChange={() => toggleDoc(doc.id)} />
                  {doc.filename}
                </label>
              </li>
            ))}
          </ul>

          <button type="button" onClick={analyze} disabled={busy || selectedDocIds.size === 0}>
            {busy ? 'Wird analysiert…' : 'Analysieren'}
          </button>
        </>
      )}

      {preview && (
        <div>
          {preview.length === 0 ? (
            <p>Keine ausreichend häufig geprüften Themen gefunden — keine Gewichtsänderung vorgeschlagen.</p>
          ) : (
            <>
              <p>Vorschlag auf Basis der ausgewählten Altklausuren:</p>
              <ul>
                {preview.map((s) => (
                  <li key={s.topicId}>
                    {topicById.get(s.topicId)?.name ?? `Thema ${s.topicId}`}: Gewicht {s.currentWeight} → {s.suggestedWeight}{' '}
                    ({s.occurrences} Fragen erkannt)
                  </li>
                ))}
              </ul>
              <button type="button" onClick={apply} disabled={busy}>
                Übernehmen
              </button>
            </>
          )}
          <button type="button" onClick={() => setPreview(null)} disabled={busy}>
            Verwerfen
          </button>
        </div>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  )
}
