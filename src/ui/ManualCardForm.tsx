import { useState } from 'react'
import type { Course, Topic } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'

/**
 * „Neue Karteikarte" von Hand (Nutzerwunsch 2026-09-08: einen echten
 * Karteikarten-Bereich, in dem man Karten auch ohne den Umweg über ein
 * markiertes Dokument anlegt). Fach → Thema → Vorder-/Rückseite. Reine
 * Präsentation — Persistenz über `onCreate` (`App.tsx` `handleCreateCard`).
 *
 * `document_id`/`page`/`source_quote` bleiben `null` (keine Quelle) —
 * anders als bei `ui/CardCreator.tsx`, das aus einer PDF-Markierung
 * entsteht.
 */

export interface ManualCardFormProps {
  courses: Course[]
  topics: Topic[]
  onCreate: (input: NewCardInput) => void
}

export function ManualCardForm({ courses, topics, onCreate }: ManualCardFormProps) {
  const activeCourses = courses.filter((c) => c.archived === 0)
  const [courseId, setCourseId] = useState<number | null>(activeCourses[0]?.id ?? null)
  const courseTopics = topics.filter((t) => t.course_id === courseId).sort((a, b) => a.sort_order - b.sort_order)
  const [topicId, setTopicId] = useState<number | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const effectiveTopicId = topicId !== null && courseTopics.some((t) => t.id === topicId) ? topicId : courseTopics[0]?.id ?? null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (effectiveTopicId === null || front.trim().length === 0 || back.trim().length === 0) return
    onCreate({ topic_id: effectiveTopicId, document_id: null, page: null, front: front.trim(), back: back.trim(), source_quote: null })
    setFront('')
    setBack('')
    setJustSaved(true)
  }

  if (activeCourses.length === 0) {
    return <p className="empty-state-inline">Leg zuerst unter „Fächer &amp; Themen" ein Fach mit mindestens einem Thema an.</p>
  }

  return (
    <form onSubmit={submit} aria-label="Neue Karteikarte">
      <label>
        Fach
        <select
          value={courseId ?? ''}
          onChange={(e) => {
            setCourseId(e.target.value === '' ? null : Number(e.target.value))
            setTopicId(null)
            setJustSaved(false)
          }}
        >
          {activeCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {courseTopics.length === 0 ? (
        <p className="empty-state-inline">Dieses Fach hat noch keine Themen — importiere Material oder lege im Themenbaum eins an.</p>
      ) : (
        <>
          <label>
            Thema
            <select
              value={effectiveTopicId ?? ''}
              onChange={(e) => {
                setTopicId(e.target.value === '' ? null : Number(e.target.value))
                setJustSaved(false)
              }}
            >
              {courseTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vorderseite
            <textarea value={front} onChange={(e) => { setFront(e.target.value); setJustSaved(false) }} rows={2} required />
          </label>
          <label>
            Rückseite
            <textarea value={back} onChange={(e) => { setBack(e.target.value); setJustSaved(false) }} rows={3} required />
          </label>
          <button type="submit" disabled={front.trim().length === 0 || back.trim().length === 0}>
            Karteikarte hinzufügen
          </button>
          {justSaved && <p role="status">Gespeichert — nächste Karte kann direkt eingegeben werden.</p>}
        </>
      )}
    </form>
  )
}
