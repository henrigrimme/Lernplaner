# Roadmap

**Zieltermin: 1. September 2026** — ab dann wird die App im Echtbetrieb genutzt.
Prüfungen im Oktober.

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
- [ ] Neuberechnung mit Diff-Ansicht — Domain-Logik fertig (`domain/replanning.ts`, ADR-005), noch keine UI/DB-Anbindung, siehe CONTEXT.md Abschnitt 8
- [ ] Fortschrittsanzeige
- [ ] Lokale Benachrichtigungen
- [ ] Kalender-Export
- [ ] PDF-Viewer mit Seitensprung
- [ ] Kurs-Export/Import

**Ergebnis: nutzbar.**

---

## 01.09 — Lernbeginn

Ab hier Echtbetrieb. Nur noch additive Änderungen; keine Schema-Änderung ohne
Migration.

---

## Phase 4 — September/Oktober, parallel zur Nutzung

Nach Dringlichkeit aus echter Nutzung, grobe Reihenfolge:

- [ ] Nachschärfen aus dem Alltag
- [ ] Markieren im Dokument → Karteikarten
- [ ] Spaced Repetition (FSRS) — Recherche bereits gemacht, siehe CONTEXT.md Abschnitt 8 „Recherche: Spaced Repetition (für Phase 4)"
- [ ] Formelextraktion sauber
- [ ] Quiz-Generierung
- [ ] Probeklausur-Simulation
- [ ] Fehlerhistorie → gezielte Wiederholung
- [ ] Paper-Workflow
- [ ] Altklausur-Analyse → automatische Gewichtung

---

## Später / offen

- E-Mail-Benachrichtigungen (Weg noch offen, siehe CONTEXT.md)
- Chat mit den Unterlagen
- Übungsblatt-Zerlegung in Einzelaufgaben
- OCR, Handschrift
- iOS-Version zum Wiederholen unterwegs
