import { useEffect, useState } from 'react'
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
import { CalendarExport } from './ui/CalendarExport'
import { extractDocument } from './ingest/pdf'
import { topicsFromExtractedDocument } from './data/importTopics'
import { materializeStudyBlocks } from './data/studyBlocks'
import { recordPlanVersion } from './data/planVersions'
import type { ImportedCourseResult } from './data/courseExport'
import { getDb } from './data/db'
import { deleteCourseRow, insertCourse, loadCourses, setCourseArchivedRow, updateCourseRow } from './data/coursesRepo'
import { removeCourse, setCourseArchived, updateCourse, type NewCourseInput } from './data/courses'
import { deleteAssessmentRow, insertAssessment, loadAssessments, updateAssessmentRow } from './data/assessmentsRepo'
import { removeAssessment, updateAssessment, type NewAssessmentInput } from './data/assessments'
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
 * App-Rahmen — beweist, dass Tauri-Fenster, Vite-Build und die
 * `ui/`-Schicht zusammenspielen (ROADMAP.md Phase 1) und dass der
 * komplette Fluss bis zum Lernplan durchspielbar ist (Phase 2). Persistenz
 * wird schrittweise nachgezogen (CONTEXT.md „Persistenz-Härtung"):
 * **Fächer und Prüfungen sind bereits echt in SQLite gespeichert**
 * (`data/coursesRepo.ts`/`data/assessmentsRepo.ts` über
 * `data/db.ts`/`tauri-plugin-sql`), alle anderen Entitäten (Verfügbarkeit,
 * Themen, Lernblöcke, Planversionen) sind weiterhin nur lokaler
 * React-State, geht beim Neuladen verloren — das kommt in den nächsten
 * Schritten. `getDb()`/die Repo-Funktionen
 * funktionieren nur im echten Tauri-Fenster (keine IPC-Bridge im
 * Vite-Dev-Server/Browser, wie bei `platform/notifications.ts`) — die
 * `catch`-Blöcke unten fangen das ab, statt die UI abstürzen zu lassen.
 *
 * PDF-Import läuft weiterhin direkt im Browser über
 * `topicsFromExtractedDocument` (Array-Variante ohne Datenbank, siehe
 * `data/importTopics.ts`) statt der `SqlExecutor`-Variante — Themen sind
 * noch nicht Teil der Persistenz-Härtung.
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

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((db) => loadCourses(db))
      .then((rows) => {
        if (!cancelled) setCourses(rows)
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — bleibt beim leeren Anfangszustand.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((db) => loadAssessments(db))
      .then((rows) => {
        if (!cancelled) setAssessments(rows)
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — bleibt beim leeren Anfangszustand.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddCourse = async (input: NewCourseInput) => {
    try {
      const db = await getDb()
      const course = await insertCourse(db, input, new Date().toISOString())
      setCourses((prev) => [...prev, course])
    } catch (error) {
      console.error('Fach konnte nicht gespeichert werden', error)
    }
  }

  const handleUpdateCourse = async (id: number, changes: Partial<NewCourseInput>) => {
    try {
      const db = await getDb()
      await updateCourseRow(db, id, changes)
      setCourses((prev) => updateCourse(prev, id, changes))
    } catch (error) {
      console.error('Fach konnte nicht aktualisiert werden', error)
    }
  }

  const handleArchiveCourse = async (id: number, archived: boolean) => {
    try {
      const db = await getDb()
      await setCourseArchivedRow(db, id, archived)
      setCourses((prev) => setCourseArchived(prev, id, archived))
    } catch (error) {
      console.error('Fach konnte nicht archiviert werden', error)
    }
  }

  const handleRemoveCourse = async (id: number) => {
    try {
      const db = await getDb()
      await deleteCourseRow(db, id)
      setCourses((prev) => removeCourse(prev, id))
    } catch (error) {
      console.error('Fach konnte nicht gelöscht werden', error)
    }
  }

  const handleAddAssessment = async (input: NewAssessmentInput) => {
    try {
      const db = await getDb()
      const assessment = await insertAssessment(db, input)
      setAssessments((prev) => [...prev, assessment])
    } catch (error) {
      console.error('Prüfung konnte nicht gespeichert werden', error)
    }
  }

  const handleUpdateAssessment = async (id: number, changes: Partial<NewAssessmentInput>) => {
    try {
      const db = await getDb()
      await updateAssessmentRow(db, id, changes)
      setAssessments((prev) => updateAssessment(prev, id, changes))
    } catch (error) {
      console.error('Prüfung konnte nicht aktualisiert werden', error)
    }
  }

  const handleRemoveAssessment = async (id: number) => {
    try {
      const db = await getDb()
      await deleteAssessmentRow(db, id)
      setAssessments((prev) => removeAssessment(prev, id))
    } catch (error) {
      console.error('Prüfung konnte nicht gelöscht werden', error)
    }
  }

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

      <CourseSetup
        courses={courses}
        onAdd={handleAddCourse}
        onUpdate={handleUpdateCourse}
        onArchive={handleArchiveCourse}
        onRemove={handleRemoveCourse}
      />

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
        <AssessmentSetup
          course={selectedCourse}
          assessments={assessments}
          onAdd={handleAddAssessment}
          onUpdate={handleUpdateAssessment}
          onRemove={handleRemoveAssessment}
        />
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

      <CalendarExport studyBlocks={studyBlocks} topics={topics} now={() => new Date().toISOString()} />

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
