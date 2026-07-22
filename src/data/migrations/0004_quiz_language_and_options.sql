-- Migration 0004: klickbare Multiple-Choice-Antworten + Kurssprache
-- (Nutzerwunsch 2026-07-22).
--
-- `questions.options`: JSON-Array der Antwortoptionen bei
-- `type = 'mc'` (z. B. '["4","5","6","7"]'), NULL bei Freitext-Fragen
-- oder bei vor dieser Änderung erzeugten MC-Fragen (Optionen steckten
-- vorher als Text in `prompt`, siehe `ai/types.ts` `QuestionSuggestion`-
-- Kommentar) — `ui/QuizSession.tsx` fällt für NULL auf das alte
-- Texteingabefeld zurück, kein Datenverlust bei bestehenden Fragen.
ALTER TABLE questions ADD COLUMN options TEXT;

-- `courses.language`: bestimmt, in welcher Sprache KI-generierte Inhalte
-- für dieses Fach entstehen (Quiz-Fragen, Zusammenfassungs-Themenerkennung,
-- Altklausur-Analyse) — Vorlesungssprache ist laut CONTEXT.md „Nutzer"
-- ohnehin Englisch, muss aber pro Fach wählbar bleiben (Mathe-Kurse etc.
-- auf Deutsch, siehe „Analyse: Beispiel-PDFs"). Die App-Oberfläche selbst
-- (Planung, Kalender, Menüs) bleibt unabhängig davon Deutsch — das ist
-- keine Übersetzungsfunktion, nur ein Hinweis an die KI-Prompts.
-- DEFAULT 'de': bestehende Fächer vor dieser Migration ändern ihr
-- bisheriges (ausschließlich deutschsprachiges) KI-Verhalten nicht.
ALTER TABLE courses ADD COLUMN language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de', 'en'));
