import { useState } from 'react'
import { DOCUMENT_TYPE_OPTIONS } from '../ingest/docType'
import type { Course, Document, DocumentType } from '../data/schema'

/**
 * Dokumenttyp nachträglich korrigieren (Nutzerwunsch 2026-07-22): die
 * automatische Erkennung beim Import (`ingest/docType.ts`) rät nur aus
 * dem Dateinamen — bei einer falschen Vermutung muss sich das nachträglich
 * ändern lassen, ohne das Dokument neu zu importieren. Reine Präsentation
 * (ARCHITECTURE.md „ui/") — `onChangeType` speichert.
 */

export interface DocumentListProps {
  course: Course
  documents: Document[]
  onChangeType: (id: number, docType: DocumentType, docTypeLabel: string | null) => void
}

export function DocumentList({ course, documents, onChangeType }: DocumentListProps) {
  const courseDocuments = documents.filter((d) => d.course_id === course.id)
  const [customLabelDraft, setCustomLabelDraft] = useState<Record<number, string>>({})

  if (courseDocuments.length === 0) return null

  return (
    <section aria-label="Importierte Dokumente">
      <h3>Importierte Dokumente — {course.name}</h3>
      <ul>
        {courseDocuments.map((doc) => (
          <li key={doc.id}>
            {doc.filename}
            <select
              value={doc.doc_type}
              onChange={(e) => {
                const nextType = e.target.value as DocumentType
                onChangeType(doc.id, nextType, nextType === 'sonstiges' ? doc.doc_type_label : null)
              }}
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {doc.doc_type === 'sonstiges' && (
              <input
                value={customLabelDraft[doc.id] ?? doc.doc_type_label ?? ''}
                onChange={(e) => setCustomLabelDraft((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                onBlur={() => onChangeType(doc.id, 'sonstiges', (customLabelDraft[doc.id] ?? doc.doc_type_label ?? '').trim() || null)}
                placeholder="eigene Bezeichnung"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
