import { useEffect, useMemo, useState } from 'react'
import { search, type SearchResult } from '../domain/search'
import type { Card, Course, Document, Topic } from '../data/schema'

/**
 * Schnellsuche als Overlay (⌘K/Strg+K, siehe App.tsx) — Nutzerwunsch
 * "Volltextsuche über Themen". Reine Präsentation über der bereits
 * geladenen `domain/search.ts`-Logik: Pfeiltasten wechseln das
 * hervorgehobene Ergebnis, Enter wählt es, Esc schließt. Glas-Overlay ist
 * hier bewusst erlaubt (DESIGN.md „Glass-Not-Shadow Rule" nennt Modals/
 * Popover ausdrücklich als legitimen Anwendungsfall für Vibrancy).
 */

export interface QuickSearchProps {
  courses: Course[]
  topics: Topic[]
  cards: Card[]
  documents: Document[]
  onSelect: (result: SearchResult) => void
  onClose: () => void
}

const KIND_LABELS: Record<SearchResult['kind'], string> = {
  course: 'Fach',
  topic: 'Thema',
  card: 'Karteikarte',
  document: 'Dokument',
}

export function QuickSearch({ courses, topics, cards, documents, onSelect, onClose }: QuickSearchProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => search(query, { courses, topics, cards, documents }), [query, courses, topics, cards, documents])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const result = results[activeIndex]
        if (result) onSelect(result)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="quick-search-backdrop" onClick={onClose}>
      <div className="quick-search-panel" role="dialog" aria-modal="true" aria-label="Schnellsuche" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Fächer, Themen, Karteikarten, Dokumente durchsuchen …"
          aria-label="Suche"
        />
        {query.trim().length > 0 && (
          <ul className="quick-search-results" role="listbox" aria-label="Suchergebnisse">
            {results.length === 0 ? (
              <li className="quick-search-empty">Keine Treffer.</li>
            ) : (
              results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    className={i === activeIndex ? 'quick-search-result quick-search-result--active' : 'quick-search-result'}
                    onClick={() => onSelect(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <span className="quick-search-result-kind">{KIND_LABELS[r.kind]}</span>
                    <span className="quick-search-result-title">{r.title}</span>
                    <span className="quick-search-result-subtitle">{r.subtitle}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
