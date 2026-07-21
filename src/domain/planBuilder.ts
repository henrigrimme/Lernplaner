import { estimateMinutes } from './estimation'
import {
  scheduleStudyBlocks,
  type ScheduleResult,
  type SchedulingAssessment,
  type SchedulingTopic,
} from './scheduling'
import type {
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Blocker,
  Course,
  Topic,
  TopicSection,
} from '../data/schema'

/**
 * Baut die Terminierungs-Eingaben aus Themen, Fächern und Prüfungen
 * zusammen und ruft `scheduleStudyBlocks` auf. Aus `ui/PlanView.tsx`
 * extrahiert (ROADMAP.md Phase 2 „Ergebnis"), damit `App.tsx` beim
 * Übernehmen des Tagesplans in `study_blocks` (siehe `data/studyBlocks.ts`,
 * Phase 3 „Heute-Ansicht") dieselbe Logik nutzt statt sie ein zweites Mal
 * zu bauen — ARCHITECTURE.md „ui/ … keine Geschäftslogik" gilt auch für
 * diese Zusammenstellung, nicht nur für Schätzung/Terminierung selbst.
 *
 * **Vereinfachung, nicht im Schema abgebildet** (unverändert aus
 * `PlanView.tsx` übernommen): wählt je Thema die nächste bevorstehende
 * Prüfung seines Fachs (kleinstes Datum ≥ `from`) — ein Thema für eine
 * spätere Prüfung desselben Fachs vorzubereiten, geht damit noch nicht.
 */

export interface BuildScheduleInput {
  topics: Topic[]
  topicSections: TopicSection[]
  assessments: Assessment[]
  courses: Course[]
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  blockers: Blocker[]
  from: string
}

export interface BuildScheduleResult extends ScheduleResult {
  topicsWithoutAssessment: Topic[]
  /** Themen, die tatsächlich in die Terminierung eingeflossen sind (Fach + bevorstehende Prüfung + Umfang > 0). */
  topicsConsideredCount: number
}

export function buildSchedule(input: BuildScheduleInput): BuildScheduleResult {
  const { topics, topicSections, assessments, courses, pattern, exceptions, blockers, from } = input
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const assessmentById = new Map(assessments.map((a) => [a.id, a]))

  const schedulingTopics: SchedulingTopic[] = []
  const topicsWithoutAssessment: Topic[] = []
  const usedAssessmentIds = new Set<number>()

  for (const topic of topics) {
    const course = courseById.get(topic.course_id)
    const upcoming = assessments
      .filter((a) => a.course_id === topic.course_id && a.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date))[0]

    if (!course || !upcoming) {
      topicsWithoutAssessment.push(topic)
      continue
    }

    const sections = topicSections.filter((s) => s.topic_id === topic.id)
    const estimate = estimateMinutes({
      topic: { weight: topic.weight },
      sections,
      course: { difficulty: course.difficulty },
      assessmentFormat: upcoming.format,
      calibration: null,
    })
    if (estimate.minutes === 0) continue

    usedAssessmentIds.add(upcoming.id)
    schedulingTopics.push({ topicId: topic.id, assessmentId: upcoming.id, neededMinutes: estimate.minutes })
  }

  const schedulingAssessments: SchedulingAssessment[] = [...usedAssessmentIds].map((id) => ({
    id,
    date: assessmentById.get(id)!.date,
  }))

  const result: ScheduleResult =
    schedulingTopics.length === 0
      ? { blocks: [], unscheduled: [] }
      : scheduleStudyBlocks(schedulingTopics, schedulingAssessments, from, pattern, exceptions, blockers)

  return { ...result, topicsWithoutAssessment, topicsConsideredCount: schedulingTopics.length }
}
