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
import { computeSha256, persistExtractedDocument } from './data/importTopics'
import { materializeStudyBlocks } from './data/studyBlocks'
import type { ImportedCourseResult } from './data/courseExport'
import { getDb } from './data/db'
import { deleteCourseRow, insertCourse, loadCourses, setCourseArchivedRow, updateCourseRow } from './data/coursesRepo'
import { removeCourse, setCourseArchived, updateCourse, type NewCourseInput } from './data/courses'
import { deleteAssessmentRow, insertAssessment, loadAssessments, updateAssessmentRow } from './data/assessmentsRepo'
import { removeAssessment, updateAssessment, type NewAssessmentInput } from './data/assessments'
import {
  deleteAvailabilityExceptionRow,
  loadAvailabilityExceptions,
  loadAvailabilityPattern,
  upsertAvailabilityExceptionRow,
  upsertAvailabilityPatternRow,
} from './data/availabilityRepo'
import { removeAvailabilityException, setAvailabilityException, setAvailabilityPattern } from './data/availability'
import { loadTopics, syncTopics } from './data/topicsRepo'
import { loadTopicSections } from './data/topicSectionsRepo'
import { loadStudyBlocks, syncStudyBlocks } from './data/studyBlocksRepo'
import { insertPlanVersion, loadPlanVersions } from './data/planVersionsRepo'
import { deleteCardRow, insertCard, loadCards, type NewCardInput } from './data/cardsRepo'
import { insertReview, loadReviews } from './data/reviewsRepo'
import { scheduleReview, type Grade } from './domain/spacedRepetition'
import { ReviewSession } from './ui/ReviewSession'
import { ErrorHistory } from './ui/ErrorHistory'
import { buildSchedule } from './domain/planBuilder'
import { computeDueNotifications, type NotificationKind } from './domain/notifications'
import { ensureNotificationPermission, showNotification } from './platform/notifications'
import type {
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Blocker,
  Card,
  Course,
  PlanVersion,
  Review,
  StudyBlock,
  Topic,
  TopicSection,
} from './data/schema'

