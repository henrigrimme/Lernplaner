import type {
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Course,
  RecurringBlocker,
  StudyBlock,
  Topic,
} from '../data/schema'
import { computeCourseProgress } from './progress'

/**
 * Baut den Kontext-Vorspann für „Sven" (`AIProvider.chat`) — eine
 * kompakte deutsche Zusammenfassung der aktuellen Lage: Fächer samt
 * Vorbereitungsgrad, bevorstehende Prüfungen, Wochen-Verfügbarkeit,
 * feste Blocker. Reine Funktion (kein DB-/KI-/UI-Zugriff), damit Svens
 * „Wissen" testbar und nachvollziehbar bleibt.
 *
 * Themen werden mit ihrer `id` genannt, damit Sven bei einem
 * Gewichtungs-Vorschlag (`topicWeights`-Block) die richtige `topicId`
 * referenzieren kann.
 */

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

export interface AssistantContextInput {
  courses: Course[]
  topics: Topic[]
  assessments: Assessment[]
  studyBlocks: StudyBlock[]
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  recurringBlockers: RecurringBlocker[]
  /** „heute", ISO — für die Auswahl der bevorstehenden Prüfungen. */
  today: string
}

export function buildAssistantContext(input: AssistantContextInput): string {
  const { courses, topics, assessments, studyBlocks, pattern, recurringBlockers, exceptions, today } = input
  const activeCourses = courses.filter((c) => c.archived === 0)
  const lines: string[] = []

  lines.push(`Heute: ${today}.`)

  if (activeCourses.length === 0) {
    lines.push('Noch keine Fächer angelegt.')
  } else {
    lines.push('Fächer und Vorbereitungsstand:')
    for (const course of activeCourses) {
      const courseTopics = topics.filter((t) => t.course_id === course.id)
      if (courseTopics.length === 0) {
        lines.push(`- ${course.name}: noch keine Themen.`)
        continue
      }
      const courseTopicIds = new Set(courseTopics.map((t) => t.id))
      const courseBlocks = studyBlocks.filter((b) => b.topic_id !== null && courseTopicIds.has(b.topic_id))
      const progress = computeCourseProgress(
        courseTopics.map((t) => ({ topicId: t.id, weight: t.weight })),
        courseBlocks,
      )
      const pct = progress.preparedness === null ? '–' : `${Math.round(progress.preparedness * 100)}%`
      lines.push(
        `- ${course.name}: ${pct} vorbereitet, ${progress.topicsStarted}/${progress.topicsTotal} Themen begonnen.`,
      )
      for (const t of courseTopics) {
        lines.push(`    Thema #${t.id} "${t.name}" (Gewicht ${t.weight}/5, Status ${t.status})`)
      }
    }
  }

  const upcoming = assessments
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (upcoming.length > 0) {
    lines.push('Bevorstehende Prüfungen:')
    for (const a of upcoming) {
      const course = activeCourses.find((c) => c.id === a.course_id)
      lines.push(`- ${a.date}: ${a.title}${course ? ` (${course.name})` : ''}, Format ${a.format}, Gewicht ${a.weight}/5.`)
    }
  }

  const patternLine = WEEKDAY_LABELS.map((label, weekday) => {
    const minutes = pattern.find((p) => p.weekday === weekday)?.minutes ?? 0
    return `${label} ${minutes}min`
  }).join(', ')
  lines.push(`Wochen-Verfügbarkeit (Lernminuten): ${patternLine}.`)

  if (recurringBlockers.length > 0) {
    lines.push(
      `Feste Blocker: ${recurringBlockers
        .map((b) => `${WEEKDAY_LABELS[b.weekday]} ${b.starts_at}-${b.ends_at} ${b.label}`)
        .join('; ')}.`,
    )
  }

  const futureExceptions = exceptions.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  if (futureExceptions.length > 0) {
    lines.push(
      `Abweichende Tage: ${futureExceptions
        .slice(0, 10)
        .map((e) => `${e.date}: ${e.minutes}min${e.note ? ` (${e.note})` : ''}`)
        .join('; ')}.`,
    )
  }

  return lines.join('\n')
}
