import { estimateMinutes } from '../domain/estimation'
import { scheduleStudyBlocks, type SchedulingAssessment, type SchedulingTopic } from '../domain/scheduling'
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
 * Planansicht (ROADMAP.md Phase 2 „Ergebnis": erster echter Lernplan).
 * Ruft `estimation.ts`/`scheduling.ts` auf und zeigt das Ergebnis als
 * Wochenübersicht. Reine Präsentation nach außen (ARCHITECTURE.md „ui/ …
 * keine Geschäftslogik") — die eigentliche Rechenlogik liegt vollständig in
 * `domain/`; was hier passiert, ist nur das **Zusammenstellen** der Eingaben
 * aus den anderen Zustandsteilen der App, keine eigene Planungslogik.
 *
 * **Vereinfachung, nicht im Schema abgebildet:** `topics` haben kein
 * eigenes `assessment_id` (siehe DATA_MODEL.md — die Zuordnung passiert
 * erst in `study_blocks`, ein Thema könnte grundsätzlich zu mehreren
 * Prüfungen gehören). Diese Ansicht wählt für jedes Thema die **nächste
 * bevorstehende Prüfung seines Fachs** (kleinstes Datum ≥ `from`) — ein
 * Thema für eine spätere Prüfung desselben Fachs vorzubereiten, geht damit
 * noch nicht. Themen ohne bevorstehende Prüfung werden separat aufgeführt,
 * nicht stillschweigend weggelassen.
 */

export interface PlanViewProps {
  topics: Topic[]
  topicSections: TopicSection[]
  assessments: Assessment[]
  courses: Course[]
  pattern: AvailabilityPattern[]
  exceptions: AvailabilityException[]
  blockers: Blocker[]
  /** "Heute", ISO-Datum — vom Aufrufer übergeben, keine Systemuhr in `domain/`. */
  from: string
}

const KIND_LABELS: Record<string, string> = {
  erstdurchgang: 'Erstdurchgang',
  wiederholung: 'Wiederholung',
  uebung: 'Übung',
  quiz: 'Quiz',
  puffer: 'Puffer',
}

/** Montag der Woche, die `dateISO` enthält — nur für die Gruppierung, unabhängig von der Wochentag-Konvention in capacity.ts. */
function weekStart(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`)
  const isoWeekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay() // 1=Montag..7=Sonntag
  date.setUTCDate(date.getUTCDate() - (isoWeekday - 1))
  return date.toISOString().slice(0, 10)
}

export function PlanView({
  topics,
  topicSections,
  assessments,
  courses,
  pattern,
  exceptions,
  blockers,
  from,
}: PlanViewProps) {
  const topicById = new Map(topics.map((t) => [t.id, t]))
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

  const result =
    schedulingTopics.length === 0
      ? { blocks: [], unscheduled: [] }
      : scheduleStudyBlocks(schedulingTopics, schedulingAssessments, from, pattern, exceptions, blockers)

  const blocksByWeek = new Map<string, Map<string, typeof result.blocks>>()
  for (const block of [...result.blocks].sort((a, b) => a.planned_date.localeCompare(b.planned_date))) {
    const week = weekStart(block.planned_date)
    const byDay = blocksByWeek.get(week) ?? new Map()
    const dayBlocks = byDay.get(block.planned_date) ?? []
    dayBlocks.push(block)
    byDay.set(block.planned_date, dayBlocks)
    blocksByWeek.set(week, byDay)
  }

  return (
    <section aria-label="Lernplan">
      <h2>Lernplan</h2>

      {schedulingTopics.length === 0 ? (
        <p>Noch kein Thema mit bevorstehender Prüfung und geschätztem Aufwand.</p>
      ) : (
        [...blocksByWeek.entries()].map(([week, byDay]) => (
          <div key={week}>
            <h3>Woche ab {week}</h3>
            {[...byDay.entries()].map(([date, blocks]) => (
              <div key={date}>
                <h4>{date}</h4>
                <ul>
                  {blocks.map((block, i) => {
                    const topic = topicById.get(block.topic_id)
                    return (
                      <li key={i}>
                        {topic?.name ?? `Thema ${block.topic_id}`} — {KIND_LABELS[block.kind] ?? block.kind} —{' '}
                        {block.planned_minutes} Min.
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))
      )}

      {result.unscheduled.length > 0 && (
        <div>
          <h3>Nicht untergebracht</h3>
          <p>Die Kapazität reicht nicht für den gesamten Stoff — hier fehlt Zeit:</p>
          <ul>
            {result.unscheduled.map((u, i) => (
              <li key={i}>
                {topicById.get(u.topicId)?.name ?? `Thema ${u.topicId}`}: {u.minutes} Min. fehlen
                ({KIND_LABELS[u.kind] ?? u.kind})
              </li>
            ))}
          </ul>
        </div>
      )}

      {topicsWithoutAssessment.length > 0 && (
        <div>
          <h3>Ohne bevorstehende Prüfung</h3>
          <p>Diese Themen fließen nicht in den Plan ein, solange ihr Fach keine anstehende Prüfung hat:</p>
          <ul>
            {topicsWithoutAssessment.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
