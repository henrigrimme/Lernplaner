import type { Assessment, Course, StudyBlock, Topic, TopicSection } from './schema'

/**
 * Kurs-Export/Import (ROADMAP.md Phase 3; CONTEXT.md „Anforderungen":
 * „Austausch: Kurs-Export als Datei"; SECURITY.md: „Der Kurs-Export … ist
 * die einzige Möglichkeit, Arbeit zu sichern" — dient also sowohl dem
 * Austausch zwischen den beiden Nutzern als auch als einziges Backup,
 * bewusst ohne Cloud/Sync (siehe CONTEXT.md „Bewusst nicht übernommen").
 * Reine Funktionen, keine Systemuhr, kein Dateizugriff (der liegt in
 * `ui/CourseExportImport.tsx` — Browser-Download/-Upload, kein
 * `tauri-plugin-fs` vor dem echten Rahmen).
 *
 * **Bewusst NICHT im Export enthalten:** die PDF-Dateien selbst.
 * SECURITY.md ist eindeutig: „Unterlagen … sind urheberrechtlich geschützt
 * und ihre Weitergabe ist häufig ausdrücklich untersagt — auch in einem
 * privaten Repository" — das gilt für den Kurs-Export genauso wie fürs
 * Repository. `topic_sections.document_id` bleibt als reine Zahl
 * erhalten (keine Dokumenten-Metadaten im Bundle, siehe unten), zeigt nach
 * dem Import ins Leere — `ui/SourceViewer.tsx` behandelt fehlende PDF-Bytes
 * bereits als regulären Fall, kein Absturz.
 *
 * **Bewusst NICHT im Export enthalten (zweiter Grund):** `documents`
 * selbst — `App.tsx` hält aktuell keine `Document[]`-Liste im Zustand
 * (nur `topics`/`topicSections`), das Nachziehen wäre eine eigene
 * Erweiterung, kein Teil dieses Schritts. `plan_versions`, `calibration`,
 * `ai_usage`, `settings` ebenfalls nicht: Verlaufs-/Kalibrierungsdaten, die
 * nach einem ID-Remapping beim Import ohnehin nicht mehr sinnvoll wären
 * bzw. rein lokal/persönlich sind (Kalibrierung ist eine individuelle
 * Lerngeschwindigkeit, kein Kurs-Attribut, das sich sinnvoll teilen ließe).
 *
 * **`study_blocks` bewusst enthalten** — das ist die tatsächliche „Arbeit"
 * aus SECURITY.md (geplante/erledigte Sitzungen samt Feedback), nicht nur
 * Kursstruktur. Beim Import werden alle Fremdschlüssel auf neue lokale IDs
 * umgeschrieben (siehe `importCourse`).
 *
 * **Bewusst einfach:** Import legt immer ein **neues** Fach an, auch wenn
 * lokal schon eines mit demselben Namen existiert — kein Zusammenführen/
 * Konfliktauflösung. Analog zu `materializeStudyBlocks`s „bewusst einfach"
 * an anderer Stelle: ein Merge wäre eine eigene, größere Entscheidung.
 */

export const COURSE_EXPORT_VERSION = 1

export interface CourseExportBundle {
  version: typeof COURSE_EXPORT_VERSION
  exportedAt: string
  course: Course
  topics: Topic[]
  topicSections: TopicSection[]
  assessments: Assessment[]
  studyBlocks: StudyBlock[]
}

/** Baut das Export-Bundle für ein einzelnes Fach aus dem aktuellen Zustand. */
export function exportCourse(
  courseId: number,
  courses: Course[],
  topics: Topic[],
  topicSections: TopicSection[],
  assessments: Assessment[],
  studyBlocks: StudyBlock[],
  exportedAt: string,
): CourseExportBundle {
  const course = courses.find((c) => c.id === courseId)
  if (!course) throw new Error(`Kein Fach mit id ${courseId} gefunden`)

  const courseTopics = topics.filter((t) => t.course_id === courseId)
  const topicIds = new Set(courseTopics.map((t) => t.id))
  const courseSections = topicSections.filter((s) => topicIds.has(s.topic_id))

  const courseAssessments = assessments.filter((a) => a.course_id === courseId)
  const assessmentIds = new Set(courseAssessments.map((a) => a.id))
  const courseStudyBlocks = studyBlocks.filter((b) => b.assessment_id !== null && assessmentIds.has(b.assessment_id))

  return {
    version: COURSE_EXPORT_VERSION,
    exportedAt,
    course,
    topics: courseTopics,
    topicSections: courseSections,
    assessments: courseAssessments,
    studyBlocks: courseStudyBlocks,
  }
}

