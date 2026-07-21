import { useState } from 'react'
import { TopicTree } from './ui/TopicTree'
import { CourseSetup } from './ui/CourseSetup'
import { AssessmentSetup } from './ui/AssessmentSetup'
import { AvailabilitySetup } from './ui/AvailabilitySetup'
import { PlanView } from './ui/PlanView'
import { TodayView } from './ui/TodayView'
import { ReplanView } from './ui/ReplanView'
import { ProgressView } from './ui/ProgressView'
import { SourceViewer } from './ui/SourceViewer'
import { CourseExportImport } from './ui/CourseExportImport'
import { NotificationsPanel } from './ui/NotificationsPanel'
import { extractDocument } from './ingest/pdf'
import { topicsFromExtractedDocument } from './data/importTopics'
import { materializeStudyBlocks } from './data/studyBlocks'
import { recordPlanVersion } from './data/planVersions'
import type { ImportedCourseResult } from './data/courseExport'
import { buildSchedule } from './domain/planBuilder'
import { computeDueNotifications, type NotificationKind } from './domain/notifications'
import { ensureNotificationPermission, showNotification } from './platform/notifications'
import type {
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Blocker,
  Course,
  PlanVersion,
  StudyBlock,
  Topic,
  TopicSection,
} from './data/schema'

/**
 * Provisorischer App-Rahmen — beweist, dass Tauri-Fenster, Vite-Build und
 * die `ui/`-Schicht zusammenspielen (ROADMAP.md Phase 1 „Tauri-Projekt,
 * Build, Tests, CI") und dass der komplette Fluss bis zum Lernplan
 * durchspielbar ist (Phase 2 „Ergebnis"). Noch **keine** echte
 * Datenbankanbindung — kein `tauri-plugin-sql` — aller Zustand ist
 * lokaler React-State statt aus der Datenbank geladen, geht beim
 * Neuladen verloren. Das kommt mit der eigentlichen Datenanbindung,
 * siehe CONTEXT.md Abschnitt 8.
 *
 * PDF-Import läuft hier direkt im Browser über `topicsFromExtractedDocument`
 * (Array-Variante ohne Datenbank, siehe `data/importTopics.ts`) statt der
 * `SqlExecutor`-Variante, die für den echten Tauri-Rahmen gedacht ist.
 */
export function App() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicSections, setTopicSections] = useState<TopicSection[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [pattern, setPattern] = useState<AvailabilityPattern[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [blockers] = useState<Blocker[]>([])
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([])
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([])
  const [documentBytes, setDocumentBytes] = useState<Record<number, Uint8Array>>({})
  const [notificationLog, setNotificationLog] = useState<Partial<Record<NotificationKind, string>>>({})
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [nextDocumentId, setNextDocumentId] = useState(1)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null

  const generateStudyBlocks = () => {
    const schedule = buildSchedule({ topics, topicSections, assessments, courses, pattern, exceptions, blockers, from: today })
    setStudyBlocks(materializeStudyBlocks(schedule.blocks))
  }

  const applyReplan = (blocks: StudyBlock[], reason: string) => {
    setPlanVersions((versions) => recordPlanVersion(versions, reason, studyBlocks, new Date().toISOString()))
    setStudyBlocks(blocks)
  }

  const checkNotifications = async () => {
    const alreadyShownToday = new Set(
      Object.entries(notificationLog)
        .filter(([, date]) => date === today)
        .map(([kind]) => kind as NotificationKind),
    )
    const todaysBlocks = studyBlocks.filter((b) => b.planned_date === today)
    const due = computeDueNotifications({ today, studyBlocksToday: todaysBlocks, topics, assessments, alreadyShownToday })
    if (due.length === 0) return []

    const granted = await ensureNotificationPermission()
    if (!granted) return []

    for (const notification of due) {
      await showNotification(notification.title, notification.body)
    }
    setNotificationLog((prev) => {
      const next = { ...prev }
      for (const notification of due) next[notification.kind] = today
      return next
    })
    return due
  }

  const applyCourseImport = (result: ImportedCourseResult) => {
    setCourses(result.courses)
    setTopics(result.topics)
    setTopicSections(result.topicSections)
    setAssessments(result.assessments)
    setStudyBlocks(result.studyBlocks)
  }

  const importPdfs = async (files: FileList) => {
    if (selectedCourseId === null) return
    let currentTopics = topics
    let currentSections = topicSections
    let documentId = nextDocumentId

    for (const file of Array.from(files)) {
      const data = new Uint8Array(await file.arrayBuffer())
      const extracted = await extractDocument(data, file.name)
      const result = topicsFromExtractedDocument(extracted, selectedCourseId, documentId, currentTopics, currentSections)
      currentTopics = result.topics
      currentSections = result.topicSections
      const importedDocumentId = documentId
      setDocumentBytes((prev) => ({ ...prev, [importedDocumentId]: data }))
      documentId += 1
    }

    setTopics(currentTopics)
    setTopicSections(currentSections)
    setNextDocumentId(documentId)
  }

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

      {selectedCourse && (
        <label>
          PDFs für {selectedCourse.name} importieren
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => e.target.files && importPdfs(e.target.files)}
          />
        </label>
      )}

      <TopicTree topics={topics} onChange={setTopics} />

      <SourceViewer topics={topics} topicSections={topicSections} documentBytes={documentBytes} />

      <PlanView
        topics={topics}
        topicSections={topicSections}
        assessments={assessments}
        courses={courses}
        pattern={pattern}
        exceptions={exceptions}
        blockers={blockers}
        from={today}
      />

      <ProgressView assessments={assessments} topics={topics} studyBlocks={studyBlocks} from={today} />

      <div>
        <button type="button" onClick={generateStudyBlocks}>
          {studyBlocks.length === 0 ? 'Plan übernehmen' : 'Plan neu übernehmen (überschreibt heutigen Fortschritt)'}
        </button>
      </div>

      <TodayView
        studyBlocks={studyBlocks}
        topics={topics}
        onChange={setStudyBlocks}
        today={today}
        now={() => new Date().toISOString()}
      />

      <ReplanView
        studyBlocks={studyBlocks}
        topics={topics}
        assessments={assessments}
        pattern={pattern}
        exceptions={exceptions}
        blockers={blockers}
        from={today}
        onApply={applyReplan}
      />
      {planVersions.length > 0 && <p>{planVersions.length} frühere Fassung(en) gespeichert (ADR-005).</p>}

      <NotificationsPanel onCheckNow={checkNotifications} />

      <CourseExportImport
        courses={courses}
        topics={topics}
        topicSections={topicSections}
        assessments={assessments}
        studyBlocks={studyBlocks}
        onImport={applyCourseImport}
        now={() => new Date().toISOString()}
      />
    </main>
  )
}
