import { useEffect, useState } from 'react'
import type { Topic } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'

/**
 * Formular „Karteikarte erstellen" (ROADMAP.md Phase 4 „Markieren im
 * Dokument → Karteikarten"). Erscheint, sobald `ui/PdfViewer.tsx` eine
 * nichtleere Textauswahl meldet (`ui/SourceViewer.tsx` hält den Zustand).
 * `source_quote` kommt aus der Markierung selbst und ist hier nur
 * schreibgeschützt sichtbar — Vorder-/Rückseite schreibt der Nutzer von
 * Hand (kein automatisches Frage-Antwort-Raten aus dem Zitat, das wäre
 * KI-Gebiet, nicht dieser Baustein). Reine Präsentation (ARCHITECTURE.md
 * „ui/") — Persistenz übernimmt der Aufrufer über `onCreate`.
 */

export interface CardCreatorProps {
  sourceQuote: string
  topics: Topic[]
  defaultTopicId: number | null
  documentId: number | null
  page: number | null
  onCreate: (input: NewCardInput) => void
  onDiscard: () => void
}

export function CardCreator({ sourceQuote, topics, defaultTopicId, documentId, page, onCreate, onDiscard }: CardCreatorProps) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [topicId, setTopicId] = useState<number | null>(defaultTopicId)

  // Neue Markierung -> Formular zurücksetzen, sonst bliebe der alte Entwurf stehen.
  useEffect(() => {
    setFront('')
    setBack('')
    setTopicId(defaultTopicId)
  }, [sourceQuote, defaultTopicId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topicId === null || front.trim().length === 0 || back.trim().length === 0) return
    onCreate({
      topic_id: topicId,
      document_id: documentId,
      page,
      front: front.trim(),
      back: back.trim(),
      source_quote: sourceQuote,
    })
  }

  return (
    <form aria-label="Karteikarte erstellen" onSubmit={submit}>
      <p>
        Markiert: „{sourceQuote}"
      </p>
      <label>
        Thema
        <select
          value={topicId ?? ''}
          onChange={(e) => setTopicId(e.target.value === '' ? null : Number(e.target.value))}
          required
        >
          <option value="" disabled>
            — auswählen —
          </option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Vorderseite
        <textarea value={front} onChange={(e) => setFront(e.target.value)} required />
      </label>
      <label>
        Rückseite
        <textarea value={back} onChange={(e) => setBack(e.target.value)} required />
      </label>
      <button type="submit">Karteikarte erstellen</button>
      <button type="button" onClick={onDiscard}>
        Verwerfen
      </button>
    </form>
  )
}