export function serializeCourseExport(bundle: CourseExportBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/** Wirft, wenn `json` kein erkennbares Kurs-Export-Bundle ist (fehlendes/unbekanntes `version`-Feld). */
export function deserializeCourseExport(json: string): CourseExportBundle {
  const parsed: unknown = JSON.parse(json)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== COURSE_EXPORT_VERSION
  ) {
    throw new Error('Unbekanntes oder fehlendes Export-Format')
  }
  return parsed as CourseExportBundle
}

export interface ExistingState {
  courses: Course[]
  topics: Topic[]
  topicSections: TopicSection[]
  assessments: Assessment[]
  studyBlocks: StudyBlock[]
}

export interface ImportedCourseResult extends ExistingState {
  /** Die id, unter der das importierte Fach jetzt lokal geführt wird. */
  newCourseId: number
}

function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/**
 * Übernimmt ein Export-Bundle in den lokalen Zustand — immer als neues
 * Fach (siehe Modul-Kommentar „Bewusst einfach"). Schreibt allen
 * enthaltenen Zeilen neue, an den lokalen Bestand anknüpfende IDs und
 * schreibt jeden Fremdschlüssel entsprechend um (`course_id`, `topic_id`,
 * `parent_id`, `assessment_id`).
 */
export function importCourse(bundle: CourseExportBundle, existing: ExistingState): ImportedCourseResult {
  if (bundle.version !== COURSE_EXPORT_VERSION) {
    throw new Error(`Nicht unterstützte Export-Version: ${bundle.version}`)
  }

  const newCourseId = nextId(existing.courses)
  const newCourse: Course = { ...bundle.course, id: newCourseId }

  let nextTopicId = nextId(existing.topics)
  const topicIdMap = new Map<number, number>()
  const remappedTopicsFirstPass = bundle.topics.map((t) => {
    const newId = nextTopicId++
    topicIdMap.set(t.id, newId)
    return { ...t, id: newId, course_id: newCourseId }
  })
  // Zweiter Durchgang: parent_id kann auf ein Thema verweisen, das im
  // Bundle-Array erst später vorkommt — die Map ist da vollständig befüllt.
  const newTopics: Topic[] = remappedTopicsFirstPass.map((t) => ({
    ...t,
    parent_id: t.parent_id === null ? null : (topicIdMap.get(t.parent_id) ?? null),
  }))

  let nextSectionId = nextId(existing.topicSections)
  const newSections: TopicSection[] = bundle.topicSections.map((s) => ({
    ...s,
    id: nextSectionId++,
    topic_id: topicIdMap.get(s.topic_id) ?? s.topic_id,
  }))

  let nextAssessmentId = nextId(existing.assessments)
  const assessmentIdMap = new Map<number, number>()
  const newAssessments: Assessment[] = bundle.assessments.map((a) => {
    const newId = nextAssessmentId++
    assessmentIdMap.set(a.id, newId)
    return { ...a, id: newId, course_id: newCourseId }
  })

  let nextBlockId = nextId(existing.studyBlocks)
  const newStudyBlocks: StudyBlock[] = bundle.studyBlocks.map((b) => ({
    ...b,
    id: nextBlockId++,
    topic_id: b.topic_id === null ? null : (topicIdMap.get(b.topic_id) ?? null),
    assessment_id: b.assessment_id === null ? null : (assessmentIdMap.get(b.assessment_id) ?? null),
  }))

  return {
    courses: [...existing.courses, newCourse],
    topics: [...existing.topics, ...newTopics],
    topicSections: [...existing.topicSections, ...newSections],
    assessments: [...existing.assessments, ...newAssessments],
    studyBlocks: [...existing.studyBlocks, ...newStudyBlocks],
    newCourseId,
  }
}
