import { useState } from 'react'
import { TopicTree } from './ui/TopicTree'
import { CourseSetup } from './ui/CourseSetup'
import { AssessmentSetup } from './ui/AssessmentSetup'
import { AvailabilitySetup } from './ui/AvailabilitySetup'
import type { Assessment, AvailabilityException, AvailabilityPattern, Course, Topic } from './data/schema'

/**
 * Provisorischer App-Rahmen — beweist, dass Tauri-Fenster, Vite-Build und
 * die `ui/`-Schicht zusammenspielen (ROADMAP.md Phase 1 „Tauri-Projekt,
 * Build, Tests, CI"). Noch **keine** echte Funktionalität: kein PDF-Import,
 * keine `tauri-plugin-sql`-Anbindung — aller Zustand ist lokaler
 * React-State statt aus der Datenbank geladen. Das kommt mit der
 * eigentlichen Datenanbindung, siehe CONTEXT.md Abschnitt 8.
 */
export function App() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [pattern, setPattern] = useState<AvailabilityPattern[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null

  return (
    <main>
      <h1>Lernplaner</h1>

      <CourseSetup courses={courses} onChange={setCourses} now={() => new Date().toISOString()} />

      {courses.length > 0 && (
        <label>
          Fach für Prüfungen
          <select
            value={selectedCourseId ?? ''}
            onChange={(e) => setSelectedCourseId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— wählen —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {selectedCourse && (
        <AssessmentSetup course={selectedCourse} assessments={assessments} onChange={setAssessments} />
      )}

      <AvailabilitySetup
        pattern={pattern}
        exceptions={exceptions}
        onChangePattern={setPattern}
        onChangeExceptions={setExceptions}
      />

      <TopicTree topics={topics} onChange={setTopics} />
    </main>
  )
}
