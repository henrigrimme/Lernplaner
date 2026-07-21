import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TodayView } from '../../src/ui/TodayView'
import type { StudyBlock, Topic } from '../../src/data/schema'

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
    planned_date: '2026-08-10',
    planned_minutes: 45,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

describe('TodayView', () => {
  it('zeigt einen Hinweis, wenn für heute nichts geplant ist', () => {
    render(<TodayView studyBlocks={[]} topics={[]} onChange={vi.fn()} today="2026-08-10" now={() => 'x'} />)
    expect(screen.getByText(/nichts geplant/i)).toBeInTheDocument()
  })

  it('zeigt den ersten offenen Block des Tages mit Themenname und Timer', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const blocks = [block({ id: 1, topic_id: 1, planned_minutes: 45 })]
    render(<TodayView studyBlocks={blocks} topics={topics} onChange={vi.fn()} today="2026-08-10" now={() => 'x'} />)

    expect(screen.getByText(/Consumer Theory/)).toBeInTheDocument()
    expect(screen.getByText(/Erstdurchgang/)).toBeInTheDocument()
    expect(screen.getByLabelText('Timer')).toBeInTheDocument()
  })

  it('ignoriert Blöcke, die nicht auf heute fallen oder nicht "offen" sind', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' }), topic({ id: 2, name: 'Andere Woche' })]
    const blocks = [
      block({ id: 1, topic_id: 1, planned_date: '2026-08-11' }), // anderer Tag
      block({ id: 2, topic_id: 2, status: 'erledigt', actual_minutes: 40 }),
    ]
    render(<TodayView studyBlocks={blocks} topics={topics} onChange={vi.fn()} today="2026-08-10" now={() => 'x'} />)
    expect(screen.queryByText(/Consumer Theory/)).not.toBeInTheDocument()
    // Der erledigte Block von heute erscheint in der "Heute erledigt"-Liste, nicht als aktueller Block.
    expect(screen.getByText(/Heute erledigt/)).toBeInTheDocument()
    expect(screen.getByText(/Andere Woche/)).toBeInTheDocument()
  })

  it('deaktiviert "Fertig", solange kein Schwierigkeits-Feedback gewählt ist, und aktiviert es danach', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const blocks = [block({ id: 1, topic_id: 1 })]
    render(<TodayView studyBlocks={blocks} topics={topics} onChange={vi.fn()} today="2026-08-10" now={() => 'x'} />)

    expect(screen.getByRole('button', { name: 'Fertig' })).toBeDisabled()
    await user.click(screen.getByLabelText('Passend'))
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeEnabled()
  })

  it('übergibt beim Abschließen tatsächliche Minuten und Feedback an onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const blocks = [block({ id: 1, topic_id: 1, planned_minutes: 45 })]
    render(<TodayView studyBlocks={blocks} topics={topics} onChange={onChange} today="2026-08-10" now={() => '2026-08-10T12:00:00Z'} />)

    await user.click(screen.getByLabelText('Zu schwer'))
    await user.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [updated] = onChange.mock.calls[0]!
    expect(updated[0]).toMatchObject({
      status: 'erledigt',
      actual_minutes: 45, // kein Timer benutzt -> Fallback auf geplante Minuten
      difficulty_feedback: 1,
      completed_at: '2026-08-10T12:00:00Z',
    })
  })

  it('zeigt weitere offene Blöcke des Tages als Liste "Noch heute"', () => {
    const topics = [topic({ id: 1, name: 'Erstes' }), topic({ id: 2, name: 'Zweites' })]
    const blocks = [
      block({ id: 1, topic_id: 1, planned_order: 0 }),
      block({ id: 2, topic_id: 2, planned_order: 1 }),
    ]
    render(<TodayView studyBlocks={blocks} topics={topics} onChange={vi.fn()} today="2026-08-10" now={() => 'x'} />)
    expect(screen.getByText(/Noch heute/)).toBeInTheDocument()
    expect(screen.getByText(/Zweites/)).toBeInTheDocument()
  })
})
