import { buildSchedule } from '../domain/planBuilder'
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
 * Ruft `domain/planBuilder.ts` (Schätzung + Terminierung) auf und zeigt das
 * Ergebnis als Wochenübersicht. Reine Präsentation nach außen
 * (ARCHITECTURE.md „ui/ … keine Geschäftslogik") — das Zusammenstellen der
 * Eingaben aus Themen/Fächern/Prüfungen lebt in `planBuilder.ts`, nicht
 * hier (siehe dortiger Kommentar zur Vereinfachung „nächste bevorstehende
 * Prüfung je Fach").
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
  const result = buildSchedule({ topics, topicSections, assessments, courses, pattern, exceptions, blockers, from })

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

      {result.topicsConsideredCount === 0 ? (
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

      {result.topicsWithoutAssessment.length > 0 && (
        <div>
          <h3>Ohne bevorstehende Prüfung</h3>
          <p>Diese Themen fließen nicht in den Plan ein, solange ihr Fach keine anstehende Prüfung hat:</p>
          <ul>
            {result.topicsWithoutAssessment.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
