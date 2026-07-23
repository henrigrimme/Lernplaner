import { describe, expect, it } from 'vitest'
import {
  COURSE_EXPORT_VERSION,
  deserializeCourseExport,
  exportCourse,
  importCourse,
  serializeCourseExport,
} from '../../src/data/courseExport'
import type { Assessment, Course, StudyBlock, Topic, TopicSection } from '../../src/data/schema'

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: 'Microeconomics',
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

function section(overrides: Partial<TopicSection> & { id: number }): TopicSection {
  return { topic_id: 1, document_id: 1, page_start: 1, page_end: 1, unique_chars: 100, slide_count: 1, ...overrides }
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

describe('exportCourse', () => {
  it('nimmt nur Daten des ausgewählten Fachs auf', () => {
    const courses = [course({ id: 1 }), course({ id: 2, name: 'Money & Banking' })]
    const topics = [topic({ id: 1, course_id: 1 }), topic({ id: 2, course_id: 2 })]
    const sections = [section({ id: 1, topic_id: 1 }), section({ id: 2, topic_id: 2 })]
    const assessments = [assessment({ id: 1, course_id: 1 }), assessment({ id: 2, course_id: 2 })]
    const blocks = [block({ id: 1, topic_id: 1, assessment_id: 1 }), block({ id: 2, topic_id: 2, assessment_id: 2 })]

    const bundle = exportCourse(1, courses, topics, sections, assessments, blocks, '2026-07-21T00:00:00Z')

    expect(bundle.course.id).toBe(1)
    expect(bundle.topics.map((t) => t.id)).toEqual([1])
    expect(bundle.topicSections.map((s) => s.id)).toEqual([1])
    expect(bundle.assessments.map((a) => a.id)).toEqual([1])
    expect(bundle.studyBlocks.map((b) => b.id)).toEqual([1])
    expect(bundle.version).toBe(COURSE_EXPORT_VERSION)
  })

  it('wirft bei unbekannter courseId', () => {
    expect(() => exportCourse(999, [], [], [], [], [], 'x')).toThrow(/999/)
  })
})

describe('serializeCourseExport / deserializeCourseExport', () => {
  it('rundet über JSON, inhaltlich unverändert', () => {
    const bundle = exportCourse(1, [course({ id: 1 })], [], [], [], [], '2026-07-21T00:00:00Z')
    const roundtripped = deserializeCourseExport(serializeCourseExport(bundle))
    expect(roundtripped).toEqual(bundle)
  })

  it('wirft bei fehlendem/falschem version-Feld', () => {
    expect(() => deserializeCourseExport(JSON.stringify({ foo: 'bar' }))).toThrow(/Export-Format/)
    expect(() => deserializeCourseExport(JSON.stringify({ version: 999 }))).toThrow(/Export-Format/)
  })

  it('wirft bei kaputtem JSON', () => {
    expect(() => deserializeCourseExport('{nicht json')).toThrow()
  })
})

describe('importCourse', () => {
  it('legt ein neues Fach mit neuer id an, unabhängig vom ursprünglichen Wert', () => {
    const bundle = exportCourse(1, [course({ id: 1 })], [], [], [], [], 'x')
    const result = importCourse(bundle, { courses: [course({ id: 1 })], topics: [], topicSections: [], assessments: [], studyBlocks: [] })
    expect(result.newCourseId).toBe(2) // Bestand hat schon id 1
    expect(result.courses).toHaveLength(2)
    expect(result.courses[1]!.id).toBe(2)
  })

  it('schreibt topic_id/course_id/parent_id/assessment_id konsistent auf neue lokale IDs um', () => {
    const courses = [course({ id: 1 })]
    const topics = [
      topic({ id: 1, course_id: 1, parent_id: null }),
      topic({ id: 2, course_id: 1, parent_id: 1 }), // Kind von Thema 1
    ]
    const sections = [section({ id: 1, topic_id: 2 })]
    const assessments = [assessment({ id: 1, course_id: 1 })]
    const blocks = [block({ id: 1, topic_id: 2, assessment_id: 1 })]
    const bundle = exportCourse(1, courses, topics, sections, assessments, blocks, 'x')

    const result = importCourse(bundle, { courses: [], topics: [], topicSections: [], assessments: [], studyBlocks: [] })

    const [parentTopic, childTopic] = result.topics
    expect(parentTopic!.course_id).toBe(result.newCourseId)
    expect(childTopic!.course_id).toBe(result.newCourseId)
    expect(childTopic!.parent_id).toBe(parentTopic!.id) // auf die NEUE parent-id umgeschrieben, nicht mehr 1

    const [newSection] = result.topicSections
    expect(newSection!.topic_id).toBe(childTopic!.id)

    const [newAssessment] = result.assessments
    expect(newAssessment!.course_id).toBe(result.newCourseId)

    const [newBlock] = result.studyBlocks
    expect(newBlock!.topic_id).toBe(childTopic!.id)
    expect(newBlock!.assessment_id).toBe(newAssessment!.id)
  })

  it('knüpft neue IDs an den bestehenden Bestand an, statt ihn zu überschreiben', () => {
    const bundle = exportCourse(1, [course({ id: 1 })], [topic({ id: 1, course_id: 1 })], [], [], [], 'x')
    const existing = {
      courses: [course({ id: 1 }), course({ id: 2 })],
      topics: [topic({ id: 1 }), topic({ id: 5 })],
      topicSections: [],
      assessments: [],
      studyBlocks: [],
    }
    const result = importCourse(bundle, existing)
    expect(result.newCourseId).toBe(3)
    expect(result.topics.at(-1)!.id).toBe(6) // höchste bestehende id (5) + 1
  })

  it('lässt topic_id/assessment_id null bei Blöcken ohne Zuordnung', () => {
    const bundle = exportCourse(1, [course({ id: 1 })], [], [], [assessment({ id: 1, course_id: 1 })], [block({ id: 1, topic_id: null, assessment_id: 1 })], 'x')
    const result = importCourse(bundle, { courses: [], topics: [], topicSections: [], assessments: [], studyBlocks: [] })
    expect(result.studyBlocks[0]!.topic_id).toBeNull()
  })

  it('wirft bei nicht unterstützter Export-Version', () => {
    const bundle = exportCourse(1, [course({ id: 1 })], [], [], [], [], 'x')
    const brokenBundle = { ...bundle, version: 999 as unknown as typeof bundle.version }
    expect(() => importCourse(brokenBundle, { courses: [], topics: [], topicSections: [], assessments: [], studyBlocks: [] })).toThrow(
      /Version/,
    )
  })
})
