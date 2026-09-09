-- Migration 0008: Persistenter Volltext-Index je Dokumentseite
-- (Nutzerwunsch 09.09.2026: „Chat mit den Unterlagen" — Sven soll im
-- Lern-Chat mit Seitenverweis aus den echten Unterlagen antworten können).
--
-- Bisher wurde der eigentliche Dokumentinhalt nirgends dauerhaft
-- gespeichert (siehe `domain/search.ts`-Kommentar „bewusst keine
-- Volltextsuche"): Text wurde nur transient beim Import bzw. bei der
-- Quiz-Generierung aus den PDF-Bytes gelesen. Für den Chat mit den
-- Unterlagen wäre das bei jeder Frage erneut nötig — für alle Dokumente,
-- über alle Fächer. Deshalb hier ein einmal befüllter Index: eine Zeile
-- je (Dokument, Seite) mit dem reinen Seitentext.
--
-- Granularität „Seite" (nicht „Dokument am Stück"), damit die
-- Retrieval-Treffer eine konkrete Seitenzahl fürs Zitat tragen — dieselbe
-- Logik wie bei `topic_sections.page_start`/`questions.source_page`. Bei
-- Formaten ohne echte Seiten (Word/Markdown/CSV) ist `page` der
-- 1-basierte Abschnitts-/Folienindex aus der jeweiligen Extraktion.
--
-- `ON DELETE CASCADE`: wird ein Dokument entfernt, verschwindet sein
-- Index automatisch mit. Kein `AUTOINCREMENT`-`id` — (document_id, page)
-- ist ein natürlicher, eindeutiger Schlüssel, und der Index wird
-- blockweise je Dokument geschrieben/ersetzt, nie einzeln referenziert.
CREATE TABLE document_pages (
  document_id INTEGER NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (document_id, page)
);

CREATE INDEX idx_document_pages_document ON document_pages (document_id);
