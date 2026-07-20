import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlanView } from '../../src/ui/PlanView'
import type {
  Assessment,
  AvailabilityPattern,
  Course,
  Topic,
  TopicSection,
} from '../../src/data/schema'

const COURSE: Course = {
  id: 1,
  name: 'Microeconomics',
  semester: 'WS25',
  color: '#000',
  priority: 3,
  difficulty: 3,
  archived: 0,
  created_at: 'x',
}

const ASSESSMENT: Assessment = {
  id: 1,
  course_id: 1,
  type: 'klausur',
  title: 'Endklausur',
  date: '2026-08-24',
  weight: 3,
  format: 'mixed',
  open_book: 0,
  duration_minutes: null,
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

function section(topicId: number, uniqueChars: number): TopicSection {
  return { id: topicId, topic_id: topicId, document_id: 1, page_start: 1, page_end: 1, unique_chars: uniqueChars, slide_count: 3 }
}

const DAILY_60: AvailabilityPattern[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday: weekday as AvailabilityPattern['weekday'],
  minutes: 60,
}))

describe('PlanView', () => {
  it('zeigt einen Hinweis, wenn kein Thema planbar ist', () => {
    render(
      <PlanView
        topics={[]}
        topicSections={[]}
        assessments={[]}
        courses={[]}
        pattern={[]}
        exceptions={[]}
        blockers={[]}
        from="2026-08-03"
      />,
    )
    expect(screen.getByText(/noch kein thema/i)).toBeInTheDocument()
  })

  it('zeigt geplante Blöcke mit Themenname, Art und Minuten', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section(1, 2000)]
    render(
      <PlanView
        topics={topics}
        topicSections={sections}
        assessments={[ASSESSMENT]}
        courses={[COURSE]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        from="2026-08-03"
      />,
    )
    expect(screen.getAllByText(/Consumer Theory/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Erstdurchgang/)).toBeInTheDocument()
    expect(screen.getByText(/Woche ab 2026-08-03/)).toBeInTheDocument()
  })

  it('zeigt nicht untergebrachte Zeit, wenn die Kapazität nicht reicht', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section(1, 200_000)] // absichtlich riesig
    render(
      <PlanView
        topics={topics}
        topicSections={sections}
        assessments={[{ ...ASSESSMENT, date: '2026-08-05' }]}
        courses={[COURSE]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        from="2026-08-03"
      />,
    )
    expect(screen.getByText(/nicht untergebracht/i)).toBeInTheDocument()
    expect(screen.getByText(/Min\. fehlen/)).toBeInTheDocument()
  })

  it('listet Themen ohne bevorstehende Prüfung separat', () => {
    const topics = [topic({ id: 1, name: 'Ohne Prüfung' })]
    render(
      <PlanView
        topics={topics}
        topicSections={[section(1, 2000)]}
        assessments={[]}
        courses={[COURSE]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        from="2026-08-03"
      />,
    )
    expect(screen.getByText(/ohne bevorstehende prüfung/i)).toBeInTheDocument()
    expect(screen.getByText('Ohne Prüfung')).toBeInTheDocument()
  })

  it('lässt ein Thema ohne Umfang (0 Minuten) unauffällig aus, ohne Absturz', () => {
    const topics = [topic({ id: 1, name: 'Kein Umfang' })]
    render(
      <PlanView
        topics={topics}
        topicSections={[]}
        assessments={[ASSESSMENT]}
        courses={[COURSE]}
        pattern={DAILY_60}
        exceptions={[]}
        blockers={[]}
        from="2026-08-03"
      />,
    )
    expect(screen.getByText(/noch kein thema/i)).toBeInTheDocument()
    expect(screen.queryByText('Kein Umfang')).not.toBeInTheDocument()
  })
})
