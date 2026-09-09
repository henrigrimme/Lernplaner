import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseSplitPanel } from '../../src/ui/ExerciseSplitPanel'
import type { Course, Document, Topic } from '../../src/data/schema'
import type { ExerciseSplitResult } from '../../src/ingest/exerciseSplit'

function course(o: Partial<Course> & { id: number }): Course {
  return { name: `Fach ${o.id}`, semester: 'WS26', color: '#000', priority: 3, difficulty: 3, archived: 0, created_at: 'x', language: 'de', group_id: null, instructions: '', ...o }
}
function topic(o: Partial<Topic> & { id: number }): Topic {
  return { course_id: 1, parent_id: null, name: `Thema ${o.id}`, normalized_name: `t${o.id}`, weight: 3, difficulty: 3, sort_order: 0, status: 'offen', manual_override: 0, ...o }
}
function doc(o: Partial<Document> & { id: number }): Document {
  return {
    course_id: 1,
    filename: `Problem Set ${o.id}.pdf`,
    stored_path: `documents/${o.id}.pdf`,
    sha256: 'abc',
    doc_type: 'uebung',
    doc_type_label: null,
    pdf_pages: 2,
    slide_count: 0,
    unique_chars: 100,
    imported_at: 'x',
    ...o,
  }
}

const COURSE = course({ id: 1, name: 'Money & Banking' })
const TOPICS = [topic({ id: 10, name: 'Anleihen' })]
const BYTES = { 5: new Uint8Array([1, 2, 3]) }

const RESULT: ExerciseSplitResult = {
  preamble: ['Problem Set 1'],
  looksLikeExerciseSheet: true,
  exercises: [
    { number: '1', label: 'Leverage', text: 'Janet and Mike buy houses.', pageStart: 1, pageEnd: 1 },
    { number: '2', label: 'Risk', text: 'Assume high or low growth for the coming year.', pageStart: 1, pageEnd: 2 },
  ],
}

describe('ExerciseSplitPanel', () => {
  it('weist auf fehlende Dokumente hin, wenn kein Übungsblatt geladen ist', () => {
    render(
      <ExerciseSplitPanel
        course={COURSE}
        topics={TOPICS}
        documents={[doc({ id: 5, doc_type: 'folien' })]}
        documentBytes={BYTES}
        onSplit={vi.fn()}
        onCreateCards={vi.fn()}
      />,
    )
    expect(screen.getByText(/Kein als „Übungsblatt"/)).toBeInTheDocument()
  })

  it('zerlegt und legt die ausgewählten Aufgaben als Karteikarten an', async () => {
    const user = userEvent.setup()
    const onSplit = vi.fn().mockResolvedValue(RESULT)
    const onCreateCards = vi.fn().mockResolvedValue(undefined)
    render(
      <ExerciseSplitPanel
        course={COURSE}
        topics={TOPICS}
        documents={[doc({ id: 5 })]}
        documentBytes={BYTES}
        onSplit={onSplit}
        onCreateCards={onCreateCards}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'In Einzelaufgaben zerlegen' }))
    expect(onSplit).toHaveBeenCalledWith(5)
    expect(await screen.findByText('2 Aufgaben erkannt:')).toBeInTheDocument()

    // Aufgabe 2 abwählen, nur Aufgabe 1 übernehmen.
    const items = screen.getAllByRole('checkbox')
    await user.click(items[1]!)
    await user.click(screen.getByRole('button', { name: 'Als Karteikarten übernehmen (1)' }))

    expect(onCreateCards).toHaveBeenCalledTimes(1)
    expect(onCreateCards.mock.calls[0]![0]).toEqual([
      {
        topic_id: 10,
        document_id: 5,
        page: 1,
        front: 'Aufgabe 1 — Leverage\n\nJanet and Mike buy houses.',
        back: '',
        source_quote: 'Janet and Mike buy houses.',
      },
    ])
    expect(await screen.findByText(/1 Karteikarte angelegt/)).toBeInTheDocument()
  })

  it('warnt, wenn das Ergebnis nicht wie ein Übungsblatt aussieht', async () => {
    const user = userEvent.setup()
    const onSplit = vi.fn().mockResolvedValue({ ...RESULT, looksLikeExerciseSheet: false })
    render(
      <ExerciseSplitPanel
        course={COURSE}
        topics={TOPICS}
        documents={[doc({ id: 5 })]}
        documentBytes={BYTES}
        onSplit={onSplit}
        onCreateCards={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'In Einzelaufgaben zerlegen' }))
    expect(await screen.findByText(/sieht eher nach einer Folien-\/Agenda-Liste aus/)).toBeInTheDocument()
  })

  it('koppelt eine Musterlösung und füllt damit die Rückseiten', async () => {
    const user = userEvent.setup()
    const exerciseResult: ExerciseSplitResult = {
      preamble: [],
      looksLikeExerciseSheet: true,
      exercises: [
        { number: '1', label: '', text: 'Berechne die Rendite.', pageStart: 1, pageEnd: 1 },
        { number: '2', label: '', text: 'Erkläre die Duration.', pageStart: 2, pageEnd: 2 },
      ],
    }
    const solutionResult: ExerciseSplitResult = {
      preamble: [],
      looksLikeExerciseSheet: true,
      exercises: [{ number: '1', label: '', text: 'Die Rendite beträgt 6 %.', pageStart: 1, pageEnd: 1 }],
    }
    const onSplit = vi.fn().mockImplementation((id: number) => Promise.resolve(id === 5 ? exerciseResult : solutionResult))
    const onCreateCards = vi.fn().mockResolvedValue(undefined)
    render(
      <ExerciseSplitPanel
        course={COURSE}
        topics={TOPICS}
        documents={[doc({ id: 5, filename: 'Problem Set 1.pdf' }), doc({ id: 6, filename: 'Problem Set 1_Solutions.pdf', doc_type: 'musterloesung' })]}
        documentBytes={{ 5: new Uint8Array([1]), 6: new Uint8Array([2]) }}
        onSplit={onSplit}
        onCreateCards={onCreateCards}
      />,
    )

    await user.selectOptions(screen.getByLabelText(/Musterlösung \(optional\)/), '6')
    await user.click(screen.getByRole('button', { name: 'In Einzelaufgaben zerlegen' }))

    expect(onSplit).toHaveBeenCalledWith(5)
    expect(onSplit).toHaveBeenCalledWith(6)
    expect(await screen.findByText('2 Aufgaben erkannt — 1 mit Musterlösung zugeordnet:')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Als Karteikarten übernehmen (2)' }))
    const created = onCreateCards.mock.calls[0]![0]
    expect(created[0].back).toBe('Die Rendite beträgt 6 %.')
    expect(created[1].back).toBe('')
    expect(await screen.findByText(/1 davon mit Musterlösung auf der Rückseite/)).toBeInTheDocument()
  })

  it('bietet keine Karteikarten-Übernahme ohne Thema an', async () => {
    const user = userEvent.setup()
    render(
      <ExerciseSplitPanel
        course={COURSE}
        topics={[]}
        documents={[doc({ id: 5 })]}
        documentBytes={BYTES}
        onSplit={vi.fn().mockResolvedValue(RESULT)}
        onCreateCards={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'In Einzelaufgaben zerlegen' }))
    expect(await screen.findByText(/gibt es noch kein Thema/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Als Karteikarten übernehmen/ })).not.toBeInTheDocument()
  })
})