/**
 * App-Rahmen — beweist, dass Tauri-Fenster, Vite-Build und die
 * `ui/`-Schicht zusammenspielen (ROADMAP.md Phase 1) und dass der
 * komplette Fluss bis zum Lernplan durchspielbar ist (Phase 2). **Alle
 * Entitäten sind echt in SQLite gespeichert** (CONTEXT.md
 * „Persistenz-Härtung", Bausteine 1-7): `data/coursesRepo.ts`/
 * `data/assessmentsRepo.ts`/`data/availabilityRepo.ts`/
 * `data/topicsRepo.ts`/`data/topicSectionsRepo.ts`/`data/documentsRepo.ts`/
 * `data/studyBlocksRepo.ts`/`data/planVersionsRepo.ts`, alle über
 * `data/db.ts`/`tauri-plugin-sql`. `getDb()`/die Repo-Funktionen
 * funktionieren nur im echten Tauri-Fenster (keine IPC-Bridge im
 * Vite-Dev-Server/Browser, wie bei `platform/notifications.ts`) — die
 * `catch`-Blöcke unten fangen das ab, statt die UI abstürzen zu lassen.
 *
 * PDF-Rohbytes (`documentBytes`) bleiben bewusst **nicht** persistiert
 * (SECURITY.md: PDFs sind urheberrechtlich geschützt, gehören nicht mal
 * ins Repo) — nur für die laufende Sitzung im Speicher, wie zuvor.
 * `documents.stored_path` trägt deshalb noch keinen echten Dateisystempfad
 * (siehe `data/documentsRepo.ts`-Kommentar).
 *
 * **Bekannte Lücke:** Kurs-Export/Import (`applyCourseImport` unten) geht
 * bewusst **nicht** über die Repo-Schicht — es ist ein eigenständiges,
 * rein array-basiertes Austauschformat (`data/courseExport.ts`, JSON-Datei
 * zwischen den beiden Nutzern). Ein importierter Kurs (inkl. seiner
 * Lernblöcke) erscheint dadurch nur für die laufende Sitzung, nicht
 * dauerhaft in der Datenbank — dieselbe Lücke besteht bereits seit den
 * Fächer-/Prüfungs-Bausteinen, hier nur der Vollständigkeit halber erneut
 * festgehalten, da sie jetzt auch Themen und Lernblöcke betrifft.
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
  const [cards, setCards] = useState<Card[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [documentBytes, setDocumentBytes] = useState<Record<number, Uint8Array>>({})
  const [notificationLog, setNotificationLog] = useState<Partial<Record<NotificationKind, string>>>({})
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
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

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((db) => Promise.all([loadAvailabilityPattern(db), loadAvailabilityExceptions(db)]))
      .then(([patternRows, exceptionRows]) => {
        if (!cancelled) {
          setPattern(patternRows)
          setExceptions(exceptionRows)
        }
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
      .then((db) => Promise.all([loadTopics(db), loadTopicSections(db)]))
      .then(([topicRows, sectionRows]) => {
        if (!cancelled) {
          setTopics(topicRows)
          setTopicSections(sectionRows)
        }
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
      .then((db) => loadStudyBlocks(db))
      .then((rows) => {
        if (!cancelled) setStudyBlocks(rows)
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
      .then((db) => loadPlanVersions(db))
      .then((rows) => {
        if (!cancelled) setPlanVersions(rows)
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
      .then((db) => loadCards(db))
      .then((rows) => {
        if (!cancelled) setCards(rows)
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
      .then((db) => loadReviews(db))
      .then((rows) => {
        if (!cancelled) setReviews(rows)
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — bleibt beim leeren Anfangszustand.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleReview = async (cardId: number, grade: Grade) => {
    try {
      const db = await getDb()
      const reviewedAt = new Date().toISOString()
      const scheduled = scheduleReview(
        reviews.filter((r) => r.card_id === cardId),
        new Date(reviewedAt),
        grade,
      )
      const review = await insertReview(db, { card_id: cardId, reviewed_at: reviewedAt, ...scheduled })
      setReviews((prev) => [...prev, review])
    } catch (error) {
      console.error('Wiederholung konnte nicht gespeichert werden', error)
    }
  }

  const handleCreateCard = async (input: NewCardInput) => {
    try {
      const db = await getDb()
      const card = await insertCard(db, input, new Date().toISOString())
      setCards((prev) => [...prev, card])
    } catch (error) {
      console.error('Karteikarte konnte nicht gespeichert werden', error)
    }
  }

  const handleDeleteCard = async (id: number) => {
    try {
      const db = await getDb()
      await deleteCardRow(db, id)
      setCards((prev) => prev.filter((c) => c.id !== id))
      // Kaskadiert in der DB auf reviews (ON DELETE CASCADE) — lokal nachziehen.
      setReviews((prev) => prev.filter((r) => r.card_id !== id))
    } catch (error) {
      console.error('Karteikarte konnte nicht gelöscht werden', error)
    }
  }

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

  const handleSetPatternMinutes = async (weekday: AvailabilityPattern['weekday'], minutes: number) => {
    try {
      const db = await getDb()
      await upsertAvailabilityPatternRow(db, weekday, minutes)
      setPattern((prev) => setAvailabilityPattern(prev, weekday, minutes))
    } catch (error) {
      console.error('Wochenmuster konnte nicht gespeichert werden', error)
    }
  }

  const handleAddException = async (date: string, minutes: number, note: string | null) => {
    try {
      const db = await getDb()
      await upsertAvailabilityExceptionRow(db, date, minutes, note)
      setExceptions((prev) => setAvailabilityException(prev, date, minutes, note))
    } catch (error) {
      console.error('Ausnahme konnte nicht gespeichert werden', error)
    }
  }

  const handleRemoveException = async (date: string) => {
    try {
      const db = await getDb()
      await deleteAvailabilityExceptionRow(db, date)
      setExceptions((prev) => removeAvailabilityException(prev, date))
    } catch (error) {
      console.error('Ausnahme konnte nicht gelöscht werden', error)
    }
  }

  const handleChangeTopics = async (nextTopics: Topic[]) => {
    try {
      const db = await getDb()
      await syncTopics(db, topics, nextTopics)
      setTopics(nextTopics)
      // Ein gelöschtes Thema kaskadiert in der DB auf seine topic_sections
      // UND cards, ein gelöschtes card wiederum auf seine reviews (ON DELETE
      // CASCADE, zweifach) — den lokalen Zustand entsprechend nachziehen,
      // sonst blieben verwaiste Abschnitte/Karten/Wiederholungen stehen.
      const remainingTopicIds = new Set(nextTopics.map((t) => t.id))
      const remainingCards = cards.filter((c) => remainingTopicIds.has(c.topic_id))
      const remainingCardIds = new Set(remainingCards.map((c) => c.id))
      setTopicSections((prev) => prev.filter((s) => remainingTopicIds.has(s.topic_id)))
      setCards(remainingCards)
      setReviews((prev) => prev.filter((r) => remainingCardIds.has(r.card_id)))
    } catch (error) {
      console.error('Themenbaum konnte nicht gespeichert werden', error)
    }
  }

  const handleChangeStudyBlocks = async (nextBlocks: StudyBlock[]) => {
    try {
      const db = await getDb()
      const persisted = await syncStudyBlocks(db, studyBlocks, nextBlocks)
      setStudyBlocks(persisted)
    } catch (error) {
      console.error('Lernblöcke konnten nicht gespeichert werden', error)
    }
  }

  const generateStudyBlocks = async () => {
    const schedule = buildSchedule({ topics, topicSections, assessments, courses, pattern, exceptions, blockers, from: today })
    await handleChangeStudyBlocks(materializeStudyBlocks(schedule.blocks))
  }

  const applyReplan = async (blocks: StudyBlock[], reason: string) => {
    try {
      const db = await getDb()
      const version = await insertPlanVersion(
        db,
        { reason, snapshot_json: JSON.stringify(studyBlocks) },
        new Date().toISOString(),
      )
      setPlanVersions((prev) => [...prev, version])
    } catch (error) {
      console.error('Planversion konnte nicht gespeichert werden', error)
    }
    await handleChangeStudyBlocks(blocks)
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

    for (const file of Array.from(files)) {
      const data = new Uint8Array(await file.arrayBuffer())
      const extracted = await extractDocument(data, file.name)
      try {
        const db = await getDb()
        const sha256 = await computeSha256(data)
        const result = await persistExtractedDocument(
          db,
          selectedCourseId,
          extracted,
          { storedPath: `in-memory://${file.name}`, sha256, docType: 'folien' },
          new Date().toISOString(),
        )
        setTopics((prev) => [...prev, ...result.topics])
        setTopicSections((prev) => [...prev, ...result.topicSections])
        setDocumentBytes((prev) => ({ ...prev, [result.document.id]: data }))
      } catch (error) {
        console.error('PDF-Import konnte nicht gespeichert werden', error)
      }
    }
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
        onSetPatternMinutes={handleSetPatternMinutes}
        onAddException={handleAddException}
        onRemoveException={handleRemoveException}
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

      <TopicTree topics={topics} onChange={handleChangeTopics} />

      <SourceViewer
        topics={topics}
        topicSections={topicSections}
        documentBytes={documentBytes}
        cards={cards}
        onCreateCard={handleCreateCard}
        onDeleteCard={handleDeleteCard}
      />

      <ReviewSession
        cards={cards}
        reviews={reviews}
        topics={topics}
        now={() => new Date().toISOString()}
        onReview={handleReview}
      />

      <ErrorHistory cards={cards} reviews={reviews} topics={topics} onReview={handleReview} />

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
        onChange={handleChangeStudyBlocks}
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
