/**
 * Zeilentypen des SQLite-Schemas (siehe `migrations/0001_init.sql` und
 * DATA_MODEL.md). Reine Typdeklarationen ohne Laufzeitlogik — die
 * eigentliche Datenbankanbindung kommt erst mit dem Tauri-Rahmen
 * (`tauri-plugin-sql`, siehe ARCHITECTURE.md).
 *
 * SQLite kennt kein natives Boolean — Spalten mit `CHECK (x IN (0,1))`
 * werden hier als `0 | 1` typisiert, nicht als `boolean`, damit der Typ zur
 * tatsächlich gespeicherten Repräsentation passt.
 */

export type Bit = 0 | 1

export interface Course {
  id: number
  name: string
  semester: string
  color: string
  priority: 1 | 2 | 3 | 4 | 5
  difficulty: 1 | 2 | 3 | 4 | 5
  archived: Bit
  created_at: string
}

export type AssessmentType = 'klausur' | 'paper' | 'praesentation'
export type AssessmentFormat =
  | 'mc'
  | 'freitext'
  | 'essay'
  | 'rechnen'
  | 'fallstudie'
  | 'open_book'
  | 'mixed'

export interface Assessment {
  id: number
  course_id: number
  type: AssessmentType
  title: string
  date: string
  weight: 1 | 2 | 3 | 4 | 5
  format: AssessmentFormat
  open_book: Bit
  duration_minutes: number | null
}

export type DocumentType =
  | 'folien'
  | 'skript'
  | 'uebung'
  | 'altklausur'
  | 'musterloesung'
  | 'zusammenfassung'
  | 'sonstiges'

export interface Document {
  id: number
  course_id: number
  filename: string
  stored_path: string
  sha256: string
  doc_type: DocumentType
  pdf_pages: number
  slide_count: number
  unique_chars: number
  imported_at: string
}

export type TopicStatus = 'offen' | 'in_arbeit' | 'sicher' | 'uebersprungen'

export interface Topic {
  id: number
  course_id: number
  parent_id: number | null
  name: string
  normalized_name: string
  weight: 1 | 2 | 3 | 4 | 5
  difficulty: 1 | 2 | 3 | 4 | 5
  sort_order: number
  status: TopicStatus
  manual_override: Bit
}

export interface TopicSection {
  id: number
  topic_id: number
  document_id: number
  page_start: number
  page_end: number
  unique_chars: number
  slide_count: number
}

export interface AvailabilityPattern {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  minutes: number
}

export interface AvailabilityException {
  date: string
  minutes: number
  note: string | null
}

export interface Blocker {
  id: number
  starts_at: string
  ends_at: string
  title: string
  source: 'manuell' | 'kalender'
}

export type StudyBlockKind =
  | 'erstdurchgang'
  | 'wiederholung'
  | 'uebung'
  | 'quiz'
  | 'puffer'
export type StudyBlockStatus = 'offen' | 'erledigt' | 'verschoben' | 'gestrichen'

export interface StudyBlock {
  id: number
  topic_id: number | null
  assessment_id: number | null
  kind: StudyBlockKind
  planned_date: string
  planned_minutes: number
  planned_order: number
  status: StudyBlockStatus
  actual_minutes: number | null
  completed_at: string | null
  /** -1 zu leicht | 0 passend | 1 zu schwer */
  difficulty_feedback: -1 | 0 | 1 | null
}

export interface Calibration {
  course_id: number
  minutes_per_1k_chars: number
  sample_count: number
  updated_at: string
}

export interface PlanVersion {
  id: number
  created_at: string
  reason: string
  snapshot_json: string
}

export interface Card {
  id: number
  topic_id: number
  document_id: number | null
  page: number | null
  front: string
  back: string
  source_quote: string | null
  created_at: string
}

export interface Review {
  id: number
  card_id: number
  reviewed_at: string
  rating: number
  stability: number
  difficulty: number
  due_at: string
}

export interface Quiz {
  id: number
  course_id: number
  config_json: string
  created_at: string
  completed_at: string | null
  score: number | null
}

export interface Question {
  id: number
  quiz_id: number
  topic_id: number | null
  type: string
  prompt: string
  answer: string
  explanation: string | null
  /** Pflichtfeld — eine Frage ohne Quellenbeleg wird verworfen. */
  source_document_id: number
  /** Pflichtfeld — siehe `source_document_id`. */
  source_page: number
  difficulty: 1 | 2 | 3 | 4 | 5 | null
}

export interface Answer {
  id: number
  question_id: number
  given: string | null
  correct: Bit
  answered_at: string
  seconds: number | null
}

export type PaperStepStatus = 'offen' | 'in_arbeit' | 'erledigt'

export interface PaperStep {
  id: number
  assessment_id: number
  title: string
  due_date: string | null
  status: PaperStepStatus
  notes: string | null
}

export interface Annotation {
  id: number
  document_id: number
  page: number
  rect_json: string
  text: string | null
  note: string | null
  created_at: string
}

export interface Setting {
  key: string
  value: string
}
