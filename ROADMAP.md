# Roadmap

**Zieltermin: 1. September 2026** — ab dann wird die App im Echtbetrieb genutzt.
Prüfungen im Oktober.

**Aktueller Stand (09.09.2026):** Phasen 1–3 abgeschlossen, seit 01.09 im
Echtbetrieb. Version v0.43.0. Phase 4 läuft (additive Verbesserungen aus der
echten Nutzung). Zuletzt eine autonome Serie: Übungsblatt-Zerlegung
(v0.38.0), Chat mit den Unterlagen (v0.39.0), Übungsblatt+Musterlösung
koppeln (v0.40.0), DE↔EN-Fachglossar fürs Doc-Chat-Retrieval (v0.41.0),
Impeccable-Politur Karteikarten/Übungsblatt-Zerlegung (v0.42.0),
Musterlösungs-Rückseite ohne wiederholte Aufgabe (v0.43.0). Nichts
angefangen — Details in [CONTEXT.md](CONTEXT.md) Abschnitt 8.

---

## Phase 1 — Fundament · 20.07 – 02.08

- [x] Anforderungen, Recherche, Konzept
- [x] Extraktion an drei Fächern validiert
- [x] Repository, `.gitignore`, Sicherheitsdoku
- [x] Tauri-Projekt, Build, Tests, CI
- [x] SQLite-Schema (vollständig, inkl. später genutzter Tabellen)
- [x] PDF-Import mit Textextraktion
- [x] Animationsschritt-Erkennung, an echtem Material abgestimmt
- [x] Kapitelerkennung mit Fuzzy-Normalisierung
- [x] Themenbaum-Ansicht, bearbeitbar

**Ergebnis:** Foliensätze importieren und den Themenbaum prüfen.

---

## Phase 2 — Planung · 03.08 – 16.08

- [x] Fächer, Prüfungen, Verfügbarkeit erfassen
- [x] Aufwandsschätzung nach ADR-004 mit Kalibrierung
- [x] Kapazitätsrechnung mit Defizitwarnung
- [x] Terminierung inkl. mehrerer paralleler Prüfungen
- [x] Planansicht (Woche/Monat)

**Ergebnis:** erster echter Lernplan für Oktober.

---

## Phase 3 — Alltag · 17.08 – 30.08

- [x] Heute-Ansicht mit Timer und Schwierigkeits-Feedback
- [x] Neuberechnung mit Diff-Ansicht
- [x] Fortschrittsanzeige
- [x] Lokale Benachrichtigungen
- [x] Kalender-Export
- [x] PDF-Viewer mit Seitensprung
- [x] Kurs-Export/Import

**Ergebnis: nutzbar.**

---

## 01.09 — Lernbeginn

Ab hier Echtbetrieb. Nur noch additive Änderungen; keine Schema-Änderung ohne
Migration.

---

## Phase 4 — September/Oktober, parallel zur Nutzung

Nach Dringlichkeit aus echter Nutzung, grobe Reihenfolge:

- [ ] Nachschärfen aus dem Alltag — braucht echte Nutzungsdaten, siehe CONTEXT.md
- [x] Markieren im Dokument → Karteikarten
- [x] Spaced Repetition (FSRS)
- [x] Formelextraktion sauber
- [x] Quiz-Generierung
- [x] Probeklausur-Simulation
- [x] Fehlerhistorie → gezielte Wiederholung
- [x] Paper-Workflow
- [x] Altklausur-Analyse → automatische Gewichtung

---

## Später / offen

- E-Mail-Benachrichtigungen (Weg noch offen, siehe CONTEXT.md)
- ~~Chat mit den Unterlagen~~ — erledigt (persistenter Volltext-Index, v0.39.0)
- ~~Übungsblatt-Zerlegung in Einzelaufgaben~~ — erledigt (v0.38.0)
- OCR, Handschrift
- iOS-Version zum Wiederholen unterwegs
