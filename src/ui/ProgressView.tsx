import { computePreparedness, suggestNextTopic } from '../domain/progress'
import type { Assessment, StudyBlock, Topic } from '../data/schema'

/**
 * Fortschrittsanzeige (ROADMAP.md Phase 3). Ruft `domain/progress.ts` je
 * bevorstehender Prüfung auf und zeigt Vorbereitungsgrad + nächsten
 * empfohlenen Lernschritt. Reine Präsentation nach außen (ARCHITECTURE.md
 * „ui/ … keine Geschäftslogik") — das Zusammenstellen der Themen je Fach
 * lebt hier nur als einfacher Filter (`topic.course_id === assessment.course_id`,
 * siehe Kommentar unten), keine eigene Berechnung.
 */

export interface ProgressViewProps {
  assessments: Assessment[]
  topics: Topic[]
  studyBlocks: StudyBlock[]
  /** "Heute", ISO-Datum — vom Aufrufer übergeben, keine Systemuhr in der Komponente. */
  from: string
}

export function ProgressView({ assessments, topics, studyBlocks, from }: ProgressViewProps) {
  const upcoming = assessments.filter((a) => a.date >= from).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <section aria-label="Fortschritt">
      <h2>Fortschritt</h2>

      {upcoming.length === 0 ? (
        <p>Keine bevorstehende Prüfung.</p>
      ) : (
        <ul>
          {upcoming.map((assessment) => {
            // Alle Themen des Fachs dieser Prüfung — nicht nur bereits verplante,
            // damit ein noch nie angefangenes Thema als mastery 0 sichtbar bleibt
            // (siehe domain/progress.ts „computePreparedness").
            const courseTopics = topics
              .filter((t) => t.course_id === assessment.course_id)
              .map((t) => ({ topicId: t.id, weight: t.weight }))
            const preparedness = computePreparedness(assessment.id, studyBlocks, courseTopics)
            const nextStep = suggestNextTopic(assessment.id, studyBlocks, courseTopics)
            const nextTopicName = nextStep ? topics.find((t) => t.id === nextStep.topicId)?.name : undefined

            return (
              <li key={assessment.id}>
                <strong>
                  {assessment.title} ({assessment.date})
                </strong>
                {preparedness === null ? (
                  <p>Noch keine Themen für dieses Fach.</p>
                ) : (
                  <p>Vorbereitungsgrad: {Math.round(preparedness * 100)} %</p>
                )}
                {nextTopicName && <p>Nächster Schritt: {nextTopicName}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
