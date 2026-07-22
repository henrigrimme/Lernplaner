-- Migration 0005: Fach-Ordner (Nutzerwunsch 2026-07-22).
--
-- Der Nutzer will Fächer in einer eigenen, frei benannten Baumstruktur
-- gruppieren können (Beispiel: "3. Semester" > "Q1"/"Q2", weil manche
-- Klausuren mehrere Fächer gleichzeitig abdecken und die flache
-- Fach-Liste dafür unübersichtlich wird) — unabhängig vom bereits
-- bestehenden Themenbaum (`topics.parent_id`), der etwas anderes
-- gruppiert (Kapitel innerhalb eines Fachs). Eigene Tabelle statt
-- Wiederverwendung von `courses.parent_id`: ein Ordner selbst ist kein
-- Fach (hat keine Prüfungen/Themen/Priorität/Schwierigkeit), ihn als
-- besonderen "leeren" Fach-Datensatz zu modellieren hätte die ganze
-- courses-Tabelle mit einem semantisch anderen Konzept vermischt.
CREATE TABLE course_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES course_groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_course_groups_parent ON course_groups (parent_id);

-- NULL = kein Ordner, Fach erscheint wie bisher direkt in der
-- obersten Ebene der Seitenleiste (Rückwärtskompatibilität: bestehende
-- Fächer brauchen keinen Ordner zugewiesen zu bekommen).
ALTER TABLE courses ADD COLUMN group_id INTEGER REFERENCES course_groups (id) ON DELETE SET NULL;
