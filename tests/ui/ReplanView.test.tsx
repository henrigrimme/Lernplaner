import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReplanView } from '../../src/ui/ReplanView'
import type { AvailabilityPattern, StudyBlock, Topic } from '../../src/data/schema'

function topic(overrides: Partial<Topic> & { id: number }): Topic {
  return {
    course_id: 1,
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

function block(overrides: Partial<StudyBlock> & { id: number }): StudyBlock {
  return {
    topic_id: 1,
    assessment_id: 1,
    kind: 'erstdurchgang',
    planned_date: '2026-08-03',
    planned_minutes: 45,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

const DAILY_60: AvailabilityPattern[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday: weekday as AvailabilityPattern['weekday'],
  minutes: 60,
}))

describe('ReplanView', () => {
  it('zeigt einen Hinweis, solange noch nie ein Plan übernommen wurde', () => {
    render(
      <ReplanView
        studyBlocks={[]}
        topics={[]}
        assessments={[]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        recurringBlockers={[]}
        from="2026-08-10"
        onApply={vi.fn()}
      />,
    )
    expect(screen.getByText(/erst einen plan übernehmen/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /neu berechnen/i })).not.toBeInTheDocument()
  })

  it('zeigt einen verpassten Block im Diff als "verschoben" nach dem Berechnen', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const studyBlocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 45, status: 'offen' }), // verpasst
    ]
    render(
      <ReplanView
        studyBlocks={studyBlocks}
        topics={topics}
        assessments={[{ id: 1, course_id: 1, type: 'klausur', title: 'Endklausur', date: '2026-08-24', weight: 3, format: 'mixed', open_book: 0, duration_minutes: null }]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        recurringBlockers={[]}
        from="2026-08-10"
        onApply={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /rückstand prüfen/i }))
    expect(screen.getAllByText(/Consumer Theory/).length).toBeGreaterThan(0)
    // Der verpasste Erstdurchgang-Block erscheint als "verschoben" (nicht "neu") — daneben kann
    // regulär auch eine neue Wiederholung entstehen, die hier nicht Gegenstand des Tests ist.
    const items = screen.getAllByRole('listitem')
    const erstdurchgangEntry = items.find((li) => /Erstdurchgang/.test(li.textContent ?? ''))
    expect(erstdurchgangEntry?.textContent).toMatch(/Verschoben/)
  })

  it('zeigt "keine Änderungen", wenn der neue Plan mit dem alten übereinstimmt', async () => {
    const user = userEvent.setup()
    // Kein Thema mit Restbedarf (keine erstdurchgang-Blöcke) -> nichts zu vergleichen, aber "Rückstand prüfen" ist trotzdem sichtbar,
    // da hasErstdurchgangHistory nur auf kind prüft, nicht auf offene Menge.
    const studyBlocks = [block({ id: 1, status: 'erledigt', actual_minutes: 45 })]
    render(
      <ReplanView
        studyBlocks={studyBlocks}
        topics={[]}
        assessments={[]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        recurringBlockers={[]}
        from="2026-08-10"
        onApply={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /rückstand prüfen/i }))
    expect(screen.getByText(/keine änderungen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Übernehmen' })).toBeDisabled()
  })

  it('ruft onApply mit den zusammengeführten Blöcken und einer Begründung auf', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const studyBlocks = [
      block({ id: 1, planned_date: '2026-08-03', planned_minutes: 45, status: 'erledigt', actual_minutes: 45 }),
      block({ id: 2, planned_date: '2026-08-04', planned_minutes: 45, status: 'offen' }),
    ]
    render(
      <ReplanView
        studyBlocks={studyBlocks}
        topics={topics}
        assessments={[{ id: 1, course_id: 1, type: 'klausur', title: 'Endklausur', date: '2026-08-24', weight: 3, format: 'mixed', open_book: 0, duration_minutes: null }]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        recurringBlockers={[]}
        from="2026-08-10"
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /rückstand prüfen/i }))
    await user.click(screen.getByRole('button', { name: 'Übernehmen' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const [blocks, reason] = onApply.mock.calls[0]!
    expect(reason).toMatch(/2026-08-10/)
    expect(blocks.find((b: StudyBlock) => b.status === 'erledigt')).toMatchObject({ id: 1 }) // Verlauf bleibt erhalten
    expect(blocks.some((b: StudyBlock) => b.status === 'offen' && b.planned_date !== '2026-08-04')).toBe(true) // neu geplant
  })

  it('verwirft die Vorschau ohne onApply aufzurufen', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const studyBlocks = [block({ id: 1, planned_date: '2026-08-04', status: 'offen' })]
    render(
      <ReplanView
        studyBlocks={studyBlocks}
        topics={[topic({ id: 1 })]}
        assessments={[{ id: 1, course_id: 1, type: 'klausur', title: 'Endklausur', date: '2026-08-24', weight: 3, format: 'mixed', open_book: 0, duration_minutes: null }]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        recurringBlockers={[]}
        from="2026-08-10"
        onApply={onApply}
      />,
    )
    await user.click(screen.getByRole('button', { name: /rückstand prüfen/i }))
    await user.click(screen.getByRole('button', { name: 'Verwerfen' }))
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Übernehmen' })).not.toBeInTheDocument()
  })
})
