import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressView } from '../../src/ui/ProgressView'
import type { Assessment, Course, StudyBlock, Topic } from '../../src/data/schema'

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

function assessment(overrides: Partial<Assessment> & { id: number }): Assessment {
  return {
    course_id: 1,
    type: 'klausur',
    title: 'Endklausur',
    date: '2026-08-24',
    weight: 3,
    format: 'mixed',
    open_book: 0,
    duration_minutes: null,
    ...overrides,
  }
}

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

describe('ProgressView', () => {
  it('zeigt einen Hinweis ohne bevorstehende Prüfung', () => {
    render(<ProgressView assessments={[]} topics={[]} studyBlocks={[]} from="2026-08-10" />)
    expect(screen.getByText(/keine bevorstehende prüfung/i)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn das Fach noch keine Themen hat', () => {
    render(
      <ProgressView
        assessments={[assessment({ id: 1 })]}
        topics={[]}
        studyBlocks={[]}
        from="2026-08-10"
      />,
    )
    expect(screen.getByText(/noch keine themen/i)).toBeInTheDocument()
  })

  it('zeigt Vorbereitungsgrad und nächsten Schritt', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory', weight: 1 }), topic({ id: 2, name: 'Producer Theory', weight: 4 })]
    const blocks = [block({ id: 1, topic_id: 1, assessment_id: 1, status: 'erledigt', actual_minutes: 45 })]
    render(
      <ProgressView
        assessments={[assessment({ id: 1, title: 'Endklausur', date: '2026-08-24' })]}
        topics={topics}
        studyBlocks={blocks}
        from="2026-08-10"
      />,
    )
    expect(screen.getByText(/Endklausur \(2026-08-24\)/)).toBeInTheDocument()
    // (1*1 + 4*0) / (1+4) = 20%
    expect(screen.getByText(/Vorbereitungsgrad: 20 %/)).toBeInTheDocument()
    expect(screen.getByText(/Nächster Schritt: Producer Theory/)).toBeInTheDocument()
  })

  it('zeigt pro Fach den Gesamtfortschritt mit Balken und begonnenen Themen', () => {
    const topics = [
      topic({ id: 1, course_id: 7, name: 'Consumer Theory', weight: 1 }),
      topic({ id: 2, course_id: 7, name: 'Producer Theory', weight: 4 }),
    ]
    const blocks = [block({ id: 1, topic_id: 1, assessment_id: 99, status: 'erledigt', actual_minutes: 45 })]
    render(
      <ProgressView
        assessments={[]}
        topics={topics}
        studyBlocks={blocks}
        courses={[course({ id: 7, name: 'Microeconomics' })]}
        from="2026-08-10"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Pro Fach' })).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Fortschritt Microeconomics' })
    // (1*1 + 4*0) / 5 = 20 %
    expect(bar).toHaveAttribute('aria-valuenow', '20')
    expect(screen.getByText(/1 von 2 Themen begonnen/)).toBeInTheDocument()
    expect(screen.getByText(/Nächster Schritt: Producer Theory/)).toBeInTheDocument()
  })

  it('markiert ein noch nicht begonnenes Fach als solches ohne Prozentzahl', () => {
    const topics = [topic({ id: 1, course_id: 7, weight: 3 })]
    render(
      <ProgressView
        assessments={[]}
        topics={topics}
        studyBlocks={[]}
        courses={[course({ id: 7, name: 'Microeconomics' })]}
        from="2026-08-10"
      />,
    )

    const item = screen.getByText('Microeconomics').closest('li')!
    expect(within(item).getByText('Noch nicht begonnen')).toBeInTheDocument()
    expect(within(item).getByText('–')).toBeInTheDocument()
  })

  it('listet nur bevorstehende Prüfungen, nicht vergangene', () => {
    const topics = [topic({ id: 1 })]
    render(
      <ProgressView
        assessments={[assessment({ id: 1, title: 'Vergangen', date: '2026-08-01' }), assessment({ id: 2, title: 'Kommt noch', date: '2026-08-24' })]}
        topics={topics}
        studyBlocks={[]}
        from="2026-08-10"
      />,
    )
    expect(screen.queryByText(/Vergangen/)).not.toBeInTheDocument()
    expect(screen.getByText(/Kommt noch/)).toBeInTheDocument()
  })
})
