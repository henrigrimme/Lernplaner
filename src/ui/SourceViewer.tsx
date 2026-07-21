import { useState } from 'react'
import { PdfViewer } from './PdfViewer'
import { CardCreator } from './CardCreator'
import type { Card, Topic, TopicSection } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'

/**
 * Verbindet den Themenbaum mit dem PDF-Viewer: „Seitensprung" heißt hier
 * konkret, direkt zur Quellseite eines Themas zu springen (`page_start`
 * aus `topic_sections`, die bereits die `document_id`/Seitenzahlen tragen,
 * siehe DATA_MODEL.md). Reine Präsentation (ARCHITECTURE.md „ui/") —
 * `documentBytes` kommt vom Aufrufer (`App.tsx`, während des PDF-Imports
 * im Speicher gehalten; siehe dortiger Kommentar zur fehlenden echten
 * Persistenz).
 *
 * **Markieren → Karteikarte** (ROADMAP.md Phase 4): `PdfViewer` meldet
 * Textauswahl über `onSelectionChange`, hier als `selection`-Zustand
 * gehalten. Bei einer nichtleeren Auswahl erscheint `CardCreator` mit dem
 * markierten Text als `source_quote` und dem Thema des gerade
 * betrachteten Abschnitts als Vorschlag (überschreibbar). `cards` wird nur
 * nach Thema gefiltert angezeigt, nicht nach Dokument/Seite — eine Karte
 * gehört fachlich zum Thema, nicht zur zufälligen Fundstelle.
 */

export interface SourceViewerProps {
  topics: Topic[]
  topicSections: TopicSection[]
  /** PDF-Bytes je `document_id` — nur für Dokumente vorhanden, die in dieser Sitzung importiert wurden. */
  documentBytes: Record<number, Uint8Array>
  cards: Card[]
  onCreateCard: (input: NewCardInput) => void
  onDeleteCard: (id: number) => void
}

export function SourceViewer({ topics, topicSections, documentBytes, cards, onCreateCard, onDeleteCard }: SourceViewerProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [selection, setSelection] = useState<{ text: string; page: number } | null>(null)
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const selectedSection = topicSections.find((s) => s.id === selectedSectionId) ?? null

  const selectSection = (id: number) => {
    setSelectedSectionId(id)
    setSelection(null)
  }

  const handleSelectionChange = (text: string, page: number) => {
    setSelection(text.trim().length > 0 ? { text: text.trim(), page } : null)
  }

  const cardsForTopic = selectedSection ? cards.filter((c) => c.topic_id === selectedSection.topic_id) : []

  return (
    <section aria-label="Quellen">
      <h2>Quellen</h2>

      {topicSections.length === 0 ? (
        <p>Noch keine Materialien importiert.</p>
      ) : (
        <ul>
          {topicSections.map((section) => (
            <li key={section.id}>
              {topicById.get(section.topic_id)?.name ?? `Thema ${section.topic_id}`} — Seite {section.page_start}
              {section.page_end !== section.page_start && `–${section.page_end}`}
              <button type="button" onClick={() => selectSection(section.id)}>
                Im PDF ansehen
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedSection &&
        (documentBytes[selectedSection.document_id] ? (
          <PdfViewer
            data={documentBytes[selectedSection.document_id]!}
            initialPage={selectedSection.page_start}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <p>PDF nicht mehr verfügbar — nur für die aktuelle Sitzung im Speicher (siehe App.tsx).</p>
        ))}

      {selection && selectedSection && (
        <CardCreator
          sourceQuote={selection.text}
          topics={topics}
          defaultTopicId={selectedSection.topic_id}
          documentId={selectedSection.document_id}
          page={selection.page}
          onCreate={(input) => {
            onCreateCard(input)
            setSelection(null)
          }}
          onDiscard={() => setSelection(null)}
        />
      )}

      {selectedSection && cardsForTopic.length > 0 && (
        <div>
          <h3>Karteikarten — {topicById.get(selectedSection.topic_id)?.name ?? `Thema ${selectedSection.topic_id}`}</h3>
          <ul>
            {cardsForTopic.map((card) => (
              <li key={card.id}>
                {card.front}
                <button type="button" onClick={() => onDeleteCard(card.id)}>
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
