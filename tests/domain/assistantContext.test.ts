import { describe, expect, it } from 'vitest'
import { buildAssistantContext } from '../../src/domain/assistantContext'
import type { Assessment, AvailabilityPattern, Course, RecurringBlocker, StudyBlock, Topic } from '../../src/data/schema'

function course(o: Partial<Course> & { id: number }): Course {
  return { name: `Fach ${o.id}`, semester: 'WS26', color: '#000', priority: 3, difficulty: 3, archived: 0, created_at: 'x', language: 'de', group_id: null, instructions: '', ...o }
}
function topic(o: Partial<Topic> & { id: number }): Topic {
  return { course_id: 1, parent_id: null, name: `Thema ${o.id}`, normalized_name: `t${o.id}`, weight: 3, difficulty: 3, sort_order: 0, status: 'offen', manual_override: 0, ...o }
}
function block(o: Partial<StudyBlock> & { id: number }): StudyBlock {
  return { topic_id: 1, assessment_id: 1, kind: 'erstdurchgang', planned_date: '2026-09-10', planned_minutes: 60, planned_order: 0, status: 'offen', actual_minutes: null, completed_at: null, difficulty_feedback: null, ...o }
}
function assessment(o: Partial<Assessment> & { id: number }): Assessment {
  return { course_id: 1, type: 'klausur', title: 'Klausur', date: '2026-10-15', weight: 3, format: 'mixed', open_book: 0, duration_minutes: null, ...o }
}

const base = {
  pattern: [{ weekday: 1, minutes: 120 }] as AvailabilityPattern[],
  exceptions: [],
  recurringBlockers: [] as RecurringBlocker[],
  today: '2026-09-08',
}

describe('buildAssistantContext', () => {
  it('nennt Fächer mit Vorbereitungsgrad und Themen samt id', () => {
    const ctx = buildAssistantContext({
      ...base,
      courses: [course({ id: 1, name: 'Microeconomics' })],
      topics: [topic({ id: 5, course_id: 1, name: 'Consumer Theory', weight: 4 })],
      assessments: [],
      studyBlocks: [block({ id: 1, topic_id: 5, status: 'erledigt', actual_minutes: 60 })],
    })
    expect(ctx).toContain('Microeconomics')
    expect(ctx).toContain('Thema #5 "Consumer Theory"')
    expect(ctx).toMatch(/100% vorbereitet/)
    expect(ctx).toContain('Mo 120min')
  })

  it('listet bevorstehende Prüfungen, keine vergangenen', () => {
    const ctx = buildAssistantContext({
      ...base,
      courses: [course({ id: 1 })],
      topics: [],
      assessments: [assessment({ id: 1, title: 'Kommt', date: '2026-10-15' }), assessment({ id: 2, title: 'Vorbei', date: '2026-08-01' })],
      studyBlocks: [],
    })
    expect(ctx).toContain('Kommt')
    expect(ctx).not.toContain('Vorbei')
  })

  it('nennt feste Blocker', () => {
    const ctx = buildAssistantContext({
      ...base,
      recurringBlockers: [{ id: 1, weekday: 2, starts_at: '18:00', ends_at: '19:30', label: 'Gym' }],
      courses: [],
      topics: [],
      assessments: [],
      studyBlocks: [],
    })
    expect(ctx).toContain('Di 18:00-19:30 Gym')
  })

  it('kommt mit leerem Zustand klar', () => {
    const ctx = buildAssistantContext({ ...base, courses: [], topics: [], assessments: [], studyBlocks: [] })
    expect(ctx).toContain('Noch keine Fächer angelegt.')
  })
})
