import type { Card, Course, Document, Topic } from '../data/schema'

/**
 * Schnellsuche über bereits geladene Fächer/Themen/Karteikarten/Dokumente
 * (Nutzerwunsch 2026-07-24: "Volltextsuche über Themen" — mit wachsender
 * Materialmenge im Semester wird das Fach-für-Fach-Durchklicken
 * unpraktisch). Bewusst **keine** Volltextsuche über den eigentlichen
 * Dokumentinhalt (PDF-Text wird nirgends dauerhaft gespeichert, nur
 * transient beim Import/bei der Quiz-Generierung geladen — das zu ändern
 * wäre ein eigenes, größeres Datenmodell-Vorhaben) — durchsucht wird, was
 * die App bereits als Zustand hält: Fach-/Themennamen, Karteikarten-Vorder-
 * /Rückseite, Dokument-Dateinamen. Reine Funktion (ARCHITECTURE.md
 * „domain/"), keine eigene Bibliothek — einfache Teilstring-Suche reicht
 * für die erwartete Materialmenge zweier Studierender.
 */

export type SearchResultKind = 'course' | 'topic' | 'card' | 'document'

export interface SearchResult {
  kind: SearchResultKind
  id: number
  /** Zum Navigieren: welches Fach muss ausgewählt werden, um dieses Ergebnis zu sehen. */
  courseId: number
  title: string
  subtitle: string
}

export interface SearchableData {
  courses: Course[]
  topics: Topic[]
  cards: Card[]
  documents: Document[]
}

const MAX_RESULTS = 30

export function search(query: string, data: SearchableData): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []

  const courseById = new Map(data.courses.map((c) => [c.id, c]))
  const topicById = new Map(data.topics.map((t) => [t.id, t]))
  const results: SearchResult[] = []

  for (const course of data.courses) {
    if (course.archived === 1) continue
    if (course.name.toLowerCase().includes(q)) {
      results.push({ kind: 'course', id: course.id, courseId: course.id, title: course.name, subtitle: 'Fach' })
    }
  }

  for (const topic of data.topics) {
    if (!topic.name.toLowerCase().includes(q)) continue
    const course = courseById.get(topic.course_id)
    if (!course || course.archived === 1) continue
    results.push({ kind: 'topic', id: topic.id, courseId: topic.course_id, title: topic.name, subtitle: `Thema — ${course.name}` })
  }

  for (const card of data.cards) {
    if (!card.front.toLowerCase().includes(q) && !card.back.toLowerCase().includes(q)) continue
    const topic = topicById.get(card.topic_id)
    const course = topic ? courseById.get(topic.course_id) : undefined
    if (!topic || !course || course.archived === 1) continue
    results.push({ kind: 'card', id: card.id, courseId: topic.course_id, title: card.front, subtitle: `Karteikarte — ${course.name}` })
  }

  for (const doc of data.documents) {
    if (!doc.filename.toLowerCase().includes(q)) continue
    const course = courseById.get(doc.course_id)
    if (!course || course.archived === 1) continue
    results.push({ kind: 'document', id: doc.id, courseId: doc.course_id, title: doc.filename, subtitle: `Dokument — ${course.name}` })
  }

  return results.slice(0, MAX_RESULTS)
}
