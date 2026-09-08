import { useState } from 'react'
import type { Card, Course, Topic } from '../data/schema'
import type { NewCardInput } from '../data/cardsRepo'
import { htmlToPlainText } from '../ingest/htmlSanitize'

/**
 * Übersicht aller Karteikarten, nach **Fach → Thema** gruppiert
 * (Nutzerwunsch 2026-09-08: „nicht wirr an Karten, sondern die einzelnen
 * Fächer im Kartenkasten sehen"). Je Gruppe die Kartenzahl; je Karte
 * Bearbeiten (Vorder-/Rückseite inline) und Löschen (mit kurzer
 * Rückfrage in der Zeile, kein eigener Dialog — eine einzelne Karte
 * kaskadiert nur auf ihre Wiederholungen).
 *
 * Reine Präsentation — `onUpdate`/`onDelete` kommen von `App.tsx`.
 */

export interface CardListProps {
  cards: Card[]
  topics: Topic[]
  courses: Course[]
  onUpdate: (id: number, changes: Partial<NewCardInput>) => void
  onDelete: (id: number) => void
}

function preview(text: string): string {
  const flat = htmlToPlainText(text).replace(/\s+/g, ' ').trim()
  return flat.length > 100 ? `${flat.slice(0, 100)}…` : flat
}

export function CardList({ cards, topics, courses, onUpdate, onDelete }: CardListProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftFront, setDraftFront] = useState('')
  const [draftBack, setDraftBack] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  if (cards.length === 0) {
    return <p className="empty-state-inline">Noch keine Karteikarten.</p>
  }

  const topicById = new Map(topics.map((t) => [t.id, t]))
  const courseById = new Map(courses.map((c) => [c.id, c]))

  // cards → { courseId → { topicId → Card[] } }
  const byCourse = new Map<number, Map<number, Card[]>>()
  for (const card of cards) {
    const topic = topicById.get(card.topic_id)
    const courseId = topic?.course_id ?? -1
    if (!byCourse.has(courseId)) byCourse.set(courseId, new Map())
    const byTopic = byCourse.get(courseId)!
    if (!byTopic.has(card.topic_id)) byTopic.set(card.topic_id, [])
    byTopic.get(card.topic_id)!.push(card)
  }

  const courseGroups = [...byCourse.entries()].sort(([a], [b]) =>
    (courseById.get(a)?.name ?? '').localeCompare(courseById.get(b)?.name ?? ''),
  )

  const startEdit = (card: Card) => {
    setEditingId(card.id)
    setDraftFront(card.front)
    setDraftBack(card.back)
    setConfirmDeleteId(null)
  }

  const saveEdit = (id: number) => {
    if (draftFront.trim().length === 0 || draftBack.trim().length === 0) return
    onUpdate(id, { front: draftFront.trim(), back: draftBack.trim() })
    setEditingId(null)
  }

  return (
    <div className="card-list">
      {courseGroups.map(([courseId, byTopic]) => {
        const courseName = courseById.get(courseId)?.name ?? 'Ohne Fach'
        const courseCount = [...byTopic.values()].reduce((sum, list) => sum + list.length, 0)
        const topicGroups = [...byTopic.entries()].sort(([a], [b]) =>
          (topicById.get(a)?.name ?? '').localeCompare(topicById.get(b)?.name ?? ''),
        )
        return (
          <section key={courseId} aria-label={`Karten: ${courseName}`}>
            <h3>
              {courseName} <span className="card-list-count">{courseCount}</span>
            </h3>
            {topicGroups.map(([topicId, list]) => (
              <div key={topicId} className="card-list-topic">
                <h4>
                  {topicById.get(topicId)?.name ?? `Thema ${topicId}`} <span className="card-list-count">{list.length}</span>
                </h4>
                <ul>
                  {list.map((card) => (
                    <li key={card.id}>
                      {editingId === card.id ? (
                        <div className="card-list-edit">
                          <label>
                            Vorderseite
                            <textarea value={draftFront} onChange={(e) => setDraftFront(e.target.value)} rows={2} />
                          </label>
                          <label>
                            Rückseite
                            <textarea value={draftBack} onChange={(e) => setDraftBack(e.target.value)} rows={3} />
                          </label>
                          <div className="card-list-actions">
                            <button type="button" onClick={() => saveEdit(card.id)}>
                              Speichern
                            </button>
                            <button type="button" onClick={() => setEditingId(null)}>
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="card-list-front">{preview(card.front)}</span>
                          {confirmDeleteId === card.id ? (
                            <span className="card-list-actions">
                              Löschen?
                              <button type="button" onClick={() => { onDelete(card.id); setConfirmDeleteId(null) }}>
                                Ja
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)}>
                                Nein
                              </button>
                            </span>
                          ) : (
                            <span className="card-list-actions">
                              <button type="button" onClick={() => startEdit(card)}>
                                Bearbeiten
                              </button>
                              <button
                                type="button"
                                aria-label={`Karte „${preview(card.front)}" löschen`}
                                onClick={() => setConfirmDeleteId(card.id)}
                              >
                                Löschen
                              </button>
                            </span>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
