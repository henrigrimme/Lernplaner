import { describe, expect, it } from 'vitest'
import { search } from '../../src/domain/search'
import type { Card, Course, Document, Topic } from '../../src/data/schema'

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: `Fach ${overrides.id}`,
    semester: 'WS26',
    color: '#000',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
    group_id: null,
    instructions: '',
    ...overrides,
  }
}

function topic(overrides: Partial<Topic> & { id: number; course_id: number }): Topic {
  return {
    parent_id: null,
    name: `Thema ${overrides.id}`,
    normalized_name: `thema${overrides.id}`,
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
    ...overrides,
  }
}

function card(overrides: Partial<Card> & { id: number; topic_id: number }): Card {
  return {
    document_id: null,
    page: null,
    front: 'Frage',
    back: 'Antwort',
    source_quote: null,
    created_at: 'x',
    ...overrides,
  }
}

function document(overrides: Partial<Document> & { id: number; course_id: number }): Document {
  return {
    filename: 'Datei.pdf',
    stored_path: '/x',
    sha256: 'abc',
    doc_type: 'folien',
    doc_type_label: null,
    pdf_pages: 10,
    slide_count: 10,
    unique_chars: 100,
    imported_at: 'x',
    ...overrides,
  }
}

describe('search', () => {
  it('liefert nichts bei leerer Anfrage', () => {
    expect(search('', { courses: [course({ id: 1 })], topics: [], cards: [], documents: [] })).toEqual([])
    expect(search('   ', { courses: [course({ id: 1 })], topics: [], cards: [], documents: [] })).toEqual([])
  })

  it('findet ein Fach unabhängig von Groß-/Kleinschreibung', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const results = search('MICRO', { courses, topics: [], cards: [], documents: [] })
    expect(results).toEqual([{ kind: 'course', id: 1, courseId: 1, title: 'Microeconomics', subtitle: 'Fach' }])
  })

  it('lässt archivierte Fächer und ihre Themen/Karten/Dokumente aus', () => {
    const courses = [course({ id: 1, name: 'Altes Fach', archived: 1 })]
    const topics = [topic({ id: 1, course_id: 1, name: 'Altes Fach Thema' })]
    expect(search('altes fach', { courses, topics, cards: [], documents: [] })).toEqual([])
  })

  it('findet ein Thema und nennt das zugehörige Fach im Untertitel', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const topics = [topic({ id: 1, course_id: 1, name: 'Consumer Theory' })]
    const results = search('consumer', { courses, topics, cards: [], documents: [] })
    expect(results).toEqual([
      { kind: 'topic', id: 1, courseId: 1, title: 'Consumer Theory', subtitle: 'Thema — Microeconomics' },
    ])
  })

  it('findet eine Karteikarte über Vorder- oder Rückseite', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const topics = [topic({ id: 1, course_id: 1 })]
    const cards = [
      card({ id: 1, topic_id: 1, front: 'Was ist Elastizität?', back: 'Eine Kennzahl' }),
      card({ id: 2, topic_id: 1, front: 'Andere Frage', back: 'Elastizität kommt hier auch vor' }),
    ]
    const results = search('elastizität', { courses, topics, cards, documents: [] })
    expect(results.map((r) => r.id).sort()).toEqual([1, 2])
    expect(results[0]!.subtitle).toBe('Karteikarte — Microeconomics')
  })

  it('findet ein Dokument über den Dateinamen', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const documents = [document({ id: 1, course_id: 1, filename: 'Kapitel 3 - Nachfrage.pdf' })]
    const results = search('nachfrage', { courses, topics: [], cards: [], documents })
    expect(results).toEqual([
      { kind: 'document', id: 1, courseId: 1, title: 'Kapitel 3 - Nachfrage.pdf', subtitle: 'Dokument — Microeconomics' },
    ])
  })

  it('deckelt die Trefferzahl auf 30', () => {
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    const topics = Array.from({ length: 40 }, (_, i) => topic({ id: i + 1, course_id: 1, name: `Thema Nummer ${i}` }))
    const results = search('thema', { courses, topics, cards: [], documents: [] })
    expect(results.length).toBe(30)
  })
})
