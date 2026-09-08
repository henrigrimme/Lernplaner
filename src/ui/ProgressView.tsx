import { computeCourseProgress, computePreparedness, suggestNextTopic } from '../domain/progress'
import type { Assessment, Course, StudyBlock, Topic } from '../data/schema'

/**
 * Fortschrittsanzeige (ROADMAP.md Phase 3). Zwei Ebenen:
 *
 * 1. **Pro Fach** (Nutzerwunsch 2026-09-08): „wie weit bin ich in diesem
 *    Fach insgesamt" — `domain/progress.ts` `computeCourseProgress` über
 *    alle Lernblöcke des Fachs, unabhängig von einer bestimmten Prüfung.
 *    Zeigt einen Fortschrittsbalken, begonnene/gesamte Themen und den
 *    nächsten empfohlenen Schritt.
 * 2. **Pro bevorstehende Prüfung** (bisher): `computePreparedness` je
 *    Prüfung, prüfungsspezifisch gewichtet.
 *
 * Reine Präsentation nach außen (ARCHITECTURE.md „ui/ … keine
 * Geschäftslogik") — das Zusammenstellen der Themen/Blöcke je Fach bzw.
 * Prüfung lebt hier nur als einfacher Filter (`course_id`/`assessment_id`),
 * keine eigene Berechnung.
 */

export interface ProgressViewProps {
  assessments: Assessment[]
  topics: Topic[]
  studyBlocks: StudyBlock[]
  /** Für die „Pro Fach"-Ansicht. Optional/leer blendet diesen Abschnitt aus (ältere Aufrufer/Tests). */
  courses?: Course[]
  /** "Heute", ISO-Datum — vom Aufrufer übergeben, keine Systemuhr in der Komponente. */
  from: string
}

function percent(value: number | null): number {
  return Math.round((value ?? 0) * 100)
}

export function ProgressView({ assessments, topics, studyBlocks, courses = [], from }: ProgressViewProps) {
  const upcoming = assessments.filter((a) => a.date >= from).sort((a, b) => a.date.localeCompare(b.date))

  const courseProgress = courses
    .map((course) => {
      const courseTopics = topics.filter((t) => t.course_id === course.id)
      if (courseTopics.length === 0) return null
      const courseTopicIds = new Set(courseTopics.map((t) => t.id))
      const courseBlocks = studyBlocks.filter((b) => b.topic_id !== null && courseTopicIds.has(b.topic_id))
      const progress = computeCourseProgress(
        courseTopics.map((t) => ({ topicId: t.id, weight: t.weight })),
        courseBlocks,
      )
      const nextTopicName = progress.nextTopicId
        ? topics.find((t) => t.id === progress.nextTopicId)?.name
        : undefined
      return { course, progress, nextTopicName }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    // Begonnene Fächer zuerst, darunter die am wenigsten weit fortgeschrittenen
    // (dringendsten) oben; zuletzt noch nicht begonnene, alphabetisch.
    .sort((a, b) => {
      const aStarted = a.progress.topicsStarted > 0
      const bStarted = b.progress.topicsStarted > 0
      if (aStarted !== bStarted) return aStarted ? -1 : 1
      if (aStarted) return percent(a.progress.preparedness) - percent(b.progress.preparedness)
      return a.course.name.localeCompare(b.course.name)
    })

  return (
    <section aria-label="Fortschritt">
      <h2>Fortschritt</h2>

      {courseProgress.length > 0 && (
        <>
          <h3>Pro Fach</h3>
          <ul className="course-progress-list">
            {courseProgress.map(({ course, progress, nextTopicName }) => {
              const pct = percent(progress.preparedness)
              return (
                <li key={course.id}>
                  <div className="course-progress-head">
                    <strong>{course.name}</strong>
                    <span>{progress.topicsStarted === 0 ? '–' : `${pct} %`}</span>
                  </div>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Fortschritt ${course.name}`}
                  >
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="course-progress-meta">
                    {progress.topicsStarted === 0
                      ? 'Noch nicht begonnen'
                      : `${progress.topicsStarted} von ${progress.topicsTotal} Themen begonnen`}
                    {progress.topicsStarted > 0 && nextTopicName && ` · Nächster Schritt: ${nextTopicName}`}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h3>Pro bevorstehende Prüfung</h3>
      {upcoming.length === 0 ? (
        <p className="empty-state-inline">
          Keine bevorstehende Prüfung — sobald eine angelegt ist, erscheint der Fortschritt hier.
        </p>
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
