import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSidebar, DEFAULT_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from './ui/AppSidebar'
import { TopicTree } from './ui/TopicTree'
import { CourseSetup } from './ui/CourseSetup'
import { AssessmentSetup } from './ui/AssessmentSetup'
import { PaperSteps } from './ui/PaperSteps'
import { AvailabilitySetup } from './ui/AvailabilitySetup'
import { PlanView } from './ui/PlanView'
import { TodayView } from './ui/TodayView'
import { ReplanView } from './ui/ReplanView'
import { ProgressView } from './ui/ProgressView'
import { SourceViewer } from './ui/SourceViewer'
import { CourseExportImport } from './ui/CourseExportImport'
import { NotificationsPanel } from './ui/NotificationsPanel'
import { NotificationBanner } from './ui/NotificationBanner'
import { UpdateChecker, type UpdateInfo } from './ui/UpdateChecker'
import { UpdateBanner } from './ui/UpdateBanner'
import { CalendarExport } from './ui/CalendarExport'
import { AiSettings } from './ui/AiSettings'
import { AppearanceSetting, PALETTE_OPTIONS, type PalettePreference, type ThemePreference } from './ui/AppearanceSetting'
import { QuizSetup, type GenerateQuizInput } from './ui/QuizSetup'
import { QuizSession } from './ui/QuizSession'
import { AltklausurAnalysis } from './ui/AltklausurAnalysis'
import { DocumentList } from './ui/DocumentList'
import { checkForUpdate, installUpdateAndRestart } from './platform/updater'
import { extractDocument, extractPageRangeText, readPages } from './ingest/pdf'
import { DOCUMENT_TYPE_OPTIONS, inferDocType } from './ingest/docType'
import { loadDocumentFile, saveDocumentFile } from './platform/documentStorage'
import { pickFolder, readPdfFilesRecursively, type PickedPdfFile } from './platform/folderImport'
import { computeSha256, ensureFolderTopicPath, persistAiDetectedDocument, persistExtractedDocument } from './data/importTopics'
import { materializeStudyBlocks } from './data/studyBlocks'
import type { ImportedCourseResult } from './data/courseExport'
import { getDb } from './data/db'
import { deleteCourseRow, insertCourse, loadCourses, setCourseArchivedRow, updateCourseRow } from './data/coursesRepo'
import { removeCourse, setCourseArchived, setCourseGroup, updateCourse, type NewCourseInput } from './data/courses'
import {
  deleteCourseGroupRow,
  insertCourseGroup,
  loadCourseGroups,
  setCourseGroupRow,
  updateCourseGroupRow,
  type NewCourseGroupInput,
} from './data/courseGroupsRepo'
import {
  buildCourseGroupTree,
  deleteCourseGroup,
  moveCourseGroup,
  renameCourseGroup,
  ungroupedCourses,
  type CourseGroupTreeNode,
} from './data/courseGroups'
import { CourseGroups } from './ui/CourseGroups'
import { deleteAssessmentRow, insertAssessment, loadAssessments, updateAssessmentRow } from './data/assessmentsRepo'
import { removeAssessment, updateAssessment, type NewAssessmentInput } from './data/assessments'
import { deletePaperStepRow, insertPaperStep, loadPaperSteps, updatePaperStepRow } from './data/paperStepsRepo'
import { removePaperStep, updatePaperStep, type NewPaperStepInput } from './data/paperSteps'
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
import { computeDueNotifications, type NotificationContent, type NotificationKind } from './domain/notifications'
import { ensureNotificationPermission, showNotification } from './platform/notifications'
import { loadDocuments, updateDocumentType } from './data/documentsRepo'
import { completeQuiz, insertQuiz, loadQuizzes } from './data/quizzesRepo'
import { insertQuestion, loadQuestions } from './data/questionsRepo'
import { insertAnswer, loadAnswers } from './data/answersRepo'
import { insertAiUsage } from './data/aiUsageRepo'
import { getActiveProvider, getConfiguredAIProvider, type AIUsage } from './ai'
import { computeQuizScore } from './domain/quiz'
import { suggestWeightAdjustments, type WeightSuggestion } from './domain/examWeighting'
import type {
  Answer,
  Assessment,
  AvailabilityException,
  AvailabilityPattern,
  Blocker,
  Card,
  Course,
  CourseGroup,
  Document,
  DocumentType,
  PaperStep,
  PlanVersion,
  Question,
  Quiz,
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
 * PDF-Rohbytes (`documentBytes`) werden seit ADR-013 auf der Festplatte
 * persistiert (`platform/documentStorage.ts`, `$APPDATA/documents/`) —
 * nicht im Git-Repo (SECURITY.md: PDFs sind urheberrechtlich geschützt,
 * gehören nicht mal ins Repo, deshalb außerhalb des Repo-Ordners unter
 * Application Support). `documentBytes` wird beim Start von der
 * Festplatte nachgeladen (siehe Effekt unten); vor ADR-013 importierte
 * Dokumente tragen noch den alten `in-memory://`-Platzhalter in
 * `documents.stored_path` und bleiben dauerhaft ohne PDF.
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
type NavSection = 'faecher' | 'verfuegbarkeit' | 'plan' | 'heute' | 'wiederholen' | 'quiz' | 'fortschritt' | 'einstellungen'

// Reine UI-Präferenz (Breite/Ein-Ausgeklappt-Status der Seitenleiste), kein
// Lerninhalt — bewusst in `localStorage` statt SQLite: unterscheidet sich
// pro Gerät (unterschiedliche Bildschirmgrößen der zwei Nutzer), muss
// deshalb ohnehin nicht zwischen ihnen geteilt werden, und `localStorage`
// ist im Tauri-Webview wie im Vite-Dev-Server ohne IPC verfügbar (anders als
// `getDb()`) — funktioniert also auch dort, wo Fach-/Themen-Persistenz
// bekanntermaßen nicht erreichbar ist.
const SIDEBAR_WIDTH_STORAGE_KEY = 'lernplaner.sidebarWidth'
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'lernplaner.sidebarCollapsed'
const THEME_STORAGE_KEY = 'lernplaner.theme'
const PALETTE_STORAGE_KEY = 'lernplaner.palette'

function readStoredSidebarWidth(): number {
  const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
  return Number.isFinite(stored) && stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH ? stored : DEFAULT_SIDEBAR_WIDTH
}

function readStoredTheme(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function readStoredPalette(): PalettePreference {
  const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY)
  return PALETTE_OPTIONS.some((opt) => opt.value === stored) ? (stored as PalettePreference) : 'terrakotta'
}

/**
 * Rendert den Fach-Ordner-Baum (Migration 0005) in der Seitenleiste —
 * Ordner als reine, nicht klickbare Zwischenüberschriften (`app-nav-label`,
 * eingerückt je Tiefe), Fächer darunter wie bisher als `app-nav-item`.
 * Modulweite Funktion statt Komponenteninterna, weil sie keinen eigenen
 * Zustand braucht — nur die bereits vorhandenen `selectedCourseId`/
 * `setSelectedCourseId` von `App()` durchreicht.
 */
function renderSidebarCourseTree(
  nodes: CourseGroupTreeNode[],
  selectedCourseId: number | null,
  setSelectedCourseId: (id: number) => void,
  depth = 0,
): ReactNode[] {
  return nodes.flatMap((node) => [
    <div key={`group-${node.id}`} className="app-nav-label" style={{ paddingLeft: 12 + depth * 12 }}>
      {node.name}
    </div>,
    ...node.courses.map((c) => (
      <button
        key={`course-${c.id}`}
        type="button"
        className="app-nav-item"
        style={{ paddingLeft: 12 + (depth + 1) * 12 }}
        aria-current={selectedCourseId === c.id ? 'page' : undefined}
        onClick={() => setSelectedCourseId(c.id)}
      >
        <span className="app-nav-item-label">{c.name}</span>
      </button>
    )),
    ...renderSidebarCourseTree(node.children, selectedCourseId, setSelectedCourseId, depth + 1),
  ])
}

const NAV_ITEMS: { key: NavSection; label: string }[] = [
  { key: 'faecher', label: 'Fächer & Themen' },
  { key: 'verfuegbarkeit', label: 'Verfügbarkeit' },
  { key: 'plan', label: 'Planung' },
  { key: 'heute', label: 'Heute' },
  { key: 'wiederholen', label: 'Wiederholen' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'fortschritt', label: 'Fortschritt' },
  { key: 'einstellungen', label: 'Einstellungen' },
]

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('faecher')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicSections, setTopicSections] = useState<TopicSection[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [paperSteps, setPaperSteps] = useState<PaperStep[]>([])
  const [pattern, setPattern] = useState<AvailabilityPattern[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [blockers] = useState<Blocker[]>([])
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([])
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentBytes, setDocumentBytes] = useState<Record<number, Uint8Array>>({})
  const [notificationLog, setNotificationLog] = useState<Partial<Record<NotificationKind, string>>>({})
  const [dueNotifications, setDueNotifications] = useState<NotificationContent[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [importDocType, setImportDocType] = useState<DocumentType>('folien')
  const [importDocTypeLabel, setImportDocTypeLabel] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: Quiz; questions: Question[]; durationMinutes: number | null } | null>(
    null,
  )
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1')
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme)
  const [palette, setPalette] = useState<PalettePreference>(readStoredPalette)

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null

  // Automatischer Update-Check: beim Start, ein Retry nach 5s bei
  // Fehlschlag (Verdacht: Netzwerk nach Mac-Neustart/-Aufwachen noch nicht
  // bereit — ein manueller Klick Sekunden/Minuten später zeigte diesen
  // Fehler nie), und danach ein wiederkehrender Check alle 45 Minuten für
  // den Rest der Sitzung (Nutzerwunsch, 2026-07-22) — bewusst anders als
  // der Notification-Check unten, der ohne eigenen Scheduler auskommt:
  // hier soll ein während einer langen Sitzung neu erschienenes Release
  // auch ohne Neustart bemerkt werden. 45 Minuten als Mittelweg: oft genug
  // für eine mehrstündige Lernsitzung, selten genug, um nicht unnötig zu
  // pollen. Ergebnis geht an `UpdateBanner`; im Dev-Server/Browser (keine
  // echte Tauri-IPC-Bridge) bleibt `updateInfo` einfach `null`.
  useEffect(() => {
    let cancelled = false
    const PERIODIC_CHECK_MS = 45 * 60 * 1000
    let retryTimeout: ReturnType<typeof setTimeout> | undefined

    const runCheck = (isRetry: boolean) => {
      checkForUpdate()
        .then((result) => {
          if (!cancelled) setUpdateInfo(result)
        })
        .catch(() => {
          if (!isRetry && !cancelled) {
            retryTimeout = setTimeout(() => runCheck(true), 5000)
          }
          // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) oder Netzwerk noch nicht bereit —
          // der nächste periodische Check (alle 45 Minuten) versucht es ohnehin erneut.
        })
    }

    runCheck(false)
    const periodicInterval = setInterval(() => runCheck(false), PERIODIC_CHECK_MS)

    return () => {
      cancelled = true
      clearTimeout(retryTimeout)
      clearInterval(periodicInterval)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  // "system" setzt bewusst kein Attribut (statt z. B. data-theme="system")
  // — dann greift ausschließlich `prefers-color-scheme` in tokens.css,
  // ohne eine dritte, redundante CSS-Regel dafür zu brauchen.
  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // "terrakotta" (Standard) setzt bewusst kein Attribut, aus demselben Grund wie "system" oben.
  useEffect(() => {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette)
    if (palette === 'terrakotta') document.documentElement.removeAttribute('data-palette')
    else document.documentElement.setAttribute('data-palette', palette)
  }, [palette])

  // Berechtigung früh anfragen, unabhängig davon, ob gerade etwas fällig
  // ist: `checkNotifications` unten fragt bewusst nur, wenn `due.length >
  // 0` — bei einer frisch installierten App ohne Fächer/Prüfungen wäre das
  // sonst nie der Fall, und macOS würde nie fragen dürfen, ob
  // Benachrichtigungen erlaubt sind (Fehler, an echter Nutzung entdeckt:
  // erster Start ohne Daten fragt nie). Einmalig beim Start, Ergebnis wird
  // hier nicht gebraucht — `checkNotifications` prüft den Status später
  // selbst erneut, bevor es tatsächlich etwas anzeigt.
  useEffect(() => {
    ensureNotificationPermission().catch(() => {
      // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — keine Berechtigungsabfrage möglich.
    })
  }, [])

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
      .then((db) => loadCourseGroups(db))
      .then((rows) => {
        if (!cancelled) setCourseGroups(rows)
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
      .then((db) => loadPaperSteps(db))
      .then((rows) => {
        if (!cancelled) setPaperSteps(rows)
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

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((db) => loadDocuments(db))
      .then((rows) => {
        if (!cancelled) setDocuments(rows)
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — bleibt beim leeren Anfangszustand.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Materialien überstehen jetzt einen Neustart (Nutzerwunsch 2026-07-22,
  // siehe `platform/documentStorage.ts`) — hier werden die PDF-Bytes für
  // alle bereits bekannten Dokumente von der Festplatte nachgeladen, statt
  // nur für neu importierte im Speicher zu bleiben. Dokumente mit dem
  // alten `in-memory://`-Platzhalter (vor dieser Änderung importiert)
  // liefern hier bewusst nichts — für die ist das PDF unwiederbringlich
  // verloren, siehe `data/documentsRepo.ts`-Kommentar.
  useEffect(() => {
    let cancelled = false
    const missing = documents.filter((d) => documentBytes[d.id] === undefined)
    if (missing.length === 0) return

    Promise.all(
      missing.map(async (doc) => {
        const bytes = await loadDocumentFile(doc.stored_path)
        return bytes ? ([doc.id, bytes] as const) : null
      }),
    )
      .then((results) => {
        if (cancelled) return
        const loaded = results.filter((r): r is readonly [number, Uint8Array] => r !== null)
        if (loaded.length === 0) return
        setDocumentBytes((prev) => ({ ...prev, ...Object.fromEntries(loaded) }))
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — Materialien bleiben nicht geladen.
      })
    return () => {
      cancelled = true
    }
  }, [documents])

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((db) => Promise.all([loadQuizzes(db), loadQuestions(db), loadAnswers(db)]))
      .then(([quizRows, questionRows, answerRows]) => {
        if (!cancelled) {
          setQuizzes(quizRows)
          setQuestions(questionRows)
          setAnswers(answerRows)
        }
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

  const handleAddCourseGroup = async (input: NewCourseGroupInput) => {
    try {
      const db = await getDb()
      const group = await insertCourseGroup(db, input)
      setCourseGroups((prev) => [...prev, group])
    } catch (error) {
      console.error('Ordner konnte nicht gespeichert werden', error)
    }
  }

  const handleRenameCourseGroup = async (id: number, name: string) => {
    try {
      const db = await getDb()
      const next = renameCourseGroup(courseGroups, id, name)
      await updateCourseGroupRow(db, id, { name: next.find((g) => g.id === id)!.name })
      setCourseGroups(next)
    } catch (error) {
      console.error('Ordner konnte nicht umbenannt werden', error)
    }
  }

  const handleMoveCourseGroup = async (id: number, newParentId: number | null) => {
    try {
      const db = await getDb()
      const next = moveCourseGroup(courseGroups, id, newParentId)
      const updated = next.find((g) => g.id === id)!
      await updateCourseGroupRow(db, id, { parent_id: updated.parent_id, sort_order: updated.sort_order })
      setCourseGroups(next)
    } catch (error) {
      console.error('Ordner konnte nicht verschoben werden', error)
    }
  }

  const handleRemoveCourseGroup = async (id: number) => {
    try {
      const db = await getDb()
      const result = deleteCourseGroup(courseGroups, courses, id)
      await deleteCourseGroupRow(db, id) // kaskadiert Unterordner, setzt courses.group_id per ON DELETE SET NULL
      setCourseGroups(result.groups)
      setCourses(result.courses)
    } catch (error) {
      console.error('Ordner konnte nicht gelöscht werden', error)
    }
  }

  const handleSetCourseGroup = async (courseId: number, groupId: number | null) => {
    try {
      const db = await getDb()
      await setCourseGroupRow(db, courseId, groupId)
      setCourses((prev) => setCourseGroup(prev, courseId, groupId))
    } catch (error) {
      console.error('Fach konnte keinem Ordner zugewiesen werden', error)
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
      // Kaskadiert in der DB auf paper_steps (ON DELETE CASCADE) — lokal nachziehen.
      setPaperSteps((prev) => prev.filter((s) => s.assessment_id !== id))
    } catch (error) {
      console.error('Prüfung konnte nicht gelöscht werden', error)
    }
  }

  const handleAddPaperStep = async (input: NewPaperStepInput) => {
    try {
      const db = await getDb()
      const step = await insertPaperStep(db, input)
      setPaperSteps((prev) => [...prev, step])
    } catch (error) {
      console.error('Teilschritt konnte nicht gespeichert werden', error)
    }
  }

  const handleUpdatePaperStep = async (id: number, changes: Partial<NewPaperStepInput>) => {
    try {
      const db = await getDb()
      await updatePaperStepRow(db, id, changes)
      setPaperSteps((prev) => updatePaperStep(prev, id, changes))
    } catch (error) {
      console.error('Teilschritt konnte nicht aktualisiert werden', error)
    }
  }

  const handleRemovePaperStep = async (id: number) => {
    try {
      const db = await getDb()
      await deletePaperStepRow(db, id)
      setPaperSteps((prev) => removePaperStep(prev, id))
    } catch (error) {
      console.error('Teilschritt konnte nicht gelöscht werden', error)
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

    // In-App-Banner ist der primäre Übertragungsweg (siehe
    // ui/NotificationBanner.tsx-Kommentar) — unabhängig davon, ob die
    // native Berechtigung je erteilt wurde/wird. Native Benachrichtigung
    // zusätzlich versuchen, aber ihr Fehlschlagen darf den In-App-Banner
    // nicht verhindern (anders als vorher: `return []` bei fehlender
    // Berechtigung verlor die Information komplett).
    setDueNotifications((prev) => [...prev, ...due])
    setNotificationLog((prev) => {
      const next = { ...prev }
      for (const notification of due) next[notification.kind] = today
      return next
    })

    try {
      const granted = await ensureNotificationPermission()
      if (granted) {
        for (const notification of due) {
          await showNotification(notification.title, notification.body)
        }
      }
    } catch {
      // Kein echtes Tauri-Fenster oder Berechtigung nicht verfügbar — der In-App-Banner oben zeigt es trotzdem.
    }

    return due
  }

  const dismissNotification = (kind: NotificationKind) => {
    setDueNotifications((prev) => prev.filter((n) => n.kind !== kind))
  }

  // Automatischer Check statt nur über den "Jetzt prüfen"-Knopf in
  // NotificationsPanel (Nutzerwunsch, analog zum automatischen
  // Update-Check oben) — läuft, sobald Lernblöcke/Themen/Prüfungen aus der
  // DB geladen sind, und danach erneut bei jeder Änderung daran (z. B.
  // neue Prüfung angelegt). `computeDueNotifications`/`notificationLog`
  // sorgen dafür, dass jede Art höchstens einmal pro Tag gezeigt wird —
  // wiederholtes Auslösen dieses Effekts ist damit ungefährlich.
  //
  // **Native macOS-Benachrichtigung funktioniert nicht zuverlässig ohne
  // Apple-Entwickler-ID-Signatur** (an echter Nutzung entdeckt,
  // 2026-07-22, siehe DECISIONS.md): `UNUserNotificationCenter` registriert
  // ad-hoc-signierte Apps beim System nicht, die Berechtigungsabfrage
  // verpufft lautlos. Auf Rückfrage entschieden: `ui/NotificationBanner.tsx`
  // (In-App, unabhängig von der nativen Berechtigung) ist deshalb der
  // *primäre* Übertragungsweg, `showNotification` bleibt nur ein
  // Best-Effort-Zusatz für den Fall einer künftigen echten Signatur.
  useEffect(() => {
    checkNotifications()
  }, [studyBlocks, topics, assessments])

  const applyCourseImport = (result: ImportedCourseResult) => {
    setCourses(result.courses)
    setTopics(result.topics)
    setTopicSections(result.topicSections)
    setAssessments(result.assessments)
    setStudyBlocks(result.studyBlocks)
  }

  // Best-Effort-Protokollierung (ADR-007) — ein fehlgeschlagener
  // Log-Versuch (z. B. kein echtes Tauri-Fenster) darf das eigentliche
  // KI-Ergebnis nicht verwerfen, deshalb hier bewusst nicht geworfen.
  const logAiUsage = async (usage: AIUsage) => {
    try {
      const db = await getDb()
      const providerKind = await getActiveProvider()
      await insertAiUsage(db, providerKind, usage, new Date().toISOString())
    } catch (error) {
      console.error('KI-Nutzung konnte nicht protokolliert werden', error)
    }
  }

  // Quiz-Generierung/Probeklausur-Simulation (ROADMAP.md Phase 4): pro
  // ausgewähltem Themenabschnitt wird echter Belegtext aus den noch im
  // Speicher gehaltenen PDF-Bytes extrahiert (siehe `ingest/pdf.ts`
  // `extractPageRangeText`-Kommentar) und an die KI übergeben — nie frei
  // erfundener Text, sonst ließe sich `questions.source_page` nicht
  // rechtfertigen (DATA_MODEL.md).
  const handleGenerateQuiz = async (input: GenerateQuizInput) => {
    const provider = await getConfiguredAIProvider(logAiUsage)
    if (!provider) throw new Error('Kein KI-Anbieter konfiguriert — in den Einstellungen einen API-Schlüssel hinterlegen.')
    const courseLanguage = courses.find((c) => c.id === input.courseId)?.language ?? 'de'

    const generated: { sectionId: number; suggestion: Awaited<ReturnType<typeof provider.generateQuestions>>[number] }[] = []
    for (const sectionId of input.sectionIds) {
      const section = topicSections.find((s) => s.id === sectionId)
      const topic = section ? topics.find((t) => t.id === section.topic_id) : undefined
      const bytes = section ? documentBytes[section.document_id] : undefined
      if (!section || !topic || !bytes) continue

      const sourceText = await extractPageRangeText(bytes, section.page_start, section.page_end)
      const suggestions = await provider.generateQuestions(
        topic.name,
        sourceText,
        input.questionsPerSection,
        input.difficulty,
        courseLanguage,
      )
      for (const suggestion of suggestions) generated.push({ sectionId, suggestion })
    }

    if (generated.length === 0) throw new Error('Es konnten keine Fragen erzeugt werden.')

    const db = await getDb()
    const configJson = JSON.stringify({ mode: input.mode, assessmentId: input.assessmentId, sectionIds: input.sectionIds })
    const quiz = await insertQuiz(db, { course_id: input.courseId, config_json: configJson }, new Date().toISOString())

    const newQuestions: Question[] = []
    for (const { sectionId, suggestion } of generated) {
      const section = topicSections.find((s) => s.id === sectionId)!
      const question = await insertQuestion(db, {
        quiz_id: quiz.id,
        topic_id: section.topic_id,
        type: suggestion.type,
        prompt: suggestion.prompt,
        answer: suggestion.answer,
        explanation: suggestion.explanation,
        source_document_id: section.document_id,
        source_page: section.page_start,
        difficulty: suggestion.difficulty,
        options: suggestion.options ?? null,
      })
      newQuestions.push(question)
    }

    setQuizzes((prev) => [...prev, quiz])
    setQuestions((prev) => [...prev, ...newQuestions])

    const assessment = input.assessmentId !== null ? assessments.find((a) => a.id === input.assessmentId) : undefined
    setActiveQuiz({ quiz, questions: newQuestions, durationMinutes: assessment?.duration_minutes ?? null })
  }

  const handleAnswerQuestion = async (questionId: number, given: string, correct: 0 | 1, seconds: number) => {
    try {
      const db = await getDb()
      const answer = await insertAnswer(db, {
        question_id: questionId,
        given,
        correct,
        answered_at: new Date().toISOString(),
        seconds,
      })
      setAnswers((prev) => [...prev, answer])
    } catch (error) {
      console.error('Antwort konnte nicht gespeichert werden', error)
    }
  }

  const handleFinishQuiz = async () => {
    if (!activeQuiz) return
    const questionIds = new Set(activeQuiz.questions.map((q) => q.id))
    const relevantAnswers = answers.filter((a) => questionIds.has(a.question_id))
    const score = computeQuizScore(relevantAnswers.map((a) => ({ correct: a.correct }))) ?? 0
    const completedAt = new Date().toISOString()
    try {
      const db = await getDb()
      await completeQuiz(db, activeQuiz.quiz.id, score, completedAt)
      setQuizzes((prev) => prev.map((q) => (q.id === activeQuiz.quiz.id ? { ...q, completed_at: completedAt, score } : q)))
    } catch (error) {
      console.error('Quiz konnte nicht abgeschlossen werden', error)
    }
    setActiveQuiz(null)
  }

  // Altklausur-Analyse → automatische Gewichtung (ROADMAP.md Phase 4),
  // nach ADR-005-Prinzip als Vorschlag: dieser Handler liefert nur eine
  // Vorschau (`domain/examWeighting.ts`), angewendet wird sie erst über
  // `handleApplyWeightSuggestions` nach ausdrücklicher Bestätigung in
  // `ui/AltklausurAnalysis.tsx`.
  const handleAnalyzeAltklausur = async (documentIds: number[]): Promise<WeightSuggestion[]> => {
    const provider = await getConfiguredAIProvider(logAiUsage)
    if (!provider) throw new Error('Kein KI-Anbieter konfiguriert — in den Einstellungen einen API-Schlüssel hinterlegen.')
    if (documentIds.length === 0) throw new Error('Keine Altklausur ausgewählt.')

    const courseId = documents.find((d) => d.id === documentIds[0])?.course_id
    const courseTopics = topics.filter((t) => t.course_id === courseId)
    if (courseTopics.length === 0) throw new Error('Keine Themen für dieses Fach vorhanden.')

    const textParts: string[] = []
    for (const docId of documentIds) {
      const doc = documents.find((d) => d.id === docId)
      const bytes = documentBytes[docId]
      if (!doc || !bytes) continue
      textParts.push(await extractPageRangeText(bytes, 1, doc.pdf_pages))
    }
    if (textParts.length === 0) throw new Error('Keine der ausgewählten Altklausuren ist noch im Speicher verfügbar.')

    const matches = await provider.classifyExamContent(
      courseTopics.map((t) => ({ id: t.id, name: t.name })),
      textParts.join('\n\n'),
    )
    return suggestWeightAdjustments(courseTopics, matches)
  }

  const handleApplyWeightSuggestions = async (suggestions: WeightSuggestion[]) => {
    const nextTopics = topics.map((t) => {
      const suggestion = suggestions.find((s) => s.topicId === t.id)
      return suggestion ? { ...t, weight: suggestion.suggestedWeight } : t
    })
    await handleChangeTopics(nextTopics)
  }

  const handleChangeDocumentType = async (id: number, docType: DocumentType, docTypeLabel: string | null) => {
    try {
      const db = await getDb()
      await updateDocumentType(db, id, docType, docTypeLabel)
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, doc_type: docType, doc_type_label: docTypeLabel } : d)))
    } catch (error) {
      console.error('Dokumenttyp konnte nicht geändert werden', error)
    }
  }

  // Zusammenfassungen haben keinen einheitlichen Aufbau (jede Person
  // schreibt anders, oft ganz ohne optische Gliederung — siehe CONTEXT.md
  // „Analyse: Beispiel-PDFs") — die folienbasierte Kapitelerkennung
  // (`extractDocument`) passt hier nicht. Stattdessen liest die KI den
  // kompletten Seitentext inhaltlich und gruppiert ihn selbst nach Themen
  // (ADR-015 `detectTopicsFromText`).
  const importSummaryPdf = async (fileName: string, data: Uint8Array, parentTopicId: number | null) => {
    const provider = await getConfiguredAIProvider(logAiUsage)
    if (!provider) throw new Error('Kein KI-Anbieter konfiguriert — in den Einstellungen einen API-Schlüssel hinterlegen.')

    const pages = await readPages(data)
    const pagedText = pages.map((p) => ({ pageNumber: p.number, text: p.lines.map((l) => l.text).join(' ') }))
    const suggestions = await provider.detectTopicsFromText(pagedText)
    if (suggestions.length === 0) throw new Error('Es konnten keine Themen erkannt werden.')

    const db = await getDb()
    const sha256 = await computeSha256(data)
    const storedPath = await saveDocumentFile(sha256, data)
    const uniqueCharsByTopic = suggestions.map((suggestion) => ({
      suggestion,
      uniqueChars: pagedText
        .filter((p) => p.pageNumber >= suggestion.pageStart && p.pageNumber <= suggestion.pageEnd)
        .reduce((sum, p) => sum + p.text.length, 0),
    }))

    return persistAiDetectedDocument(
      db,
      selectedCourseId!,
      fileName,
      { storedPath, sha256, docType: 'zusammenfassung', docTypeLabel: null },
      pages.length,
      uniqueCharsByTopic,
      new Date().toISOString(),
      parentTopicId,
    )
  }

  const importRegularPdf = async (fileName: string, data: Uint8Array, docType: DocumentType, parentTopicId: number | null) => {
    const db = await getDb()
    const extracted = await extractDocument(data, fileName)
    const sha256 = await computeSha256(data)
    const storedPath = await saveDocumentFile(sha256, data)
    return persistExtractedDocument(
      db,
      selectedCourseId!,
      extracted,
      { storedPath, sha256, docType, docTypeLabel: docType === 'sonstiges' ? importDocTypeLabel.trim() || null : null },
      new Date().toISOString(),
      parentTopicId,
    )
  }

  const importPdfs = async (files: FileList, docType: DocumentType) => {
    if (selectedCourseId === null) return
    setImportError(null)

    for (const file of Array.from(files)) {
      const data = new Uint8Array(await file.arrayBuffer())
      try {
        const result =
          docType === 'zusammenfassung'
            ? await importSummaryPdf(file.name, data, null)
            : await importRegularPdf(file.name, data, docType, null)
        setTopics((prev) => [...prev, ...result.topics])
        setTopicSections((prev) => [...prev, ...result.topicSections])
        setDocuments((prev) => [...prev, result.document])
        setDocumentBytes((prev) => ({ ...prev, [result.document.id]: data }))
      } catch (error) {
        console.error('PDF-Import konnte nicht gespeichert werden', error)
        const message = error instanceof Error ? error.message : String(error)
        setImportError(`„${file.name}" konnte nicht importiert werden: ${message}`)
      }
    }
  }

  // Ordner-Import: der Nutzer wählt statt einzelner PDFs einen ganzen
  // Ordner (z. B. schon nach Unterthemen sortiert). Läuft über den
  // nativen Systemdialog + echtes Dateisystem-Lesen
  // (`platform/folderImport.ts`), nicht über
  // `<input type="file" webkitdirectory>` — dieses Attribut ist in
  // WKWebView (Tauris Webview unter macOS) bekannt unzuverlässig, siehe
  // Kommentar dort. `relativePath` (aus `readPdfFilesRecursively`) enthält
  // den gewählten Wurzelordner selbst nicht — Zwischenordner werden 1:1 zu
  // verschachtelten Themen (`ensureFolderTopicPath`), PDFs direkt im
  // gewählten Ordner (kein Zwischenordner) verhalten sich wie beim
  // normalen Mehrfach-Import (`importPdfs`): ihre Kapitel-Themen bekommen
  // `parent_id = null`.
  const importFolder = async () => {
    if (selectedCourseId === null) return
    setImportError(null)

    let db: Awaited<ReturnType<typeof getDb>>
    let pickedFiles: PickedPdfFile[]
    try {
      const folder = await pickFolder()
      if (folder === null) return // Nutzer hat abgebrochen
      db = await getDb()
      pickedFiles = await readPdfFilesRecursively(folder)
    } catch (error) {
      console.error('Ordner-Import fehlgeschlagen', error)
      setImportError(`Ordner konnte nicht importiert werden: ${error instanceof Error ? error.message : String(error)}`)
      return
    }

    if (pickedFiles.length === 0) {
      setImportError('Der gewählte Ordner enthält keine PDF-Dateien.')
      return
    }

    // "folien" gilt als noch nicht bewusst gewählt (Default) — nur dann
    // übernimmt die Erkennung aus dem ersten Dateinamen die Auswahl
    // automatisch (analog zum Einzel-/Mehrfach-Import oben).
    const docType = importDocType === 'folien' ? inferDocType(pickedFiles[0]!.name) : importDocType
    if (docType !== importDocType) setImportDocType(docType)

    let knownTopics = topics

    for (const file of pickedFiles) {
      const segments = file.relativePath.split('/').filter(Boolean)
      const folderNames = segments.slice(0, -1) // ohne Dateiname

      try {
        let parentTopicId: number | null = null
        if (folderNames.length > 0) {
          const resolved = await ensureFolderTopicPath(db, selectedCourseId, knownTopics, folderNames)
          parentTopicId = resolved.topicId
          if (resolved.createdTopics.length > 0) {
            knownTopics = [...knownTopics, ...resolved.createdTopics]
            setTopics((prev) => [...prev, ...resolved.createdTopics])
          }
        }

        const result =
          docType === 'zusammenfassung'
            ? await importSummaryPdf(file.name, file.data, parentTopicId)
            : await importRegularPdf(file.name, file.data, docType, parentTopicId)
        knownTopics = [...knownTopics, ...result.topics]
        setTopics((prev) => [...prev, ...result.topics])
        setTopicSections((prev) => [...prev, ...result.topicSections])
        setDocuments((prev) => [...prev, result.document])
        setDocumentBytes((prev) => ({ ...prev, [result.document.id]: file.data }))
      } catch (error) {
        console.error(`PDF-Import konnte nicht gespeichert werden (${file.relativePath})`, error)
        const message = error instanceof Error ? error.message : String(error)
        setImportError(`„${file.relativePath}" konnte nicht importiert werden: ${message}`)
      }
    }
  }

  const mainInsetPx = sidebarCollapsed ? 0 : sidebarWidth

  return (
    <div className="app-shell">
      <AppSidebar width={sidebarWidth} collapsed={sidebarCollapsed} onResize={setSidebarWidth}>
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true" />
          <span className="app-brand-label">Lernplaner</span>
        </div>

        <div className="app-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="app-nav-item"
              aria-current={activeSection === item.key ? 'page' : undefined}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="app-nav-item-label">{item.label}</span>
            </button>
          ))}
        </div>

        {courses.length > 0 && (
          <div>
            <div className="app-nav-label">Fach</div>
            <div className="app-nav">
              {renderSidebarCourseTree(
                buildCourseGroupTree(courseGroups, courses.filter((c) => c.archived === 0)),
                selectedCourseId,
                setSelectedCourseId,
              )}
              {ungroupedCourses(courses.filter((c) => c.archived === 0)).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="app-nav-item"
                  aria-current={selectedCourseId === c.id ? 'page' : undefined}
                  onClick={() => setSelectedCourseId(c.id)}
                >
                  <span className="app-nav-item-label">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </AppSidebar>

      <div className="app-main" style={{ ['--main-inset' as string]: `${mainInsetPx}px` }}>
        <header className="app-toolbar">
          <div className="app-toolbar-left">
            <button
              type="button"
              className="app-sidebar-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-pressed={sidebarCollapsed}
              title={sidebarCollapsed ? 'Seitenleiste einblenden' : 'Seitenleiste ausblenden'}
            >
              <span className="app-sidebar-toggle-icon" aria-hidden="true" />
            </button>
            <h1>{NAV_ITEMS.find((i) => i.key === activeSection)?.label}</h1>
          </div>
          {selectedCourse && <span>{selectedCourse.name}</span>}
        </header>

        <main className="app-content">
          <UpdateBanner update={updateInfo} onInstall={installUpdateAndRestart} />
          <NotificationBanner notifications={dueNotifications} onDismiss={dismissNotification} />

        {activeSection === 'faecher' && (
          <>
            <CourseSetup
              courses={courses}
              onAdd={handleAddCourse}
              onUpdate={handleUpdateCourse}
              onArchive={handleArchiveCourse}
              onRemove={handleRemoveCourse}
            />

            <CourseGroups
              courseGroups={courseGroups}
              courses={courses}
              onAdd={handleAddCourseGroup}
              onRename={handleRenameCourseGroup}
              onMove={handleMoveCourseGroup}
              onRemove={handleRemoveCourseGroup}
              onAssignCourse={handleSetCourseGroup}
            />

            {selectedCourse && (
              <AssessmentSetup
                course={selectedCourse}
                assessments={assessments}
                onAdd={handleAddAssessment}
                onUpdate={handleUpdateAssessment}
                onRemove={handleRemoveAssessment}
              />
            )}
            {selectedCourse && (
              <PaperSteps
                course={selectedCourse}
                assessments={assessments}
                steps={paperSteps}
                onAdd={handleAddPaperStep}
                onUpdate={handleUpdatePaperStep}
                onRemove={handleRemovePaperStep}
              />
            )}

            {selectedCourse && (
              <>
                <label>
                  Dokumenttyp
                  <select value={importDocType} onChange={(e) => setImportDocType(e.target.value as DocumentType)}>
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Wird beim Dateiauswählen automatisch aus dem Dateinamen vorgeschlagen (z. B. „Altklausur" oder
                  „Zusammenfassung" im Namen) — falsch erkannt? Danach jederzeit unten in „Importierte Dokumente"
                  korrigierbar.
                </p>
                {importDocType === 'sonstiges' && (
                  <label>
                    Eigene Bezeichnung
                    <input
                      value={importDocTypeLabel}
                      onChange={(e) => setImportDocTypeLabel(e.target.value)}
                      placeholder="z. B. Formelsammlung"
                      list="doc-type-label-suggestions"
                    />
                    <datalist id="doc-type-label-suggestions">
                      {Array.from(new Set(documents.map((d) => d.doc_type_label).filter((label): label is string => !!label))).map(
                        (label) => (
                          <option key={label} value={label} />
                        ),
                      )}
                    </datalist>
                  </label>
                )}
                <label>
                  PDFs für {selectedCourse.name} importieren
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                      if (!files || files.length === 0) return
                      // "folien" gilt als noch nicht bewusst gewählt (Default) — nur dann
                      // übernimmt die Erkennung aus dem Dateinamen die Auswahl automatisch,
                      // eine bewusst getroffene Wahl wird nie überschrieben (siehe
                      // ingest/docType.ts-Kommentar).
                      const resolvedType = importDocType === 'folien' ? inferDocType(files[0]!.name) : importDocType
                      if (resolvedType !== importDocType) setImportDocType(resolvedType)
                      importPdfs(files, resolvedType)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button type="button" onClick={() => importFolder()}>
                  Oder ganzen Ordner importieren
                </button>
                <p>
                  Unterordner des gewählten Ordners werden 1:1 als verschachtelte Themen übernommen — praktisch, wenn
                  Material schon nach Unterthemen sortiert in Ordnern liegt. PDFs direkt im gewählten Ordner (ohne
                  Unterordner) verhalten sich wie beim normalen Import oben.
                </p>
                {importError && <p role="alert">{importError}</p>}
              </>
            )}

            {selectedCourse && (
              <DocumentList course={selectedCourse} documents={documents} onChangeType={handleChangeDocumentType} />
            )}

            {selectedCourse && (
              <AltklausurAnalysis
                course={selectedCourse}
                topics={topics.filter((t) => t.course_id === selectedCourse.id)}
                documents={documents}
                documentBytes={documentBytes}
                onAnalyze={handleAnalyzeAltklausur}
                onApply={handleApplyWeightSuggestions}
              />
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
          </>
        )}

        {activeSection === 'verfuegbarkeit' && (
          <AvailabilitySetup
            pattern={pattern}
            exceptions={exceptions}
            onSetPatternMinutes={handleSetPatternMinutes}
            onAddException={handleAddException}
            onRemoveException={handleRemoveException}
          />
        )}

        {activeSection === 'plan' && (
          <>
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

            <div>
              <button type="button" onClick={generateStudyBlocks}>
                {studyBlocks.length === 0 ? 'Plan übernehmen' : 'Plan neu übernehmen (überschreibt heutigen Fortschritt)'}
              </button>
            </div>

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
          </>
        )}

        {activeSection === 'heute' && (
          <TodayView
            studyBlocks={studyBlocks}
            topics={topics}
            onChange={handleChangeStudyBlocks}
            today={today}
            now={() => new Date().toISOString()}
          />
        )}

        {activeSection === 'wiederholen' && (
          <>
            <ReviewSession
              cards={cards}
              reviews={reviews}
              topics={topics}
              now={() => new Date().toISOString()}
              onReview={handleReview}
            />

            <ErrorHistory cards={cards} reviews={reviews} topics={topics} onReview={handleReview} />
          </>
        )}

        {activeSection === 'quiz' &&
          (activeQuiz ? (
            <QuizSession
              questions={activeQuiz.questions}
              topics={topics}
              durationMinutes={activeQuiz.durationMinutes}
              onAnswer={handleAnswerQuestion}
              onFinish={handleFinishQuiz}
            />
          ) : (
            <>
              <QuizSetup
                courses={courses}
                topics={topics}
                topicSections={topicSections}
                documents={documents}
                documentBytes={documentBytes}
                assessments={assessments}
                onGenerate={handleGenerateQuiz}
              />
              {quizzes.filter((q) => q.completed_at !== null).length > 0 && (
                <div>
                  <h3>Frühere Quizze</h3>
                  <ul>
                    {quizzes
                      .filter((q) => q.completed_at !== null)
                      .map((q) => (
                        <li key={q.id}>
                          Quiz vom {q.created_at.slice(0, 10)} — {Math.round((q.score ?? 0) * 100)}% richtig
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ))}

        {activeSection === 'fortschritt' && (
          <ProgressView assessments={assessments} topics={topics} studyBlocks={studyBlocks} from={today} />
        )}

        {activeSection === 'einstellungen' && (
          <>
            <UpdateChecker onCheckNow={checkForUpdate} onInstall={installUpdateAndRestart} />

            <AppearanceSetting theme={theme} onChangeTheme={setTheme} palette={palette} onChangePalette={setPalette} />

            <AiSettings />

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
          </>
        )}
        </main>
      </div>
    </div>
  )
}
