# Datenmodell

SQLite, lokal unter `~/Library/Application Support/Lernplaner/lernplaner.db`.

**Grundsatz:** Das Schema wird **vollständig** angelegt — auch Tabellen für
Funktionen, die erst ab Oktober kommen. Ab dem 1. September liegen echte Daten
in der App; eine Migration mitten in der Prüfungsphase wäre die schlechteste
denkbare Störung.

---

## Kern

```sql
courses
  id, name, semester, color, priority (1–5), difficulty (1–5),
  archived, created_at

assessments                    -- Klausur, Paper, Präsentation
  id, course_id, type, title, date, weight,
  format,                      -- mc | freitext | essay | rechnen |
                               -- fallstudie | open_book | mixed
  open_book, duration_minutes

documents
  id, course_id, filename, stored_path, sha256,
  doc_type,                    -- folien | skript | uebung | altklausur |
                               -- musterloesung | zusammenfassung | sonstiges
  pdf_pages,                   -- rohe Seitenzahl
  slide_count,                 -- echte Folien nach Animationsbereinigung
  unique_chars,                -- eindeutiger Textumfang → Basis der Schätzung
  imported_at

topics
  id, course_id, parent_id, name, normalized_name,
  weight (1–5), difficulty (1–5), sort_order,
  status,                      -- offen | in_arbeit | sicher | uebersprungen
  manual_override              -- true = vom Nutzer bearbeitet, nie überschreiben

topic_sections                 -- Verbindung Thema ↔ Dokumentseiten
  id, topic_id, document_id, page_start, page_end, unique_chars, slide_count
```

**Warum `documents` drei Umfangsmaße hat:** `pdf_pages` ist die rohe Seitenzahl,
`slide_count` die Zahl echter Folien nach Entfernung von Animationsschritten,
`unique_chars` der eindeutige Textumfang. Nur die letzten beiden gehen in die
Aufwandsschätzung ein — die Seitenzahl allein ist unbrauchbar
([ADR-004](DECISIONS.md)).

**Warum `topic_sections` eine eigene Tabelle ist:** Ein Thema kann über mehrere
Dokumente verteilt sein (Folien + Übungsblatt + Altklausur), ein Dokument
mehrere Themen enthalten. Eine direkte Fremdschlüsselbeziehung würde beides
verhindern.

**Warum `manual_override` existiert:** Sobald jemand ein Thema von Hand
umbenennt, verschiebt oder gewichtet, darf kein Re-Import das überschreiben.
Ohne dieses Flag wäre jede Korrektur beim nächsten Import verloren — und die
App damit unbrauchbar.

---

## Zeit und Plan

```sql
availability_pattern           -- Wochenmuster
  weekday (0–6), minutes

availability_exception         -- einzelne abweichende Tage
  date, minutes, note

blockers                       -- Vorlesungen, Termine
  id, starts_at, ends_at, title, source   -- manuell | kalender

study_blocks                   -- die geplanten Lerneinheiten
  id, topic_id, assessment_id,
  kind,                        -- erstdurchgang | wiederholung | uebung |
                               -- quiz | puffer
  planned_date, planned_minutes, planned_order,
  status,                      -- offen | erledigt | verschoben | gestrichen
  actual_minutes, completed_at,
  difficulty_feedback          -- -1 zu leicht | 0 passend | 1 zu schwer

calibration                    -- gelernte Zeitschätzung, pro Fach
  course_id, minutes_per_1k_chars, sample_count, updated_at

plan_versions                  -- Historie der Neuberechnungen
  id, created_at, reason, snapshot_json
```

`study_blocks` ist die zentrale Tabelle. **Der Plan *ist* die Menge dieser
Blöcke** — es gibt kein separates Plan-Objekt.

`plan_versions` erlaubt „zurück zur vorigen Fassung", wenn eine Neuberechnung
schlechter war als der Ausgangszustand.

---

## KI-Nutzung

```sql
ai_usage                       -- Protokoll jedes KI-Aufrufs
  id, occurred_at, provider, operation,
  input_tokens, output_tokens, cost_eur
```

Grundlage für die Budget-Benachrichtigung (ADR-007): Jeder Nutzer setzt sein
eigenes monatliches Limit selbst, in `settings` unter `ai_budget_limit_eur`.
Beim Überschreiten wird benachrichtigt, nie gesperrt — und zwar erneut bei
jedem weiteren erreichten Vielfachen des Limits. Damit das nicht bei jedem
einzelnen Aufruf zwischen zwei Schwellenwerten erneut auslöst, merkt sich
`settings` zusätzlich, bis wohin schon benachrichtigt wurde:
`ai_budget_last_notified_month` (z. B. `"2026-08"`),
`ai_budget_last_notified_multiple` (z. B. `1` = einmal benachrichtigt,
`2` = zweimal). Bei neuem Monat wird implizit wieder bei 0 angefangen, weil
`ai_budget_last_notified_month` dann nicht mehr zum aktuellen Monat passt.

Die tatsächliche Monatssumme ist ein abgeleiteter Wert (Summe von `cost_eur`
aus `ai_usage` für den laufenden Monat) — nicht separat gespeichert, siehe
„Abgeleitete Werte" unten.

---

## Später befüllt, jetzt schon angelegt

```sql
cards                          -- Karteikarten
  id, topic_id, document_id, page, front, back, source_quote, created_at

reviews                        -- Spaced Repetition (FSRS)
  id, card_id, reviewed_at, rating, stability, difficulty, due_at

quizzes
  id, course_id, config_json, created_at, completed_at, score

questions
  id, quiz_id, topic_id, type, prompt, answer, explanation,
  source_document_id, source_page, difficulty

answers
  id, question_id, given, correct, answered_at, seconds

paper_steps                    -- Teilschritte für Abgaben
  id, assessment_id, title, due_date, status, notes

annotations                    -- Markierungen im Dokument
  id, document_id, page, rect_json, text, note, created_at

settings
  key, value
```

`questions` trägt `source_document_id` und `source_page` als **Pflichtfelder** —
eine generierte Frage ohne Quellenangabe wird verworfen. Ohne Beleg lässt sich
ein Fehler nicht nachvollziehen, und das untergräbt den Zweck.

---

## Abgeleitete Werte

Nicht gespeichert, sondern berechnet:

| Wert | Formel |
|---|---|
| `mastery` je Thema | aus `study_blocks` (erledigt, Feedback) + später `answers` |
| Vorbereitungsgrad je Prüfung | Σ(mastery × weight) / Σ(weight) |
| Nächster Schritt | max(weight × (1 − mastery)) |
| Kapazitätsdeckung | (verfügbar − Puffer) / benötigt |
| KI-Ausgaben laufender Monat | Σ(`cost_eur`) aus `ai_usage`, Monat = aktueller Monat |

Speichern würde Inkonsistenzen erzeugen, sobald ein Block nachträglich geändert
wird.
