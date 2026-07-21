import { useState } from 'react'
import { PdfViewer } from './PdfViewer'
import type { Topic, TopicSection } from '../data/schema'

/**
 * Verbindet den Themenbaum mit dem PDF-Viewer: „Seitensprung" heißt hier
 * konkret, direkt zur Quellseite eines Themas zu springen (`page_start`
 * aus `topic_sections`, die bereits die `document_id`/Seitenzahlen tragen,
 * siehe DATA_MODEL.md). Reine Präsentation (ARCHITECTURE.md „ui/") —
 * `documentBytes` kommt vom Aufrufer (`App.tsx`, während des PDF-Imports
 * im Speicher gehalten; siehe dortiger Kommentar zur fehlenden echten
 * Persistenz).
 */

export interface SourceViewerProps {
  topics: Topic[]
  topicSections: TopicSection[]
  /** PDF-Bytes je `document_id` — nur für Dokumente vorhanden, die in dieser Sitzung importiert wurden. */
  documentBytes: Record<number, Uint8Array>
}

export function SourceViewer({ topics, topicSections, documentBytes }: SourceViewerProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const selectedSection = topicSections.find((s) => s.id === selectedSectionId) ?? null

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
              <button type="button" onClick={() => setSelectedSectionId(section.id)}>
                Im PDF ansehen
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedSection &&
        (documentBytes[selectedSection.document_id] ? (
          <PdfViewer data={documentBytes[selectedSection.document_id]!} initialPage={selectedSection.page_start} />
        ) : (
          <p>PDF nicht mehr verfügbar — nur für die aktuelle Sitzung im Speicher (siehe App.tsx).</p>
        ))}
    </section>
  )
}
