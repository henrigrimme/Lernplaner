# CONTEXT

Dauerhafte Wissensbasis des Projekts. Wer neu einsteigt (oder in einem neuen
Chat weitermacht), liest **zuerst Abschnitt 8 „Stand"** — dort steht exakt,
wo die Arbeit steht und was der nächste Schritt ist.

> ## ⚠️ Regel: Diese Datei wird nach JEDEM Arbeitsschritt aktualisiert
>
> Nicht nur bei Phasenwechseln. Nach jeder Datei, jedem Test, jedem Befund —
> bevor zur nächsten Aufgabe übergegangen wird, wird Abschnitt 8 („Stand")
> nachgeführt: was fertig ist, was gerade untersucht wird, was der exakte
> nächste Schritt ist, und alle Zwischenergebnisse, die sonst verloren gingen.
>
> Grund: Der Nutzer möchte jederzeit in einem **neuen Chat** weiterarbeiten
> können, ohne Kontext zu verlieren. Diese Datei ist die einzige Brücke
> zwischen Chats — was hier nicht steht, ist beim nächsten Neustart weg.
> Lieber zu oft aktualisieren als zu selten.
>
> **Zusätzlich:** Änderungen werden automatisch committet, nach jedem
> abgeschlossenen Schritt — auch Zwischenstände (`wip:`-Präfix), auf dem
> jeweiligen Feature-Branch. Das ist ein Sicherheitsnetz gegen Datenverlust,
> nicht der Mechanismus fürs Fortsetzen in neuen Chats — dafür ist diese
> Datei da, unabhängig vom Commit-Stand. Beim Merge nach `main` wird
> gesquasht, damit die Hauptlinie sauber bleibt. Details in
> [CONTRIBUTING.md](CONTRIBUTING.md) → „Commits".

**Letzte Aktualisierung:** 20. Juli 2026, laufende Session (Phase 1)

---

## 1. Vision

Eine Lernplanungs-App, die Vorlesungsmaterial **inhaltlich versteht** und daraus
einen realistischen, sich selbst anpassenden Lernplan erzeugt.

Der Markt teilt sich in zwei Lager: Werkzeuge, die Inhalte verstehen aber nicht
planen können (NotebookLM, Knowt, StudySmarter), und Werkzeuge, die planen aber
die Inhalte nicht kennen (Motion, Reclaim, Sunsama, Shovel). **Dazwischen ist
die Lücke, die dieses Projekt füllt.**

Kein Produkt, keine Veröffentlichung, kein MVP-Denken. Zwei Nutzer, ein Zweck.

---

## 2. Nutzer

Zwei WHU-Studenten im selben Studiengang, teils gleiche, teils verschiedene
Kurse. Beide auf MacBooks mit Apple Silicon.

### Lerngewohnheiten

- **Bis zu 5 Klausuren parallel**, über wenige Tage verteilt
- Vorbereitungszeit typischerweise **4 Wochen**
- Prüfungsformate stark fachabhängig: reine MC, reine Freitext, Mischformen,
  dazu Paper-Module
- Materialien sind praktisch **ausschließlich PDF**
- Unterrichtssprache Englisch

### Nächster Zyklus

| | |
|---|---|
| Lernbeginn | **1. September 2026** |
| Prüfungen | Oktober 2026 |

---

## 3. Anforderungen

### Bestätigt

| Thema | Entscheidung |
|---|---|
| Plattform | macOS, cross-platform akzeptabel |
| Dateiformate | nur PDF |
| Synchronisierung | **keine** — alles lokal |
| Backups | **keine** — bewusst |
| Austausch | Kurs-Export als Datei |
| KI | externe API erlaubt, Material darf übertragen werden |
| Budget | 10–15 €/Monat (tatsächlich nötig: < 1 €) |
| Lokales Modell | nicht erforderlich |
| Benachrichtigungen | Tagesübersicht + Fälligkeiten; **E-Mail gewünscht** |
| Übungsblätter | grobe Ebene („Blatt 4, ~90 min"), keine Aufgabenzerlegung |

Im Oktober stehen **sowohl Klausuren als auch Paper-Abgaben** an (bestätigt).
Das Datenmodell bildet beides über `assessments.type` ab; der Planer muss
Paper-Teilschritte (`paper_steps`) von Anfang an mitdenken, auch wenn der
Paper-Workflow erst in Phase 4 ausgebaut wird.

### Offen

- Konkrete Prüfungstermine im Oktober (Anzahl noch unklar)
- Anzahl und Fristen der Paper-Abgaben im Oktober (Existenz bestätigt, Details offen)
- Ob E-Mail-Benachrichtigungen zusätzlich zum Kalender-Export nötig sind
  (siehe offene Fragen unten)

### Zugriff

Zweiter Nutzer: `theodorklink` auf GitHub — wird als Collaborator mit
Schreibrechten eingetragen, sobald das Repository angelegt ist.

---

## 4. Erkenntnisse aus der Materialanalyse

Getestet an echtem Material aus **drei Fächern** (Microeconomics,
Entrepreneurial Transformation, Money & Banking), insgesamt 355 PDF-Seiten.

### Was gut funktioniert

**Titelerkennung: 85–98 %** über alle drei Fächer. Der größte Schriftgrad im
oberen Seitendrittel ist ein zuverlässiges Signal.

**Kapitelstruktur ist im Material vorhanden** — und zwar je nach Fach
unterschiedlich:

- *Microeconomics*: Kapitelzeile unter jedem Folientitel
  (`Consumer Theory - Utility`)
- *Money & Banking*: nummerierte Kapitel-Trennfolien plus eine „Roadmap"-Folie
- *Entrepreneurial Transformation*: Session-Struktur über Dateinamen

Die Grobstruktur entsteht damit **ohne KI** — deterministisch und nachprüfbar.

**Keine rein grafischen Folien.** Jede Seite trägt verwertbaren Text.

### Was Probleme macht

**Animationsschritte blähen die Seitenzahl auf.** Jede Einblendung ist eine
eigene PDF-Seite, in stark schwankendem Ausmaß (1,10× bis 2,21× je nach Fach).
Das hat die ursprüngliche Aufwandsformel widerlegt → siehe
[ADR-004](DECISIONS.md).

**Uneinheitliche Kapitelnamen** — `Consumer Theory - Utility` vs.
`Consumer Theory – Utility` (Gedankenstrich), `Budget Constraint` vs.
`Budget Constraints`. Braucht Normalisierung mit Fuzzy-Zusammenführung.

**Formelextraktion ist unsauber.** PowerPoint-Formelzeichen werden doppelt
ausgegeben (`𝑢𝑢(𝑥𝑥)`), Indizes lösen sich von der Basis, Wortabstände fehlen an
Schriftwechseln. Alle drei Probleme sind lösbar, aber echte Arbeit.

**Relevant für die Reihenfolge:** Was heute schon funktioniert (Struktur,
Umfang, Themenzuordnung) ist genau das, was die **Planung** braucht. Was noch
nicht funktioniert (Formeln) braucht erst die **Quizgenerierung**. Deshalb
Planung zuerst.

---

## 5. Recherche — Kurzfassung

Untersucht: KI-Lernassistenten, Lernplaner, Spaced-Repetition-Systeme,
Auto-Scheduling-Tools, Prüfungssimulatoren, Wissensmanagement.

### Kernbefund

Kein Produkt verbindet Inhaltsverständnis mit echter Zeitplanung. Am nächsten
kommt **Shovel** (Aufwand aus Umfang, Kapazitätsabgleich) — liest die PDFs aber
nicht, sondern verlangt manuelle Eingabe.

### Übernommen

| Idee | Herkunft |
|---|---|
| Umfangsbasierte Zeitschätzung, Kapazitätsabgleich | Shovel |
| Automatische Neuplanung bei Verzug | Motion, Reclaim |
| Ruhiger Ton, kein Druck | Sunsama |
| Quellengebundene Antworten mit Seitenverweis | NotebookLM |
| FSRS als Wiederholungsalgorithmus | Anki |

### Bewusst nicht übernommen

Gamification, Streaks, Bestenlisten (Gizmo-Richtung) — bei zwei Nutzern Ballast.
Zwei-Wege-Kalendersync — bekannte Fehlerquelle.

### Warum Lernplaner scheitern

Die Kritik ist über alle Quellen hinweg einheitlich: Apps werden eingerichtet,
vier Tage benutzt und dann fallengelassen; starre Pläne scheitern am
Studentenalltag; Reibung beim Eintragen entscheidet über Weiternutzung.

**Daraus abgeleitet, nicht verhandelbar:**

1. Die Heute-Ansicht muss in **unter fünf Sekunden** Auskunft geben
2. Umplanung **schlägt vor**, diktiert nie ([ADR-005](DECISIONS.md))
3. **Höchstens zwei Benachrichtigungen** pro Tag

---

## 6. Technische Entscheidungen

Vollständig in [DECISIONS.md](DECISIONS.md). Kurz:

| | |
|---|---|
| Stack | Tauri 2 + TypeScript/React + SQLite |
| PDF | `pdf.js` für Extraktion und Anzeige |
| KI | Gemini Flash-Lite, Anbieter austauschbar |
| Sync | keine |
| Kalender | einseitiger Export |

---

## 7. Coding-Konventionen

**Schichtentrennung ist die wichtigste Regel:**

```
src/
  ui/          React — keine Geschäftslogik
  domain/      Planung, Schätzung, Fortschritt — reine Funktionen,
               kennt weder DB noch UI noch KI
  data/        SQLite, Migrationen
  ingest/      PDF-Extraktion, Strukturerkennung
  ai/          KI hinter einer Schnittstelle
  platform/    Benachrichtigungen, Dateisystem, Kalender
```

`domain/` muss ohne laufende App testbar sein. Der Planungsalgorithmus wird
gegen erfundene Szenarien getestet — insbesondere „fünf Klausuren, zu wenig
Zeit", weil genau das im Oktober zählt.

Weiter: TypeScript strict, keine Geheimnisse im Code, kleine Commits mit
aussagekräftigen Nachrichten, keine Force-Pushes, Feature-Branches mit PR.

---

## 8. Stand

**Phase 1 — Fundament, begonnen 20.07.2026. Aktiver Branch:
`feat/ingest-pipeline`.**

### Erledigt

- Anforderungen geklärt, Recherche abgeschlossen, Konzept freigegeben
- Extraktion an drei Fächern validiert (Microeconomics, Entrepreneurial
  Transformation, Money & Banking — 355 PDF-Seiten)
- Aufwandsformel korrigiert (ADR-004: eindeutige Zeichen statt Seitenzahl)
- Repository angelegt, privat, `henrigrimme/Lernplaner` auf GitHub
- `theodorklink` als Collaborator (Schreibrechte) eingetragen
- Projektgrundlage gemerged auf `main` (PR #1): `.gitignore`, `.env.example`,
  `CONTEXT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `DECISIONS.md`,
  `ROADMAP.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Node-Projekt aufgesetzt: `package.json`, `tsconfig.json` (strict),
  `vite.config.ts`, Abhängigkeiten installiert (`pdfjs-dist`, React, Vitest,
  tsx u. a.)
- Import-Pipeline in TypeScript geschrieben:
  - `src/ingest/types.ts` — Typen (`Page`, `Slide`, `Chapter`,
    `ExtractedDocument`, `BodyLine` — neu, trägt Position …)
  - `src/ingest/extract.ts` — Zeilenbildung aus pdf.js-Fragmenten (jetzt
    inkl. `x`-Position), Titelerkennung (oberes Drittel, größte Schrift),
    Normalisierung, Erkennung wiederkehrender Kopf-/Fußzeilen (Fix siehe
    unten), Behebung der PowerPoint-Doppelzeichen bei Formeln (`𝑢𝑢` → `𝑢`)
  - `src/ingest/slides.ts` — Zusammenfassen von Animationsschritten zu
    Folien (Positions- + Textabgleich, siehe unten), eindeutiger
    Zeichenumfang
  - `src/ingest/pdf.ts` — Gesamtpipeline PDF → `ExtractedDocument`
  - `scripts/analyze-material.ts` — Kommandozeilen-Diagnosewerkzeug,
    `npm run analyze -- [--detail] <pfad.pdf>`
- **Titelerkennung bestätigt: 95–98 % über alle sieben getesteten
  Foliensätze** (drei Fächer). Das Verfahren (größte Schrift im oberen
  Seitendrittel) funktioniert robust.
- **Erste Tests geschrieben:** `tests/ingest/slides.test.ts`,
  `tests/ingest/extract.test.ts` (9 Tests).
- **Animationsschritt-Erkennung gelöst** (dritter Ansatz: Titel + Positions-
  **und** Textabgleich statt reinem Textcontainment). Zusätzlich ein
  Fußzeilen-Bug behoben, der den Containment-Wert systematisch gedrückt
  hatte (`findRepeatingLines`/`stripOwnPageNumber` in `extract.ts`). Am
  Original aller vier Fächer validiert, inkl. des ursprünglich
  dokumentierten Fehlerfalls „Types of Financial Intermediaries" (S.20–23,
  „4 Financial Institutions.pdf") — korrekt nicht zusammengefasst. Details,
  Testtabelle und Stichproben: `git log` / Commits
  `7331815`/`c5015e9` auf `feat/ingest-pipeline`, sowie
  `src/ingest/slides.ts` (Kommentar am Funktionskopf von `isBuildStep`).
  Überraschender Befund dabei: Die Money-&-Banking-Foliensätze 1/2/4 nutzen
  offenbar gar keine PowerPoint-Animationen (`buildGroups: 0`) — die
  gesamte Seiten-Aufblähung dort kommt aus Trennfolien und
  Unterpunkt-Folgen mit gleichem Titel, nicht aus echten Builds.
- **Testmaterial lokal sortiert:** `Beispiel pdfs/Microeconomics/` (7
  Dateien) und `Beispiel pdfs/Money Banking and Financial Markets/` (14
  Dateien, inkl. Online Questions/Problem Sets) — gitignored, siehe
  SECURITY.md. Nebenbefund beim Sortieren: `Online Questions 2.pdf`
  enthält inhaltlich bereits die Lösungen (identisch mit
  `..._Solutions.pdf`) — vermutlich ein Bezeichnungsfehler der
  Quelle, nicht korrigiert.
- **SQLite-Schema angelegt** (vollständig, alle 19 Tabellen aus
  DATA_MODEL.md, auch die erst ab Phase 4 befüllten):
  - `src/data/migrations/0001_init.sql` — DDL, `CHECK`-Constraints für alle
    Enum-Spalten, Fremdschlüssel mit `ON DELETE CASCADE`/`SET NULL` wo
    sinnvoll, Indizes auf allen Fremdschlüsseln plus `study_blocks.planned_date`
    und `reviews.due_at` (Abfragen, die die Heute-Ansicht bzw. Spaced
    Repetition brauchen werden)
  - `src/data/schema.ts` — TypeScript-Zeilentypen für alle Tabellen,
    reine Typen ohne Laufzeitlogik
  - `tests/data/schema.test.ts` — wendet die Migration gegen eine echte
    In-Memory-SQLite-Datenbank an (`better-sqlite3`, **nur** Testwerkzeug,
    nicht die spätere Laufzeit-Anbindung) und prüft: alle 19 Tabellen
    vorhanden, Fremdschlüssel greifen (inkl. Cascade-Löschung), `CHECK`-
    und `NOT NULL`-Constraints wirken (u. a. der in DATA_MODEL.md
    hervorgehobene Fall `questions.source_document_id`/`source_page`)
  - Migration ist **nicht idempotent** (kein `IF NOT EXISTS`) — bewusst so
    gelassen, ein Migrationsrunner mit Versionstracking kommt erst mit dem
    Tauri-Rahmen (`tauri-plugin-sql`, siehe ARCHITECTURE.md); bis dahin ist
    `0001_init.sql` nur eine vorbereitete SQL-Datei, noch nicht an eine
    echte App-Laufzeit angeschlossen

- **Kapitelerkennung mit Fuzzy-Normalisierung** (`src/ingest/chapters.ts`,
  neu). Drei Signale, in dieser Reihenfolge versucht (siehe
  ARCHITECTURE.md „ingest/"):
  1. **Untertitelzeile** (Microeconomics) — eine feste (Position,
     Schriftgröße) unter dem Titel, deren Text wechselt, aber immer
     wiederkehrt. Erkannt über den höchsten *Wiederholungsfaktor* (wenige
     Namen, oft wiederholt) unter allen Kandidatenpositionen — **nicht**
     über die größte Seitenzahl, das griff anfangs die falsche Position
     (die erste Fließtext-Zeile kam auf mehr Seiten vor als die echte
     Untertitelzeile, aber mit Wiederholungsfaktor 1 statt > 2). Schwelle
     für die Mindestabdeckung bewusst bei 0,35 statt 0,5: Bei Consumer
     Theory 02 / Producer Theory 02 fehlt die Zeile auf den ersten Folien
     (vermutlich unbenutzte Vorlage), der Rest des Dokuments zeigt aber ein
     eindeutiges Signal.
  2. **Trennfolien** (Money & Banking) — eine nummerierte Trennfolie ("1",
     "2", …) ohne eigenen Namen übernimmt den Namen der nächsten
     *unmittelbar folgenden* benannten Trennfolie; steht sie **ohne**
     folgende Benennung allein (kommt an echtem Material vor, „1 Financial
     Systems.pdf": „2" und „3" ohne eigenen Titel), markiert sie trotzdem
     eine neue Abschnittsgrenze („Kapitel 2") — sonst würde der Name des
     vorigen Abschnitts fälschlich über die Grenze hinweg weiterlaufen.
  3. **Dateiname** (Entrepreneurial Transformation) — weder Untertitel
     noch benannte Trennfolie gefunden, die ganze Datei ist ein Kapitel.
  Fuzzy-Zusammenführung ähnlicher Namen über Levenshtein-Distanz (≤ 2 **und**
  ≤ 10 % der Namenslänge — reine Präfixregeln fangen nur Endungen ab, nicht
  mittige Einfügungen wie „Market Structure" vs. „Market Structures").
  An 13 echten Dateien beider Fächer validiert (`npm run analyze --
  --detail` zeigt jetzt auch die erkannten Kapitel), 8 Tests in
  `tests/ingest/chapters.test.ts`.

**Bewusst nicht behoben:** `isDividerPage` markiert jede fast-textleere
Folie als „Trennfolie", auch reine Diskussionsfragen oder Bildfolien ohne
Kapitelwechsel — drückt `slideCount`/`uniqueChars` künstlich. Gehört zur
Themenbaum-Phase, nicht zur Kapitelerkennung selbst.

### Nächster Schritt

Themenbaum-Ansicht, bearbeitbar (nächster Roadmap-Punkt) — UI-Arbeit, siehe
ARCHITECTURE.md „Datenfluss beim Import". Erste Gelegenheit, `src/data/`
tatsächlich zu befüllen (documents/topics/topic_sections aus einem
`ExtractedDocument`).

**Zurückgestellt, braucht Rückfrage beim Nutzer, bevor es passiert:**
- PR öffnen/mergen — setzt einen Push nach GitHub voraus
- Tauri-Rahmen — setzt eine Rust-Installation (`rustup`) voraus

### Sonstiges für den Wiedereinstieg

- **Rust ist auf diesem Mac nicht installiert.** Für den eigentlichen
  Tauri-Rahmen (Fenster, Notifications, SQLite-Plugin) wird es gebraucht,
  aber noch nicht für die aktuelle Arbeit (`src/ingest/`, `src/data/` sind
  reines TypeScript, laufen mit `tsx`/`vitest` ohne Tauri). Vor Beginn des
  Tauri-Rahmens: `xcode-select -p` ist vorhanden, `rustc`/`cargo` fehlen —
  Installation via `rustup` beim Nutzer erfragen (keine globalen
  Abhängigkeiten ohne Rückfrage).
- **Commit-Politik:** Es wird laufend committet, auch WIP-Stände auf dem
  Feature-Branch (siehe Regel oben und [CONTRIBUTING.md](CONTRIBUTING.md)).
  PR erst öffnen, wenn ein größerer Roadmap-Abschnitt ein belastbares
  Ergebnis liefert — dann per Squash-Merge nach `main`, nach Rückfrage
  (Push).

### Danach (unverändert aus der Roadmap)

- Themenbaum-Ansicht, bearbeitbar
- Tauri-Rahmen (Fenster, Plugins) — Rust-Installation vorher klären

Siehe [ROADMAP.md](ROADMAP.md) für die vollständige Phasenplanung.

---

## 9. Bekannte Einschränkungen

- **Kein Backup** — Gerätedefekt bedeutet Totalverlust (bewusst)
- **Zeitschätzung braucht ~10 Datenpunkte pro Fach**, bis sie taugt. Die App
  zeigt das offen an, statt falsche Präzision vorzutäuschen
- **Formelextraktion unzureichend** — blockiert die spätere Quizgenerierung,
  nicht die Planung
- **Trennfolien-Erkennung zu grob** — `isDividerPage` markiert jede
  fast-textleere Folie als Kapitel-Trennfolie, auch reine Diskussionsfragen
  oder Bildfolien ohne Fließtext. Drückt `slideCount`/`uniqueChars`
  künstlich. Gehört zur Kapitelerkennung (nächste Phase), siehe Abschnitt 8
- **Kein OCR** — gescannte Dokumente werden nicht unterstützt

---

## 10. Offene Fragen

1. **E-Mail-Benachrichtigungen** waren gewünscht. Eine lokale App kann keine
   E-Mails verschicken, ohne einen externen Dienst einzubinden oder das lokale
   Mail-Programm zu steuern — und beides funktioniert nur bei laufendem Mac,
   also genau dann, wenn ohnehin die lokale Benachrichtigung erscheint.

   **Vorgeschlagene Alternative:** der ohnehin geplante Kalender-Export. Über
   iCloud landen die Lernblöcke samt Erinnerungen auf dem iPhone und erreichen
   die Nutzer auch unterwegs — ohne Zugangsdaten und ohne externen Dienst.
   Zu prüfen, ob das im September ausreicht.
2. Prüfungstermine Oktober (Anzahl unbekannt)
3. Anzahl/Fristen der bestätigten Paper-Abgaben im Oktober
