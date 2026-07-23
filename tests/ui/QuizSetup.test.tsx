import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuizSetup } from '../../src/ui/QuizSetup'
import type { Assessment, Course, Document, Topic, TopicSection } from '../../src/data/schema'

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: 'Microeconomics',
    semester: 'WS26',
    color: '#c9754f',
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

function section(overrides: Partial<TopicSection> & { id: number; topic_id: number; document_id: number }): TopicSection {
  return { page_start: 1, page_end: 3, unique_chars: 500, slide_count: 2, ...overrides }
}

function document(overrides: Partial<Document> & { id: number; course_id: number }): Document {
  return {
    filename: 'Consumer Theory.pdf',
    stored_path: 'x',
    sha256: 'x',
    doc_type: 'folien',
    doc_type_label: null,
    pdf_pages: 10,
    slide_count: 10,
    unique_chars: 5000,
    imported_at: 'x',
    ...overrides,
  }
}

function assessment(overrides: Partial<Assessment> & { id: number; course_id: number }): Assessment {
  return {
    type: 'klausur',
    title: 'Endklausur',
    date: '2026-10-10',
    weight: 3,
    format: 'mixed',
    open_book: 0,
    duration_minutes: 90,
    ...overrides,
  }
}

/** Ein Fach mit einem wählbaren Abschnitt (PDF-Bytes geladen) — der übliche Ausgangszustand für die meisten Tests hier. */
function baseProps(onGenerate = vi.fn()) {
  return {
    courses: [course({ id: 1 })],
    topics: [topic({ id: 1, course_id: 1, name: 'Consumer Theory' })],
    topicSections: [section({ id: 1, topic_id: 1, document_id: 1 })],
    documents: [document({ id: 1, course_id: 1 })],
    documentBytes: { 1: new Uint8Array([1, 2, 3]) } as Record<number, Uint8Array>,
    assessments: [assessment({ id: 1, course_id: 1 })],
    onGenerate,
  }
}

describe('QuizSetup — Schritt-für-Schritt-Assistent', () => {
  it('startet im Schritt "Material" und blockiert "Weiter" ohne ausgewählten Abschnitt', () => {
    render(<QuizSetup {...baseProps()} />)
    expect(screen.getByText(/Schritt 1 von 5: Material/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
  })

  it('lässt "Weiter" erst nach Auswahl eines Abschnitts zu und führt durch alle Schritte', async () => {
    const user = userEvent.setup()
    render(<QuizSetup {...baseProps()} />)

    await user.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText(/Schritt 2 von 5: Fragen-Fokus/)).toBeInTheDocument()
    expect(screen.getByText('Was für Fragen möchtest du?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText(/Schritt 3 von 5: Umfang/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText(/Schritt 4 von 5: Art & Schwierigkeit/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText(/Schritt 5 von 5: Zusammenfassung/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quiz erzeugen' })).toBeInTheDocument()
  })

  it('geht mit "Zurück" einen Schritt zurück, ohne die bisherige Auswahl zu verlieren', async () => {
    const user = userEvent.setup()
    render(<QuizSetup {...baseProps()} />)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Weiter' }))
    await user.click(screen.getByLabelText(/Nur Rechenfragen/))
    await user.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(screen.getByText(/Schritt 1 von 5: Material/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('blockiert "Weiter" im Schritt "Art", solange bei Probeklausur keine Prüfung gewählt ist', async () => {
    const user = userEvent.setup()
    render(<QuizSetup {...baseProps()} />)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Fokus
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Umfang
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Art

    await user.click(screen.getByLabelText('Probeklausur (zeitbegrenzt)'))
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Prüfung'), '1')
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled()
  })

  it('rechnet den Umfangs-Voreinstellung korrekt auf Fragen je Abschnitt um', async () => {
    const user = userEvent.setup()
    const props = baseProps()
    props.topicSections = [
      section({ id: 1, topic_id: 1, document_id: 1 }),
      section({ id: 2, topic_id: 1, document_id: 1, page_start: 4, page_end: 6 }),
    ]
    render(<QuizSetup {...props} />)

    await user.click(screen.getAllByRole('checkbox')[0]!)
    await user.click(screen.getAllByRole('checkbox')[1]!)
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Fokus
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Umfang

    // Default-Voreinstellung "Mittel" = 12 Fragen gesamt / 2 Abschnitte = 6 je Abschnitt.
    expect(screen.getByText(/Ergibt 6 Frage\(n\) je ausgewähltem Abschnitt \(2 Abschnitte\)/)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Kurz/))
    expect(screen.getByText(/Ergibt 3 Frage\(n\) je ausgewähltem Abschnitt/)).toBeInTheDocument()
  })

  it('ruft onGenerate im letzten Schritt mit allen gesammelten Angaben auf', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(<QuizSetup {...baseProps(onGenerate)} />)

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Fokus
    await user.click(screen.getByLabelText(/Nur Konzeptverständnis/))
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Umfang
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Art
    await user.click(screen.getByRole('button', { name: 'Weiter' })) // -> Zusammenfassung
    await user.click(screen.getByRole('button', { name: 'Quiz erzeugen' }))

    expect(onGenerate).toHaveBeenCalledWith({
      courseId: 1,
      sectionIds: [1],
      questionsPerSection: 12,
      difficulty: 'mittel',
      focus: 'konzept',
      mode: 'quiz',
      assessmentId: null,
    })
  })

  it('zeigt einen Hinweis, wenn kein Themenabschnitt mit geladenem PDF verfügbar ist', () => {
    const props = baseProps()
    props.documentBytes = {}
    render(<QuizSetup {...props} />)
    expect(screen.getByText(/Keine Themenabschnitte mit geladenem PDF verfügbar/)).toBeInTheDocument()
  })
})
