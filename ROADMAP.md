# Roadmap

**Zieltermin: 1. September 2026** — ab dann wird die App im Echtbetrieb genutzt.
Prüfungen im Oktober.

---

## Phase 1 — Fundament · 20.07 – 02.08

- [x] Anforderungen, Recherche, Konzept
- [x] Extraktion an drei Fächern validiert
- [x] Repository, `.gitignore`, Sicherheitsdoku
- [ ] Tauri-Projekt, Build, Tests, CI
- [ ] SQLite-Schema (vollständig, inkl. später genutzter Tabellen)
- [ ] PDF-Import mit Textextraktion
- [ ] Animationsschritt-Erkennung, an echtem Material abgestimmt
- [ ] Kapitelerkennung mit Fuzzy-Normalisierung
- [ ] Themenbaum-Ansicht, bearbeitbar

**Ergebnis:** Foliensätze importieren und den Themenbaum prüfen.

---

## Phase 2 — Planung · 03.08 – 16.08

- [ ] Fächer, Prüfungen, Verfügbarkeit erfassen
- [ ] Aufwandsschätzung nach ADR-004 mit Kalibrierung
- [ ] Kapazitätsrechnung mit Defizitwarnung
- [ ] Terminierung inkl. mehrerer paralleler Prüfungen
- [ ] Planansicht (Woche/Monat)

**Ergebnis:** erster echter Lernplan für Oktober.

---

## Phase 3 — Alltag · 17.08 – 30.08

- [ ] Heute-Ansicht mit Timer und Schwierigkeits-Feedback
- [ ] Neuberechnung mit Diff-Ansicht
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
- [ ] Spaced Repetition (FSRS)
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
