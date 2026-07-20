-- Migration 0001: vollständiges Ausgangsschema.
--
-- Legt bewusst auch Tabellen an, die erst ab Phase 4 (September/Oktober)
-- befüllt werden (cards, reviews, quizzes, questions, answers, paper_steps,
-- annotations) — siehe DATA_MODEL.md, Grundsatz: keine Schema-Änderung mehr
-- ab dem 1. September, wenn echte Daten in der App liegen.
--
-- Ausgeführt wird diese Datei später über tauri-plugin-sql (siehe
-- ARCHITECTURE.md, "data/"). Migrationen sind nummeriert und
-- vorwärtsgerichtet — nie eine bestehende Datei nachträglich ändern,
-- sondern eine neue "000N_*.sql" anlegen.

-- ── Kern ──────────────────────────────────────────────────────────────

CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  semester TEXT NOT NULL,
  color TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('klausur', 'paper', 'praesentation')),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 5),
  format TEXT NOT NULL CHECK (
    format IN ('mc', 'freitext', 'essay', 'rechnen', 'fallstudie', 'open_book', 'mixed')
  ),
  open_book INTEGER NOT NULL DEFAULT 0 CHECK (open_book IN (0, 1)),
  duration_minutes INTEGER
);

CREATE INDEX idx_assessments_course ON assessments (course_id);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN ('folien', 'skript', 'uebung', 'altklausur', 'musterloesung', 'zusammenfassung', 'sonstiges')
  ),
  -- rohe Seitenzahl, echte Folien nach Animationsbereinigung, eindeutiger
  -- Textumfang — Begründung für alle drei: DATA_MODEL.md / ADR-004
  pdf_pages INTEGER NOT NULL,
  slide_count INTEGER NOT NULL,
  unique_chars INTEGER NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_documents_course ON documents (course_id);

CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES topics (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 5),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (
    status IN ('offen', 'in_arbeit', 'sicher', 'uebersprungen')
  ),
  -- true = vom Nutzer bearbeitet, ein Re-Import darf das nie überschreiben
  manual_override INTEGER NOT NULL DEFAULT 0 CHECK (manual_override IN (0, 1))
);

CREATE INDEX idx_topics_course ON topics (course_id);
CREATE INDEX idx_topics_parent ON topics (parent_id);

-- Verbindung Thema <-> Dokumentseiten. Eigene Tabelle statt Fremdschlüssel,
-- weil ein Thema über mehrere Dokumente verteilt sein kann und ein Dokument
-- mehrere Themen enthält (siehe DATA_MODEL.md).
CREATE TABLE topic_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  unique_chars INTEGER NOT NULL,
  slide_count INTEGER NOT NULL
);

CREATE INDEX idx_topic_sections_topic ON topic_sections (topic_id);
CREATE INDEX idx_topic_sections_document ON topic_sections (document_id);

-- ── Zeit und Plan ────────────────────────────────────────────────────

CREATE TABLE availability_pattern (
  weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  minutes INTEGER NOT NULL
);

CREATE TABLE availability_exception (
  date TEXT PRIMARY KEY,
  minutes INTEGER NOT NULL,
  note TEXT
);

CREATE TABLE blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manuell', 'kalender'))
);

-- Die zentrale Tabelle: der Plan *ist* die Menge dieser Blöcke, es gibt
-- kein separates Plan-Objekt (siehe DATA_MODEL.md).
CREATE TABLE study_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER REFERENCES topics (id) ON DELETE CASCADE,
  assessment_id INTEGER REFERENCES assessments (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN ('erstdurchgang', 'wiederholung', 'uebung', 'quiz', 'puffer')
  ),
  planned_date TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  planned_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (
    status IN ('offen', 'erledigt', 'verschoben', 'gestrichen')
  ),
  actual_minutes INTEGER,
  completed_at TEXT,
  -- -1 zu leicht | 0 passend | 1 zu schwer
  difficulty_feedback INTEGER CHECK (difficulty_feedback IN (-1, 0, 1))
);

CREATE INDEX idx_study_blocks_topic ON study_blocks (topic_id);
CREATE INDEX idx_study_blocks_assessment ON study_blocks (assessment_id);
CREATE INDEX idx_study_blocks_date ON study_blocks (planned_date);

-- gelernte Zeitschätzung pro Fach, ADR-004
CREATE TABLE calibration (
  course_id INTEGER PRIMARY KEY REFERENCES courses (id) ON DELETE CASCADE,
  minutes_per_1k_chars REAL NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Historie der Neuberechnungen, erlaubt "zurück zur vorigen Fassung"
CREATE TABLE plan_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reason TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);

-- ── Später befüllt, jetzt schon angelegt (Phase 4) ─────────────────────

CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents (id) ON DELETE SET NULL,
  page INTEGER,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_quote TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_cards_topic ON cards (topic_id);

-- Spaced Repetition, FSRS-Algorithmus
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  due_at TEXT NOT NULL
);

CREATE INDEX idx_reviews_card ON reviews (card_id);
CREATE INDEX idx_reviews_due ON reviews (due_at);

CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  score REAL
);

CREATE INDEX idx_quizzes_course ON quizzes (course_id);

-- source_document_id und source_page sind Pflichtfelder: eine generierte
-- Frage ohne Quellenangabe wird verworfen (siehe DATA_MODEL.md).
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics (id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  source_document_id INTEGER NOT NULL REFERENCES documents (id),
  source_page INTEGER NOT NULL,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5)
);

CREATE INDEX idx_questions_quiz ON questions (quiz_id);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  given TEXT,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answered_at TEXT NOT NULL,
  seconds INTEGER
);

CREATE INDEX idx_answers_question ON answers (question_id);

CREATE TABLE paper_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (
    status IN ('offen', 'in_arbeit', 'erledigt')
  ),
  notes TEXT
);

CREATE INDEX idx_paper_steps_assessment ON paper_steps (assessment_id);

CREATE TABLE annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  rect_json TEXT NOT NULL,
  text TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_annotations_document ON annotations (document_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
