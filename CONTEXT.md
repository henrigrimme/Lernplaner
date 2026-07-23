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

**Letzte Aktualisierung:** 23. Juli 2026 — fünf Punkte in einer Sitzung:
(1) Import akzeptiert jetzt auch Word/PowerPoint/Excel/Markdown,
deterministisch ohne KI (v0.21.0, ADR-018); (2) `scripts/Install.command`
reduziert die Gatekeeper-Erstinstall-Reibung ohne Apple Developer ID;
(3) wiederkehrende Tages-Blocker in der Verfügbarkeit (ADR-019); (4)
„Fächer & Themen" zeigt das gewählte Fach jetzt in drei Reitern statt
einer langen Ein-Seiten-Liste; (5) der Quiz-Konfigurationsdialog ist ein
Fünf-Schritt-Assistent mit neuem Fragenschwerpunkt-Parameter (ADR-020).
Details jeweils in eigenen Abschnitten am Ende von Abschnitt 8.
**Größere, noch unbeantwortete offene Fragen aus dieser Sitzung:** Nutzer
hat noch keine Rückmeldung zu echtem Word-/PowerPoint-/Excel-Testmaterial
gegeben, und der „Fach gewählt"-Zustand der neuen Fach-Reiter ist noch
nicht visuell im Browser bestätigt (kein Fach ohne echtes Tauri-Fenster
anlegbar) — beides zuerst nachfragen/nachholen.

**Davor (22./23. Juli 2026, v0.20.0 — Nachtsitzung, Nutzer
schlief während der Umsetzung, siehe „Nachtsitzung 22.07.→23.07.2026" ganz am
Ende von Abschnitt 8 für die vollständige Zusammenfassung + eine Liste
zurückgestellter Verbesserungsideen). Phase 4 komplett bis auf
„Nachschärfen aus dem Alltag" (wartet auf echte Nutzungsdaten ab 1. September).
KI-Anbindung (Claude/ChatGPT, umschaltbar), Quiz-Generierung,
Probeklausur-Simulation, Altklausur-Analyse, automatische Dokumenttyp-
Erkennung und Zusammenfassungs-Import per KI sind gebaut und released.

**Import-Bug-Serie (v0.17.0–v0.18.0) — drei unabhängige Root Causes für
„PDF-/Ordner-Import funktioniert nicht" gefunden und behoben** (pdf.js-
Worker-Ladefehler unter Tauri/macOS, ArrayBuffer-„detached"-Fehler,
`webkitdirectory` unzuverlässig in WKWebView → Ordner-Import komplett auf
nativen Dialog umgebaut). **Immer noch nicht vom Nutzer im echten Fenster
bestätigt** — das ist die wichtigste offene Frage für die nächste Sitzung,
ganz oben stellen. Details siehe „Nachtsitzung"-Abschnitt am Ende.

Seit v0.14.0 zusätzlich gebaut (Kurzfassung, Details jeweils im
„Nachtsitzung"-Abschnitt oder den davorliegenden Abschnitten): Ordner-Import,
größenverstellbare/einklappbare Seitenleiste, echtes schwebendes
Liquid-Glass-Material, Dock-Hover-Vergrößerung, Dark Mode, wählbare
Farbpaletten (inkl. British Racing Green/NATO Olive), Prüfungsformat als
Mehrfachauswahl, klickbare Quiz-Antworten mit Schwierigkeit/Anzahl/Sprache
wählbar, verschachtelbare Fach-Ordner, kompaktere Dokumentenliste.

**Keine offene Implementierungsaufgabe** aus Phase 4 — Details weiter unten
(„Stand: KI-Anbindung und Phase 4 — komplett"). **Offen/zurückgestellt:**
wiederkehrende Tages-Blocker in der Verfügbarkeit (Mittagspause, Abendessen,
Gym), volle Word/Excel/PowerPoint-Unterstützung, ein tieferer Quiz-
Konfigurationsdialog („Rückfragen wie bei Claude"), eine größere
Sidebar/Detailansicht-Neugestaltung — alle mit Begründung im
„Nachtsitzung"-Abschnitt, keines blind begonnen.

**Freigaben, die für diese Sitzung gelten (Nutzer, 22.07.2026):** PR-Merges
und GitHub-Release-Veröffentlichungen sind zusätzlich zur bereits stehenden
CONTRIBUTING.md-Anweisung noch einmal ausdrücklich freigegeben worden,
nachdem der Auto-Mode-Classifier beide Aktionstypen trotz der stehenden
Anweisung einmal blockiert hatte. Gilt fortlaufend für diese Sitzung.
**Am 23.07.2026 nochmal erweitert bestätigt:** PR-Merges und alle sonst
rückfragepflichtigen, klassifizierten Aktionen sind für den weiteren Verlauf
pauschal freigegeben, unabhängig vom Auto-Mode-Classifier-Ergebnis im
Einzelfall.

**Gatekeeper-Block beim zweiten Nutzer (23.07.2026):** Der Mitnutzer
(`theodorklink`) hat beim ersten Öffnen der per ZIP verschickten App
„lernplaner kann nicht geöffnet werden" erhalten — erwartetes macOS-
Verhalten für eine ad-hoc-signierte, nicht notarisierte App nach dem
Download (Quarantäne-Flag), dieselbe Grundursache wie ADR-009 (keine
Apple-Developer-ID). **Workaround, kein Code-Fix nötig:** `xattr -cr
lernplaner.app` nach dem Entpacken, oder Systemeinstellungen →
Datenschutz & Sicherheit → „Trotzdem öffnen". Betrifft nur den ersten
Doppelklick pro Person, nicht den Auto-Updater danach. **Auf Rückfrage
zurückgestellt:** eine echte Apple Developer ID (99 $/Jahr) würde dieses
Problem und die ADR-009-Notification-Einschränkung dauerhaft lösen —
Nutzer will das später entscheiden, für jetzt reicht der Workaround bei
zwei Nutzern. Nächste Sitzung: falls das Thema wieder aufkommt (z. B.
weil der Workaround stört oder ein dritter Nutzer dazukommt), diese
Notiz und ADR-009 als Ausgangspunkt nehmen, keine neue Recherche nötig.
**Reibung reduziert (23.07.2026, ohne Kosten):** `scripts/Install.command`
(neu, PR siehe unten) macht den `xattr`-Schritt zum Doppelklick statt
Terminal-Befehl — seit v0.22.0 im Release-Zip neben `lernplaner.app`
enthalten (CONTRIBUTING.md „Releases"). Löst nicht das zugrunde liegende
Signatur-Problem, nimmt aber die Terminal-Hürde für den einmaligen
Erstinstall.

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
| Dateiformate | PDF, Word, PowerPoint, Excel, Markdown (erweitert 23.07.2026, ADR-018 — ursprünglich „nur PDF", auf Nutzerwunsch geöffnet) |
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

**Phase 1 — Fundament, begonnen 20.07.2026, inhaltlich abgeschlossen (siehe
unten). Aktiver Branch `feat/ingest-pipeline`, als [PR #2](https://github.com/henrigrimme/Lernplaner/pull/2)
gepusht, noch nicht gemerged.**

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

- **KI-Budget-Verhalten festgelegt (ADR-007):** Auf Nutzerwunsch — die App
  soll bei Erreichen eines Limits **benachrichtigen, nicht sperren**, und
  jeder Nutzer setzt sein eigenes monatliches Limit selbst (lokal, kein
  Abgleich zwischen den beiden Nutzern). Benachrichtigung wiederholt sich
  bei jedem weiteren erreichten Vielfachen des Limits, nicht nur einmalig;
  setzt sich jeden Kalendermonat zurück. Datenmodell dafür schon angelegt:
  - `src/data/migrations/0002_ai_usage.sql` — neue Tabelle `ai_usage`
    protokolliert jeden KI-Aufruf mit Kosten; `settings` trägt das Limit
    (`ai_budget_limit_eur`) und den Benachrichtigungsstand
    (`ai_budget_last_notified_month`, `ai_budget_last_notified_multiple`)
  - `src/data/schema.ts` — `AiUsage`-Zeilentyp ergänzt
  - 3 neue Tests in `tests/data/schema.test.ts`, inkl. Monatssumme als
    abgeleiteter Wert (nicht gespeichert, siehe DATA_MODEL.md)
  - **Noch nicht umgesetzt:** die tatsächliche Prüf-/Benachrichtigungslogik
    selbst — die braucht `ai/` und `platform/`, die es beide noch nicht
    gibt. Kommt mit der KI-Anbindung bzw. Phase 3 „Lokale
    Benachrichtigungen". Diese Runde legt nur Entscheidung + Datenmodell
    fest, siehe DECISIONS.md ADR-007 und DATA_MODEL.md „KI-Nutzung"

### Nächster Schritt

**Themenbaum-Ansicht, bearbeitbar — in Arbeit.**

- **Mapping `ExtractedDocument` → `documents`/`topics`/`topic_sections`
  fertig** (`src/data/importTopics.ts`, `importExtractedDocument`). Jedes
  Kapitel wird zu einem Thema (`parent_id NULL` — die Pipeline erkennt aktuell
  nur Kapitel, keine Unterthemen, das ist eine spätere Erweiterung, kein
  Rückschritt). Jede Kapitel-Folienmenge wird zu einer `topic_section` mit
  Seitenbereich (`min`/`max` der Folien-Seitenzahlen) und Zeichenumfang
  (Summe von `slide.chars` über die Kapitelfolien — bewusst **nicht**
  identisch mit `document.unique_chars`, das global dedupliziert; die
  `topic_section`-Summe ist die einfache lokale Summe). `SqlExecutor` als
  schmale Schnittstelle statt fester `better-sqlite3`-Anbindung, damit später
  `tauri-plugin-sql` eingesetzt werden kann, ohne das Mapping umzuschreiben.
  5 Tests gegen eine echte In-Memory-SQLite-Datenbank.
  - **Bewusst nicht Teil dieses Schritts:** Re-Import/Update bestehender
    Themen unter Beachtung von `manual_override` (siehe DATA_MODEL.md „Warum
    `manual_override` existiert") — aktuell nur reines Anlegen (INSERT) beim
    Erstimport. Muss nachgezogen werden, sobald ein zweiter Import auf
    denselben Kurs trifft.
- **Plausibilitätscheck an echtem Material durchgeführt**
  (`scripts/preview-import.ts`, `npm run preview-import -- <pfad.pdf>` —
  neues Diagnosewerkzeug analog `analyze-material.ts`, zeigt zusätzlich die
  tatsächlichen `topics`/`topic_sections`-Zeilen). Gegen alle Microeconomics-
  und Money-&-Banking-Dateien laufen lassen: Seitenbereiche und
  Kapitelnamen decken sich mit der bereits validierten Kapitelerkennung,
  keine Auffälligkeiten gefunden. Bekannte Kosmetik, nicht behoben: Kapitel
  aus unbenannten Trennfolien heißen „Kapitel 2", „Kapitel 3" — technisch
  korrekt (siehe `chapters.ts` `detectDividerChapters`), aber kein Name, den
  ein Nutzer in der Baumansicht so stehen lassen würde; das ist genau der
  Fall, für den `manual_override` gedacht ist.
- **Vorbestehender `vite.config.ts`-Typecheck-Fehler inzwischen behoben** —
  nicht durch den ursprünglich verworfenen `vitest/config`-Import (der zog
  den `vite`-Versionskonflikt nach sich), sondern durch Trennung:
  `vitest.config.ts` ist jetzt eine eigene Datei (`defineConfig` aus
  `vitest/config`, ohne `@vitejs/plugin-react`), `vite.config.ts` bleibt bei
  `defineConfig` aus `vite` und trägt kein `test`-Feld mehr. Kein
  Versionskonflikt mehr, weil die beiden `vite`-Typversionen nie in derselben
  Datei aufeinandertreffen. `npx tsc --noEmit` ist seitdem vollständig
  fehlerfrei — nötig geworden, weil der Tauri-Build (`npm run build` läuft
  vorher `tsc --noEmit`) sonst am selben Fehler gescheitert wäre.

- **Reine Baum-Editierfunktionen fertig** (`src/data/topicTree.ts`):
  `buildTree` (flach → verschachtelt, sortiert nach `sort_order`),
  `renameTopic`, `moveTopic`, `deleteTopic`. Keine DB-Zugriffe, keine UI
  (ARCHITECTURE.md „ui/ … keine Geschäftslogik"). Jede Änderung setzt
  `manual_override = 1`. `deleteTopic` kaskadiert wie `ON DELETE CASCADE` in
  `0001_init.sql`. `moveTopic` verweigert Verschieben in den eigenen
  Teilbaum (Zyklus) und nummeriert **beide** betroffenen Geschwistergruppen
  lückenlos neu (alte und neue Elternebene), sonst blieben nach dem
  Verschieben Lücken in `sort_order`. 11 Tests.
- **Editierbare React-Ansicht fertig** (`src/ui/TopicTree.tsx`,
  `TopicTree`-Komponente): zeigt den Baum (`role="tree"`/`treeitem"` für
  Zugänglichkeit), Umbenennen inline, Löschen mit Ja/Nein-Bestätigung (kein
  `window.confirm` — in Tauri nicht garantiert verfügbar/testbar), Verschieben
  über Auf/Ab/Ein-/Ausrücken-Schaltflächen statt Drag & Drop (tastatur-
  bedienbar, keine neue Laufzeit-Abhängigkeit). Zeigt ein „bearbeitet"-
  Abzeichen bei `manual_override = 1`. Reine Präsentationskomponente: hält
  keinen eigenen Datenzustand außer den Edit-/Lösch-Bestätigungsmodi, jede
  Änderung geht über `topicTree.ts` und wird per `onChange(topics)` nach
  außen gereicht — Persistieren ist Sache der aufrufenden Stelle (kommt mit
  dem Tauri-Rahmen). „Ausrücken" verschiebt eine Ebene hoch, direkt hinter
  das bisherige Elternthema (`Number.MAX_SAFE_INTEGER` als Index, den
  `moveTopic` selbst auf die tatsächliche Geschwisterzahl klemmt).
  - **Testinfrastruktur neu:** `jsdom`, `@testing-library/react`,
    `@testing-library/jest-dom`, `@testing-library/user-event` als
    devDependencies ergänzt (vorher nur `environment: 'node'`, keine
    Komponenten testbar). `vite.config.ts` nutzt jetzt
    `environmentMatchGlobs` (`tests/ui/**` → `jsdom`, alles andere bleibt
    `node` — schneller, siehe ARCHITECTURE.md „Tests"), `tests/setup.ts` lädt
    die jest-dom-Matcher. 10 Tests in `tests/ui/TopicTree.test.tsx`
    (Rendering, Umbenennen inkl. Abbrechen, Verschieben, Ein-/Ausrücken,
    Lösch-Bestätigung, „bearbeitet"-Abzeichen).
  - `npm audit` meldet 5 Schwachstellen (esbuild/vite, über eine verschachtelte
    `vite`-Kopie in `vitest`s eigenem `node_modules`) — vorbestehend, dieselbe
    Ursache wie der Typecheck-Fehler unten, nicht durch die neuen
    devDependencies verursacht, nicht behoben (Fix ist ein `vitest`-Major-
    Update, eigene Entscheidung).

**Themenbaum-Ansicht fachlich vollständig** (Mapping + Editieren + Anzeige +
Tests + Plausi-Check). Weiterhin offene Lücke: Re-Import/Update unter
Beachtung von `manual_override`.

**PR geöffnet** (nach Rückfrage/Freigabe durch den Nutzer):
[#2](https://github.com/henrigrimme/Lernplaner/pull/2), Branch
`feat/ingest-pipeline` nach GitHub gepusht. **Noch nicht gemerged** — bewusst
offen gelassen zur Durchsicht, kein automatischer Merge ohne erneute
Rückfrage.

**Tauri-Projekt, Build, Tests, CI — nach Rückfrage/Freigabe erledigt:**

- **Rust installiert** über das offizielle `rustup`-Skript (nicht Homebrew —
  verwaltet Toolchains/Targets besser für Tauri). `rustc 1.97.1`,
  `cargo 1.97.1`. `. "$HOME/.cargo/env"` muss in einer neuen Shell einmal
  geladen werden (oder neue Shell öffnen), bis das gegebenenfalls noch ins
  Profil eingetragen wird.
- **Tauri 2 ins Projekt eingerichtet** (`npx tauri init --ci`, dann
  `identifier` auf `com.henrigrimme.lernplaner` und Paket-Metadaten in
  `src-tauri/Cargo.toml` korrigiert, die Platzhalter waren). `frontendDist`
  `../dist`, `devUrl` `http://localhost:1420` (passt zu `vite.config.ts`s
  festem Port), `beforeDevCommand`/`beforeBuildCommand` auf `npm run
  dev`/`npm run build`.
- **Minimaler App-Rahmen ergänzt** (`index.html`, `src/main.tsx`,
  `src/App.tsx`) — vorher gab es nur Bibliothekscode (`ingest/`, `data/`,
  `ui/TopicTree.tsx`), aber keinen tatsächlichen Einstiegspunkt, den Tauri
  laden könnte. `App.tsx` zeigt `TopicTree` über lokalem React-`useState`
  (kein `tauri-plugin-sql`, keine echte Persistenz) — **ausdrücklich nur ein
  Rahmen, keine echte Funktionalität**, siehe Kommentar im Code.
- **`npm run build` und `npx tauri build --debug` laufen durch.** Die
  `lernplaner.app` wird korrekt gebaut (`src-tauri/target/debug/bundle/macos/`).
  **DMG-Bundling schlägt fehl** (`bundle_dmg.sh`, AppleScript/Finder-
  Automation) — bekanntes, nicht code-bezogenes macOS-Problem (fehlende
  Automation-Rechte für Finder-Steuerung in dieser Umgebung), nicht behoben.
  Betrifft nur die Erstellung eines Installer-Images, nicht `tauri dev` oder
  die `.app` selbst — für die aktuelle Phase (kein Produkt, keine
  Veröffentlichung, siehe Abschnitt 1) irrelevant. Bei Bedarf später:
  Automation-Rechte für Terminal/Finder in Systemeinstellungen prüfen, oder
  `bundle > macOS > dmg` in `tauri.conf.json` vorerst deaktivieren.
- **`.gitignore` deckte `src-tauri/target/` und `src-tauri/gen/` schon ab**
  (vorausschauend beim Projektaufbau angelegt) — nichts nachzubessern.
  `src-tauri/Cargo.lock` **wird committet** (Tauri-App ist ein Binary, kein
  Library-Crate — reproduzierbare Builds brauchen das gepinnte Lockfile).
- **CI-Workflow neu** (`.github/workflows/ci.yml`, GitHub Actions, läuft auf
  `macos-latest` wegen Tauri): Job `test` (Node, `npm ci`, `npm run
  typecheck`, `npm test`) auf jeden Push/PR; Job `tauri` (Rust-Toolchain,
  `npm run build`, dann `cargo check --locked` in `src-tauri/`) prüft, dass
  die Rust-Seite kompiliert, **ohne** die volle Bundle-Erstellung anzustoßen
  (umgeht damit das DMG-Problem oben und spart CI-Minuten). **Verifiziert:**
  erster echter CI-Lauf auf PR #2 grün (beide Jobs, nach einem leeren
  Anstoß-Commit — GitHub hat den Workflow beim allerersten Push auf einen
  neuen Branch nicht sofort registriert, zweiter Push hat funktioniert).

**PR #2 noch nicht gemerged** — Merge ist eine der Aktionen, die laut den
harten Grenzen dieser Session eine explizite Rückfrage/Freigabe brauchen; ein
Versuch ohne diese Freigabe wurde vom Auto-Mode-Classifier blockiert. Bleibt
offen, bis der Nutzer das ausdrücklich anstößt.

### Phase 2 — Planung, begonnen

Neuer Branch `feat/estimation` (von `feat/ingest-pipeline` abgezweigt, da PR
#2 noch offen ist). Erster Baustein: `domain/estimation.ts`
(`estimateMinutes`) nach ADR-004 — erste Datei überhaupt in `src/domain/`.

- **Formel wörtlich aus ADR-004 übernommen**, mit einer Lese-Entscheidung,
  die im Code dokumentiert ist: `calibration.minutes_per_1k_chars` **ersetzt**
  die 4,5er-Ausgangskonstante im Zeichen-Term, statt als zusätzlicher
  Multiplikator über die gesamte Summe zu wirken — ADR-004 listet
  „kalibrierung" zwar als eigenen Faktor am Formelende, aber der Feldname
  „Minuten pro 1000 Zeichen" (DATA_MODEL.md) beschreibt eindeutig einen
  Ersatz für die 4,5-Konstante, nicht einen zusätzlichen Multiplikator —
  sonst flösse derselbe Kalibrierungseffekt doppelt ein. Kalibrierung greift
  erst ab `sample_count >= 10` (siehe Abschnitt 9 „Bekannte
  Einschränkungen"), vorher bleibt es bei der ADR-004-Konstante.
- **Zwei Stellen bewusst als Platzhalter markiert, nicht validiert:**
  - `scaleMultiplier` (linear um den Mittelwert 3 für `course.difficulty`
    und `topic.weight`) — ADR-004 nennt diese Formelglieder, legt aber keine
    Skala fest. Linear mit „3 = neutral" ist die naheliegendste Wahl, aber
    erfunden.
  - `EXAM_FORMAT_MULTIPLIER` (0,7–1,2 je nach `assessment.format`) — nirgends
    dokumentiert, aus der Überlegung geschätzt, dass Open-Book/MC weniger
    aktive Übung brauchen als Freitext/Essay/Fallstudie/Rechnen. **Sollte vor
    dem ersten echten Einsatz mit dem Nutzer abgestimmt werden** — bewusst
    als benannte, leicht auffindbare Konstante exportiert statt versteckt.
  - Beide sind über den bereits bestehenden Kalibrierungsmechanismus
    (`calibration`-Tabelle, ADR-004) grundsätzlich korrigierbar, decken aber
    nur den Zeichen-Koeffizienten ab, nicht die beiden Multiplikatoren oben —
    die bleiben vorerst reine Annahmen.
- **8 Tests** (`tests/domain/estimation.test.ts`): Basisformel bei neutralen
  Werten, Summierung über mehrere `topic_sections`, leere Sections,
  Skalierung mit Schwierigkeit/Gewicht, Prüfungsart-Unterschiede,
  Kalibrierung unter/ab Mindest-Stichprobengröße.
- **Plausibilitätscheck an echtem Material:** `scripts/preview-import.ts`
  zeigt jetzt zusätzlich die geschätzte Minutenzahl je Thema (neutrale
  Annahmen: Schwierigkeit/Gewicht 3, Format „mixed", keine Kalibrierung).
  Gegen Consumer Theory 01 und 4 Financial Institutions laufen lassen:
  Werte steigen monoton mit Zeichen-/Folienzahl (1–47 Minuten je Kapitel),
  keine Ausreißer, keine Null-/Negativwerte — sinnvoll für einen einzelnen
  Durchgang, spätere Wiederholungen kommen erst mit `scheduling.ts`.

**Damit ist Phase 1 (Fundament) laut ROADMAP.md vollständig abgehakt**, und
Phase 2 „Planung" (03.08–16.08) begonnen — `estimation.ts` ist der erste
Baustein in `domain/` (vorher leer, siehe ARCHITECTURE.md).

**PR #2 und PR #3 gemergt** (Squash, nach Rückfrage/Freigabe). `main` enthält
jetzt das gesamte Fundament plus `estimation.ts`. Beide Feature-Branches
(`feat/ingest-pipeline`, `feat/estimation`) danach gelöscht (lokal + remote,
nach Rückfrage) — Verlauf steht in den PR-Beschreibungen/Commit-Messages,
nicht in den Branches.

**`domain/capacity.ts` fertig** (neuer Branch `feat/capacity`): verfügbare
vs. benötigte Zeit, Defiziterkennung, baut auf `estimateMinutes` auf.

- `availableMinutesForDay`: `availability_exception` **ersetzt** den
  Wochenmuster-Wert für dieses Datum vollständig (kein Zuschlag, siehe
  DATA_MODEL.md). `blockers` werden uhrzeit-genau abgezogen, ein Termin über
  Mitternacht wird korrekt auf beide Tage aufgeteilt. Nie negativ.
- **Wochentag-Konvention nicht in DATA_MODEL.md beziffert** — als
  `AvailabilityPattern.weekday` wird JS' `Date#getUTCDay()`-Zählung
  angenommen (0 = Sonntag), im Code dokumentiert. Falls die spätere
  Setup-UI etwas anderes erwartet (z. B. ISO-Wochentag, 0 = Montag), muss
  das hier angepasst werden.
- **Puffer bewusst ohne Standardwert außer 0** — DATA_MODEL.md nennt „(verfügbar
  − Puffer) / benötigt" als Formel, beziffert aber keinen Prozentsatz.
  `bufferMinutes` ist ein expliziter Parameter, kein erfundener Default.
- **Parallele Prüfungen korrekt behandelt:** `checkCapacity` berechnet den
  verfügbaren Zeitraum **einmal** über den gemeinsamen Horizont, der Bedarf
  wird über alle Prüfungen summiert übergeben — sich überschneidende Tage
  werden dadurch nicht mehrfach gezählt. Ausführlich im Modul-Kommentar und
  in einem eigenen Test dokumentiert (naiver Ansatz pro Prüfung einzeln
  würde die Kapazität überschätzen).
- **11 Tests**, decken 3 der 4 in CONTRIBUTING.md genannten Pflichtfälle für
  `domain/`-Änderungen ab: fünf parallele Prüfungen (s. o.), weniger Zeit als
  Stoff, verschobener Prüfungstermin (trivial: neues `to` übergeben, keine
  eigene Funktion nötig). **„Rückstand mitten in der Phase" bewusst nicht
  hier getestet** — braucht `study_blocks.actual_minutes`/`completed_at`,
  also echte Nutzungsdaten und Neuberechnung; gehört zu `replanning.ts`
  (noch nicht gebaut), nicht zu dieser reinen Zeitraum-Rechnung.
- **Plausibilitätscheck:** kein PDF-Material beteiligt (reine Datums-
  arithmetik), deshalb ein von Hand durchgerechnetes realistisches Szenario
  statt `preview-import.ts`: 4 Wochen, 5 Fächer, 150 Min./Wochentag + 240
  Min. Samstag, 40h Gesamtbedarf, 5h Puffer → 152 % Deckung, keine
  Ausreißer, korrekte Vorzeichen bei Über-/Unterdeckung.

**PR #4 gemergt** (`capacity.ts`, Squash, nach Rückfrage/Freigabe). Branch
`feat/capacity` danach gelöscht (lokal + remote, nach Rückfrage).

### Setup-UI: Fächer, Prüfungen, Verfügbarkeit — fertig

Neuer Branch `feat/setup-ui`. Schließt die Lücke, die vorher offen war:
`courses`, `assessments`, `availability_pattern`/`availability_exception`
waren im Schema angelegt, aber nirgends befüllbar — `estimation.ts` und
`capacity.ts` liefen bisher nur mit synthetischen Testdaten.

- **Datenschicht** (`src/data/courses.ts`, `assessments.ts`,
  `availability.ts`): reine Editierfunktionen nach dem `topicTree.ts`-Muster
  (kein DB-Zugriff, keine Systemuhr — `createdAt` bei `addCourse` kommt
  explizit vom Aufrufer). `setAvailabilityPattern`/`setAvailabilityException`
  sind Upserts, kein Append: `weekday` bzw. `date` sind in `0001_init.sql`
  der Primärschlüssel, ein Append hätte doppelte Zeilen für denselben Tag
  erzeugt. 14 Tests.
- **UI-Komponenten** (`src/ui/CourseSetup.tsx`, `AssessmentSetup.tsx`,
  `AvailabilitySetup.tsx`): reine Präsentation wie `TopicTree`, ein
  wiederverwendetes Formular für Neu-Anlage und Bearbeiten (Umschalten über
  `editingId`). `CourseSetup` blendet archivierte Fächer standardmäßig aus
  (Checkbox zum Einblenden). 17 Komponententests.
- **In `App.tsx` verdrahtet**, weiterhin lokaler React-State ohne
  `tauri-plugin-sql` (siehe Kommentar dort) — Fach auswählen zeigt die
  zugehörigen Prüfungen.
- **Im echten Browser getestet** (Playwright gegen `npm run dev`, nicht nur
  jsdom): Fach anlegen → im Dropdown auswählen → Prüfung anlegen →
  Verfügbarkeit setzen, Ende-zu-Ende durchgeklickt. Dabei einen echten Bug
  gefunden, den die jsdom-Tests **nicht** gefunden hätten: `AssessmentSetup`
  und `AvailabilitySetup` hatten beide ein Feld mit Label „Datum" — auf
  derselben Seite nicht eindeutig unterscheidbar (auch nicht für
  Screenreader-Nutzer, die linear navigieren). Behoben:
  `AssessmentSetup`s Feld heißt jetzt „Prüfungsdatum". Einziger
  verbliebener Konsolen-Befund: fehlendes `favicon.ico` (404) — kosmetisch,
  keine echte Funktionsstörung, nicht behoben.
- **103 Tests insgesamt**, `npm run build` läuft durch. (Korrektur: in der
  gemergten Commit-Message von PR #5 steht fälschlich „129" — Zahl vor dem
  Commit nicht gegen den tatsächlichen Testlauf geprüft. Nicht mehr sauber
  korrigierbar, ohne Historie auf `main` umzuschreiben; hier richtiggestellt.)

### `domain/scheduling.ts` — Terminierung fertig

Neuer Branch `feat/scheduling`. Letzter Baustein für einen ersten „echten
Lernplan" (ROADMAP.md Phase 2 „Ergebnis") — weist Themen aus `estimation.ts`
konkrete Tage zu, unter Berücksichtigung von `capacity.ts`.

- **Verschränkung:** Themen mehrerer Fächer werden im Round-Robin auf einen
  Tag verteilt (Sitzungen à `sessionChunkMinutes`, Standard 45 Min.), statt
  ein Fach komplett vor dem nächsten abzuarbeiten — passt zu „bis zu 5
  Klausuren parallel" (CONTEXT.md „Nutzer") und ist der in der
  Lernforschung empfohlene Ansatz (Interleaving).
- **EDF-Priorität:** Innerhalb eines Tages haben Themen mit näherem
  Prüfungstermin Vorrang in der Rotation — bekommen ihre Zeit auch dann
  noch, wenn die Tageskapazität mittendrin ausgeht.
- **Ein Wiederholungsblock je Thema**, mit Mindestabstand nach dem
  Erstdurchgang (`minReviewGapDays`, Standard 3 Tage) — **kein**
  Spaced-Repetition-Algorithmus (FSRS kommt laut ROADMAP.md erst in Phase 4,
  für Karteikarten/`reviews`, eine andere Tabelle). Wird eine Wiederholung
  nicht mehr untergebracht, zählt das **nicht** als Defizit — sie war ein
  Zusatzangebot, kein zugesicherter Bedarf wie der Erstdurchgang.
- **Drei Konstanten unvalidiert**, benannt und mit Default versehen statt
  versteckt: `sessionChunkMinutes` (45), `reviewFraction` (0,3),
  `minReviewGapDays` (3) — alle als `ScheduleOptions` überschreibbar.
- **Bewusst nicht Teil dieses Moduls:** Rückstand *mit bereits erledigten
  Blöcken* neu einplanen und als Diff anzeigen (ADR-005 „nie automatisch
  anwenden") — das ist `replanning.ts`, noch nicht gebaut. Die Funktion
  unterstützt aber „ab heute mit dem Restbedarf neu rechnen" (späteres
  `from`, reduzierte `neededMinutes`), nur ohne Diff-Anzeige/Bestätigung.
- **11 Tests**, decken alle 5 in ARCHITECTURE.md/CONTRIBUTING.md genannten
  Pflichtfälle ab (fünf parallele Prüfungen, weniger Zeit als Stoff →
  Streichvorschlag über `unscheduled`, verschobener Prüfungstermin, neues
  Material nachträglich importiert, Rückstand — im oben beschriebenen,
  eingeschränkten Sinn). Kernverhalten (EDF-Priorität, Verschränkung,
  Wiederholungsabstand) von Hand nachgerechnet, nicht nur den grünen Test
  vertraut.
- **Plausibilitätscheck an echtem Material:** Consumer Theory 01, alle
  6 erkannten Kapitel über `estimateMinutes` geschätzt (1–22 Min. je
  Kapitel) und mit realistischem Verfügbarkeitsmuster (120 Min./Wochentag,
  180 Samstag) durch `scheduleStudyBlocks` laufen lassen: 70 Min.
  Erstdurchgang + 21 Min. Wiederholung (30 % nach 3 Tagen Abstand) — Summe
  und Zeitpunkte stimmen exakt mit der Handrechnung überein, keine
  Ausreißer.

**Damit sind alle für ROADMAP.md Phase 2 „Ergebnis" (erster echter
Lernplan für Oktober) nötigen `domain/`-Bausteine vorhanden.** Fehlt noch:
eine Planansicht in `ui/`, die `scheduleStudyBlocks` tatsächlich aufruft
und die `study_blocks` anzeigt — aktuell nur über Skripte/Tests geprüft,
nicht in der App sichtbar.

### Planansicht — fertig, ROADMAP.md Phase 2 „Ergebnis" erreicht

Neuer Branch `feat/plan-view`.

- **`src/ui/PlanView.tsx`**: ruft `estimateMinutes` + `scheduleStudyBlocks`
  auf und zeigt das Ergebnis als Wochen-/Tagesübersicht. Reine Präsentation,
  keine eigene Planungslogik.
  - **Vereinfachung, nicht im Schema abgebildet:** `topics` haben kein
    eigenes `assessment_id` (Zuordnung passiert laut DATA_MODEL.md erst in
    `study_blocks`). Diese Ansicht wählt für jedes Thema die **nächste
    bevorstehende Prüfung seines Fachs** — ein Thema für eine spätere
    Prüfung desselben Fachs vorzubereiten, geht damit noch nicht. Themen
    ohne bevorstehende Prüfung werden sichtbar separat aufgeführt, nicht
    stillschweigend weggelassen.
  - Themen mit 0 geschätzten Minuten (keine `topic_sections`) erscheinen
    aktuell in keiner Liste — bewusst so gelassen (keine sinnvolle
    Fehlermeldung für „noch nichts importiert"), aber nicht extra geprüft.
- **PDF-Import jetzt im Browser verdrahtet** (`App.tsx`, Datei-Input →
  `extractDocument` → neue Funktion `topicsFromExtractedDocument` in
  `src/data/importTopics.ts`): Array-Variante von `importExtractedDocument`
  ohne Datenbank (`better-sqlite3` ist reine Node-Testinfrastruktur, im
  Frontend-Bundle nicht nutzbar) — gleiche Kapitel-→-Thema-Zuordnung,
  `nextId`-Vergabe wie bei `courses.ts`/`topicTree.ts`. `documentId` wird
  vom Aufrufer durchgezählt, kein eigener `documents`-Zustand in der App
  (noch keine Dokumentenliste in der UI).
- **Echter Bug im Browser gefunden, jsdom hätte ihn nicht gefunden:**
  pdf.js braucht im Browser einen expliziten
  `GlobalWorkerOptions.workerSrc` — ohne den wirft `getDocument` „No
  GlobalWorkerOptions.workerSrc specified." Unter Node (Tests, `tsx`-
  Skripte) fällt pdf.js automatisch auf einen „Fake Worker" zurück, daher
  ist das nie aufgefallen. Behoben in `src/ingest/pdf.ts`, nur im Browser
  gesetzt (`typeof window`-Guard), Node-Pfad unverändert. Erneut bestätigt:
  Browser-Check ist kein Pro-forma-Schritt.
- **12 neue Tests** (3 für `topicsFromExtractedDocument`, 5 für `PlanView`,
  Rest unverändert), **122 insgesamt**. `npm run build` läuft durch (Worker-
  Datei wird korrekt mitgebündelt, ~2,3 MB als eigener Chunk — Vite warnt
  wegen Chunkgröße, nicht behoben, unkritisch für eine lokale App).
- **Kompletter Fluss im echten Browser durchgespielt** (Playwright gegen
  `npm run dev`): Fach anlegen → auswählen → Prüfung anlegen →
  Verfügbarkeit setzen → PDF importieren (Consumer Theory 01) → Themenbaum
  zeigt Kapitel → Lernplan zeigt Erstdurchgang- und Wiederholungsblöcke.
  Zahlen identisch mit der früheren Handrechnung (1–22 Min. Erstdurchgang
  je Kapitel, Wiederholung nach 3 Tagen). Einziger verbliebener
  Konsolen-Befund: das bekannte, kosmetische `favicon.ico`-404.

**Damit ist ROADMAP.md Phase 2 „Ergebnis" (erster echter Lernplan für
Oktober) tatsächlich erreicht** — durchspielbar von Fach-Setup bis
Lernplan, nicht nur in Einzelmodulen getestet.

### Gewicht-/Schwierigkeit-Regler mit Kapitel-Vererbung — fertig

Neuer Branch `feat/topic-weight-difficulty`, ausgehend von der Rückfrage zu
`EXAM_FORMAT_MULTIPLIER`: statt (nur) den Prüfungsformat-Multiplikator
genau zu treffen, kann der Nutzer die Zeitschätzung jetzt direkt pro Thema
korrigieren — der eigentlich gewünschte Hebel.

- **`setTopicWeight`/`setTopicDifficulty` in `topicTree.ts`**: setzen
  `weight`/`difficulty` für ein Thema **und alle Unterthemen** (nutzen
  `descendantIds`, das `id` selbst schon mit einschließt — ein Blattthema
  ohne Kinder ist dadurch automatisch der einfache Einzelfall, keine
  Sonderbehandlung nötig). Setzen `manual_override` wie
  `renameTopic`/`moveTopic`. 6 neue Tests in `topicTree.test.ts`.
- **Regler in `TopicTree.tsx`**: `<input type="range" min=1 max=5>` für
  Gewicht und Schwierigkeit, immer sichtbar (nicht hinter einem Editier-
  Modus versteckt), mit Beschriftung „(ganzer Bereich)" auf Kapiteln
  (Knoten mit Kindern) zur Unterscheidung von Blattthemen. 3 neue Tests.
- **Echte Erkenntnis beim Browser-Plausi-Check:** Kapitel aus dem PDF-Import
  sind aktuell **flach** — `detectChapters`/`topicsFromExtractedDocument`
  erzeugen keine Eltern-Kind-Hierarchie, jedes erkannte Kapitel ist ein
  eigenständiges Wurzelthema (`parent_id: null`). Die „Vererbung auf
  Unterthemen" lässt sich mit echt importiertem Material also nur zeigen,
  nachdem ein Thema manuell per „→" (Einrücken) unter ein anderes verschoben
  wurde — was aber genau der vorgesehene Weg ist, überhaupt eine Hierarchie
  zu bekommen (die Pipeline erkennt keine Unterthemen, siehe `estimation.ts`-
  Kommentar „Bewusst nicht Teil dieses Schritts"). Im Browser bestätigt:
  Kind erbt `weight`/`difficulty` korrekt vom neuen Elternthema nach dem
  Einrücken.
- **Favicon behoben, vollständig** (nicht nur der `<link>`-Tag in
  `index.html` von vorher): Chrome fragt zusätzlich **immer** `/favicon.ico`
  direkt ab, unabhängig vom `<link rel="icon">` — bekannte Eigenheit,
  `<link>` allein reicht nicht gegen den Konsolen-404. `public/favicon.ico`
  neu angelegt (minimales, selbst erzeugtes 16×16-ICO, einfarbig Indigo
  `#4f46e5`, kein Text — Vite bedient `public/` automatisch am Root).
  Bestätigt: kompletter Seiten-Reload ohne jeden Konsolenfehler/404 mehr.
- **Wochentag-Konvention vom Nutzer bestätigt** (0 = Sonntag, wie
  `Date#getUTCDay()`, wie es technisch am einfachsten ist) — war zuvor eine
  offene Rückfrage, jetzt final. Keine Code-Änderung nötig, war schon so
  umgesetzt.
- **130 Tests insgesamt** (12 neu: 6 `topicTree.ts`, 3 `TopicTree.tsx`, 3
  Browser-Plausi-Check statt neuer automatisierter Tests für Favicon).

**Als Nächstes:** `replanning.ts` (Neuberechnung + Diff, ADR-005 „nie
automatisch anwenden") für Phase 3 „Alltag" — oder, falls sich das
sinnvoller anfühlt, zuerst Phase 3s andere Bausteine (Heute-Ansicht,
Fortschrittsanzeige). ADR-005 ist der Grund, warum `replanning.ts` mehr
ist als nochmal `scheduleStudyBlocks` aufrufen: es muss den Unterschied zum
vorigen Plan zeigen und darf nichts ohne Bestätigung übernehmen.
Recherche-Notizen für die Pomodoro-Timer- und FSRS-Bausteine aus Phase 3/4
liegen jetzt schon bereit, siehe ROADMAP.md.

### Drei zurückgestellte Punkte final entschieden (auf Nutzerwunsch: „mach das selbst")

- **DMG-Bundling-Fix — behoben.** `src-tauri/tauri.conf.json`:
  `bundle.targets` von `"all"` auf `["app"]` geändert. Grund: das
  DMG-Bundling scheitert an einem macOS-Finder-Automatisierungsrecht, das
  sich nicht per Config lösen lässt (braucht eine interaktive GUI-
  Freigabe, die in dieser Umgebung nicht möglich ist) — und wird aktuell
  auch nicht gebraucht (kein Produkt, keine Veröffentlichung, siehe
  Abschnitt 1). `npx tauri build --debug` läuft jetzt vollständig durch,
  `lernplaner.app` wird korrekt gebaut, verifiziert. Ein DMG lässt sich bei
  echtem Bedarf später weiterhin gezielt mit `tauri build --bundles dmg`
  erzeugen (dann muss jemand die Finder-Berechtigung interaktiv erteilen).
- **`EXAM_FORMAT_MULTIPLIER` — final entschieden, Werte unverändert
  gelassen** (0,7–1,2 je Prüfungsformat, siehe `estimation.ts`). Begründung
  im Code-Kommentar ergänzt: seit den Themen-Reglern
  (`setTopicWeight`/`setTopicDifficulty`, siehe oben) ist das nur noch ein
  grober Startwert, keine Zahl, die exakt stimmen muss — der Nutzer
  korrigiert direkt pro Thema.
- **`sessionChunkMinutes`/`reviewFraction`/`minReviewGapDays` in
  `scheduling.ts` — final entschieden, Werte unverändert gelassen** (45
  Min. / 0,3 / 3 Tage). `sessionChunkMinutes = 45` liegt mittig im Bereich,
  den die Pomodoro-Recherche für Lernstoff nahelegt (35–50 Min., siehe
  „Recherche: Pomodoro/Session-Timing" oben) — kein Blindschuss mehr,
  wenn auch nicht exakt validiert. Beide bleiben über `ScheduleOptions`
  weiterhin überschreibbar.

**Weiterhin offen, aber kein Blocker:**
- „Thema für spätere Prüfung desselben Fachs" — aktuell nicht abbildbar
  (siehe `PlanView.tsx`-Vereinfachung oben), braucht eine echte
  Zuordnungs-UI, falls das gebraucht wird

### Recherche: Spaced Repetition (für Phase 4)

Für ROADMAP.md Phase 4 „Spaced Repetition (FSRS)" — damit die Recherche
beim Erreichen dieser Phase nicht nochmal gemacht werden muss.

**Kernaussage: FSRS verwenden, nicht SM-2.**

- **SM-2** (SuperMemo, Wożniak 1987) ist der klassische Algorithmus: jede
  Karte hat einen „Ease Factor" (Start 2,5), der bei richtiger Antwort das
  nächste Intervall verlängert, bei falscher verkürzt. Typische erste
  Intervalle: 1 Tag, dann 6 Tage, danach wachsend.
  ([Anki FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm))
- **FSRS** ist der moderne Nachfolger und lernt aus dem tatsächlichen
  Vergessensverhalten pro Karte statt einer festen Formel. **Anki selbst
  hat SM-2 im November 2023 (Version 23.10) durch FSRS als Standard
  ersetzt**, weil es bei gleicher Behaltensrate 20–30 % weniger
  Wiederholungen braucht.
  ([Anki FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm),
  [Migaku](https://migaku.com/blog/language-fun/spaced-repetition-in-2026-how-it-actually-works))
- SM-2 nachzubauen wäre reine Zeitverschwendung, wenn selbst Anki es
  aufgegeben hat — direkt FSRS implementieren oder eine bestehende
  Implementierung einbinden.

**Wichtige Abgrenzung, damit es nicht mit `scheduling.ts` verwechselt
wird:** Echtes Spaced Repetition (SM-2/FSRS) arbeitet auf **einzelnen
Karteikarten mit Erinnerungs-Feedback pro Karte** (typisch vier Stufen:
„nochmal" / „schwer" / „gut" / „leicht" oder ähnlich) — nicht auf ganzen
Themen. Das gehört zu den `cards`/`reviews`-Tabellen (siehe DATA_MODEL.md
„Später befüllt, jetzt schon angelegt"), die erst mit Phase 4 („Markieren
im Dokument → Karteikarten") entstehen. Der bereits gebaute einzelne
Wiederholungsblock in `scheduling.ts` (`reviewFraction`, `minReviewGapDays`,
siehe oben) ist **kein** Spaced-Repetition-Ersatz und sollte es auch nicht
werden — er ist ein grober Themen-Auffrischer vor der Prüfung, FSRS
arbeitet auf der viel feineren Karteikarten-Ebene. Beides bleibt getrennt.

### Recherche: Pomodoro/Session-Timing (für Phase 3)

Für ROADMAP.md Phase 3 „Heute-Ansicht mit Timer" — damit die Recherche
beim Erreichen dieser Phase nicht nochmal gemacht werden muss.

**Kernaussage: kein fester Standardwert ist für alle optimal — Presets
anbieten, dazu freie Einstellung (vom Nutzer ausdrücklich gewünscht:
„dass man sich die Timer selbst im Voraus einstellen kann").**

- Klassisch: 25 Min. Arbeit / 5 Min. Pause, nach 4 Durchgängen eine längere
  Pause (15–30 Min.).
- Eine aktuelle Studie zu medizinischem Lernstoff (Anatomie) empfiehlt eher
  **35 Min. Arbeit / 10 Min. Pause**.
  ([BMC Medical Education, Scoping Review
  2026](https://link.springer.com/article/10.1186/s12909-025-08001-0))
- Für tiefe Konzentrationsarbeit werden auch **50/10**-Zyklen verwendet.
- Kernbefund über mehrere Quellen: strukturierte Zeitblöcke mit Pausen
  schlagen unstrukturiertes Lernen zuverlässig, aber die starre 25-Minuten-
  Grenze kann bei komplexer/vertiefter Arbeit den Flow-Zustand stören — es
  gibt keine einzelne „richtige" Zahl.
  ([PomoDial](https://www.pomodial.com/blog/does-the-pomodoro-technique-actually-work),
  [Brown Daily
  Herald](https://www.browndailyherald.com/article/2026/03/fact-check-is-the-pomodoro-technique-actually-effective-for-studying))
- **Alternative: „Flowtime"** — Pause erst, wenn man selbst merkt, dass die
  Konzentration nachlässt, statt nach fester Zeit. In einer Vergleichsstudie
  zwischen Pomodoro, Flowtime und freier Selbststeuerung untersucht, könnte
  als drittes Preset oder Modus infrage kommen.
  ([PMC-Studie](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292963/))

**Empfehlung für die Umsetzung:** Presets **25/5** (klassisch, lange Pause
nach 4 Zyklen), **35/10**, **50/10** (Deep Work) zur Auswahl anbieten, plus
freie Eingabe eigener Werte — kein einzelner Default, der für alle passt.
Ein optionaler „Flowtime"-Modus (manuelles Pausieren statt festem Timer)
wäre eine sinnvolle Erweiterung, aber kein Muss für die erste Version.

### Sonstiges für den Wiedereinstieg

- **Arbeitsweise: mit Loops und Plausi-Check.** Auf Nutzerwunsch wird
  eigenständig weitergearbeitet, entlang der Roadmap, in klar abgegrenzten
  Schritten (`/loop`, selbstgetaktet statt fest getaktet). Jeder Schritt
  endet mit einem **Plausibilitätscheck** — nicht nur Tests und Typecheck
  laufen lassen, sondern das Ergebnis an echtem Material (`Beispiel pdfs/`)
  stichprobenartig von Hand nachvollziehen, bevor er als erledigt gilt. Das
  hat in dieser Session zweimal echte Bugs aufgedeckt, die Tests allein
  nicht gefunden hätten (Fußzeilen-Bug bei der Animationserkennung,
  Clustering-Bug bei der Kapitelerkennung) — Stichprobe ist kein
  Nice-to-have, sondern der Teil, der die Fehler tatsächlich findet. Danach
  CONTEXT.md aktualisieren, committen (`wip:`-Präfix), nächster Schritt.
  Harte Grenzen dabei unverändert: kein Force-Push, kein PR-Merge, keine
  weiteren globalen Abhängigkeiten ohne Rückfrage beim Nutzer.
- **Rust ist installiert** (`rustup`, `rustc 1.97.1`/`cargo 1.97.1`, siehe
  oben). Neue Shell ggf. `. "$HOME/.cargo/env"` laden, falls `cargo`/`rustc`
  nicht im PATH sind.
- **Commit-Politik:** Es wird laufend committet, auch WIP-Stände auf dem
  Feature-Branch (siehe Regel oben und [CONTRIBUTING.md](CONTRIBUTING.md)).
  PR erst öffnen, wenn ein größerer Roadmap-Abschnitt ein belastbares
  Ergebnis liefert — dann per Squash-Merge nach `main`, nach Rückfrage
  (Push).

### Phase 3 — Alltag, begonnen

Branch `feat/replanning` (von `main` abgezweigt — Phase 2 ist gemerged).
Erster Baustein: `domain/replanning.ts` (`remainingErstdurchgangNeed`,
`diffPlans`, `replan`) nach ADR-005 („Umplanung als Vorschlag, nie
automatisch"). Erste Datei des ROADMAP.md-Punkts „Neuberechnung mit
Diff-Ansicht".

- **Rückstand aus echten Nutzungsdaten berechnet**
  (`remainingErstdurchgangNeed`): summiert je Thema `planned_minutes` aller
  nicht gestrichenen `erstdurchgang`-Blöcke als ursprünglichen Bedarf (das
  ist dieselbe Zahl, die einmal als `SchedulingTopic.neededMinutes` in die
  erste Planung einging) und zieht das tatsächlich Erledigte ab
  (`actual_minutes`, Fallback `planned_minutes`, falls noch nicht erfasst).
  Ein verpasster, nicht erledigter Block aus der Vergangenheit (Status
  bleibt `offen`) zählt **weiterhin** als Bedarf — genau das bildet den
  Rückstand ab (CONTRIBUTING.md „Tests": „Rückstand mitten in der Phase").
  `gestrichen`e Blöcke zählen weder zum Bedarf noch zum Erledigten (Nutzer
  hat das Thema bewusst abgewählt).
- **Diff aggregiert je Thema + Art (`kind`), nicht Block für Block**
  (`diffPlans`) — `scheduleStudyBlocks` zerlegt Bedarf in
  `sessionChunkMinutes`-Häppchen, deren genaue Anzahl/Reihenfolge keine
  sinnvolle Diff-Einheit wäre. Vier Fälle: `neu`, `entfernt`, `verschoben`
  (andere Tage, gleiche Minuten), `dauer_geändert` (gleiche Tage, andere
  Minuten). Unverändertes taucht **nicht** im Ergebnis auf (kein Rauschen).
  Die Basis für „vorher" sind alle noch `offen`en `erstdurchgang`-Blöcke —
  **bewusst ohne Datumsfilter**: ein verpasster Block *vor* `from` muss als
  „verschoben" auf sein neues Datum erscheinen, nicht als „neu" — sonst
  würde der Rückstand fälschlich wie frisch hinzugefügter Stoff aussehen
  (erster Testlauf hat genau das gezeigt, siehe Commit).
- **`replan()` verbindet beides und wendet nichts an** — reine Funktion,
  kein Datenbankzugriff, kein „heute" aus der Systemuhr (Aufrufer übergibt
  `from`), gibt `{ blocks, unscheduled, diff }` als Vorschlag zurück.
  Persistieren in `study_blocks`/`plan_versions` und die
  Nutzerbestätigung sind Sache von `data/`/`ui/` — genau die Trennung, die
  ADR-005 verlangt.
- **Bewusst nicht Teil dieses Schritts:** Eine bereits abgeschlossene
  Wiederholung fortführen, wenn der Erstdurchgang vor `from` schon fertig
  war. `scheduleStudyBlocks` leitet `wiederholung` intern immer aus dem noch
  offenen `neededMinutes` eines Themas ab (siehe Kommentar dort) — ist der
  Erstdurchgang bereits vollständig erledigt, taucht das Thema in
  `remainingErstdurchgangNeed` gar nicht mehr auf, und seine Wiederholung
  wird von `replan` nicht neu eingeplant. Deshalb vergleicht `diffPlans` in
  `replan()` bewusst nur `erstdurchgang`-Blöcke — sonst würde eine
  unverändert weiterlaufende Wiederholung fälschlich als „entfernt"
  erscheinen. Eine echte Fortführung bräuchte zusätzlich den Tag des
  abgeschlossenen Erstdurchgangs als Eingabe an `scheduleStudyBlocks` (neues
  Feld an `SchedulingTopic`) — nicht gebaut, da noch kein echter
  Anwendungsfall dafür vorliegt; würde `scheduling.ts`/dessen Tests
  anfassen, nicht nur `replanning.ts`.
- 15 Tests in `tests/domain/replanning.test.ts`, u. a. exakt das
  CONTRIBUTING.md-Pflichtszenario „Rückstand mitten in der Phase":
  ein Thema mit einem erledigten und einem verpassten Block wird ab einem
  späteren `from` neu berechnet, das Ergebnis bleibt ohne Defizit, und der
  verpasste Block erscheint im Diff als „verschoben".
- Kein UI, keine Anbindung an `study_blocks` in der Datenbank zum Zeitpunkt
  dieses Commits — das kam direkt im Anschluss mit der Heute-Ansicht
  (nächster Abschnitt), `replanning.ts` selbst ist aber weiterhin nicht in
  `App.tsx` verdrahtet (siehe dort).

Direkt im Anschluss, auf einem zweiten von `main` abgezweigten Branch
(`feat/today-view`, parallel begonnen, da die beiden Branches keine
gemeinsamen Dateien außer CONTEXT.md/ROADMAP.md berühren): „Heute-Ansicht
mit Timer und Schwierigkeits-Feedback" (ROADMAP.md Phase 3, erster Punkt).

- **Kleine Vorab-Aufräumung:** Die Zusammenstellung „Themen/Fächer/
  Prüfungen → `SchedulingTopic[]` → `scheduleStudyBlocks`" stand bisher
  inline in `ui/PlanView.tsx` — ein Verstoß gegen ARCHITECTURE.md „ui/ …
  keine Geschäftslogik", der nicht neu ist, aber jetzt ein zweites Mal
  gebraucht wurde (siehe unten). Nach `domain/planBuilder.ts`
  (`buildSchedule`) extrahiert; `PlanView.tsx` ruft das jetzt nur noch auf.
  Verhalten unverändert — alle 5 bestehenden `PlanView.test.tsx`-Tests
  laufen ohne Anpassung weiter durch (Regressionsnachweis für den
  Refactor).
- **`data/studyBlocks.ts`** (`materializeStudyBlocks`, `completeStudyBlock`):
  wie `courses.ts`/`topicTree.ts` reine Editierfunktionen, keine Systemuhr,
  keine DB. `materializeStudyBlocks` übernimmt eine `ScheduledBlock[]`
  (aus `planBuilder.ts`) als frische `StudyBlock`-Zeilen mit fortlaufender
  `id` und Status `offen` — **ersetzt bewusst den gesamten Bestand**, kein
  Merge nach Status/id (das ist die Aufgabe der echten Neuplanung,
  `domain/replanning.ts` auf dem parallelen Branch, noch nicht hier
  integriert). `completeStudyBlock` setzt Status `erledigt` plus
  `actual_minutes`/`difficulty_feedback`/`completed_at` für einen Block.
- **`ui/Timer.tsx`** — eigenständiger Session-Timer, Presets nach der
  bereits dokumentierten Recherche (siehe „Recherche:
  Pomodoro/Session-Timing" oben): 25/5, 35/10, 50/10 **plus** frei
  einstellbare eigene Werte (Nutzerwunsch: „dass man sich die Timer selbst
  im Voraus einstellen kann"). Arbeits-/Pause-Phasen wechseln automatisch;
  meldet die bisher gearbeiteten Minuten laufend über
  `onElapsedWorkMinutesChange` nach außen — reine Präsentationskomponente,
  keine Geschäftslogik zu `actual_minutes` o. Ä. (das entscheidet der
  Aufrufer). Dauer-Einstellungen sind gesperrt, sobald der Timer lief oder
  läuft, um eine laufende Sitzung nicht rückwirkend zu verändern.
  6 Tests (`tests/ui/Timer.test.tsx`) — **mit `fireEvent` statt
  `userEvent`**: `userEvent` hängt sich in Kombination mit
  `vi.useFakeTimers()` auf (bekannte Inkompatibilität zwischen
  `@testing-library/user-event` v14 und Vitests gefakten Timern, auch mit
  `{ delay: null }`/`advanceTimers` nicht behoben) — `fireEvent` ist
  synchron und kollidiert nicht mit den gefakten Timern. Für spätere
  Timer-bezogene Tests dieselbe Falle vermeiden.
- **`ui/TodayView.tsx`** — zeigt den ersten noch offenen `study_blocks`-
  Eintrag des Tages mit eingebettetem `Timer`, lässt ihn mit tatsächlicher
  Dauer (vorbefüllt aus dem Timer, überschreibbar) und Schwierigkeits-
  Feedback (`-1`/`0`/`1`, Radiobuttons „Zu leicht"/„Passend"/„Zu schwer")
  abschließen — über `data/studyBlocks.ts`, keine eigene Geschäftslogik.
  „Fertig" bleibt deaktiviert, bis ein Feedback gewählt ist. Weitere offene
  Blöcke des Tages erscheinen als Liste „Noch heute", bereits erledigte
  als „Heute erledigt". Reine Präsentationskomponente wie `TopicTree"/
  `CourseSetup` (`onChange`/`now` von außen). 6 Tests
  (`tests/ui/TodayView.test.tsx`).
- **`App.tsx`**: neuer `studyBlocks`-Zustand, Button „Plan übernehmen"
  (bzw. „Plan neu übernehmen (überschreibt heutigen Fortschritt)", sobald
  schon Blöcke bestehen) ruft `buildSchedule` + `materializeStudyBlocks`
  auf und ersetzt den `studyBlocks`-Zustand. **Bewusst einfach** (siehe
  `data/studyBlocks.ts`-Kommentar): kein automatisches Neu-Erzeugen bei
  jeder Eingabeänderung, kein Abgleich mit bereits erledigten Blöcken —
  beides wäre faktisch die Aufgabe der echten Neuplanung
  (`replanning.ts`), noch nicht in `App.tsx` verdrahtet.
- **Plausibilitätscheck im laufenden Dev-Server** (`npm run dev`, Chrome
  über MCP-Browser-Anbindung): Fach anlegen, Prüfung anlegen, Wochenmuster
  auf 60 Min. je Tag setzen, „Plan übernehmen" klicken — keine Fehler in
  der Konsole, „Heute"-Bereich zeigt korrekt „Für heute ist nichts
  geplant." (da noch kein Thema/Umfang vorhanden). **Nicht möglich:**
  echten PDF-Import über die Browser-Automatisierung durchspielen — die
  Dateifreigabe-Sandbox der Browser-Tools lässt nur Dateien zu, die der
  Nutzer explizit für die Sitzung freigegeben hat, `Beispiel pdfs/` gehört
  nicht dazu. Der komplette Fluss inkl. eines echten `StudyBlock` mit
  Timer/Feedback ist stattdessen ausschließlich über die 15 neuen
  automatisierten Komponententests abgedeckt (u. a. simulierter Timer-
  Countdown, Preset-Wechsel, Schwierigkeits-Auswahl, „Fertig"-Klick mit
  Prüfung der `onChange`-Nutzlast) — bei Gelegenheit nachholen, sobald PDF-
  Testmaterial für die Browser-Sitzung freigegeben werden kann.
- `.claude/launch.json` neu angelegt (`npm run dev`, Port 1420) für den
  `Browser`-Preview-Mechanismus — vorher nicht vorhanden.

Direkt im Anschluss, Branch `feat/replan-ui` (von `main` abgezweigt): die
Lücke zwischen den beiden fertigen Bausteinen oben geschlossen —
`replanning.ts` ist jetzt an `App.tsx`/eine echte Ansicht angebunden, „Plan
übernehmen" bleibt für den Erstimport, ersetzt aber nicht mehr die einzige
Möglichkeit, auf Rückstand zu reagieren. Damit ist ROADMAP.md Phase 3
„Neuberechnung mit Diff-Ansicht" fachlich fertig.

- **`data/studyBlocks.ts` → `applyReplan`**: wendet ein `ReplanResult` auf
  den Bestand an (erst nach Bestätigung aufzurufen, prüft das aber nicht
  selbst — das macht `ReplanView`). Ersetzt genau die noch offenen
  `erstdurchgang`-Blöcke (verpasste wie zukünftige — exakt das, was
  `replan()` selbst betrachtet) durch die neu berechneten; alles andere
  bleibt unverändert, **auch `wiederholung`/`uebung`/`quiz`/`puffer`-Blöcke
  mit Status `offen`** — bewusst, weil `replan()` Wiederholungen nicht
  anfasst (dokumentierte Fortführungslücke, siehe `replanning.ts`); sie
  hier trotzdem zu löschen würde eine unveränderte Wiederholung fälschlich
  verwerfen. `materializeStudyBlocks` bekommt dafür einen neuen optionalen
  `startId`-Parameter (Default 1, unverändertes Verhalten für den
  bestehenden Aufrufer in `App.tsx`), damit neu erzeugte IDs an den
  bestehenden Bestand anknüpfen statt ihn zu überschreiben.
- **`data/planVersions.ts` → `recordPlanVersion`**: hält die *vorige*
  Fassung des `study_blocks`-Bestands fest, bevor eine Neuplanung
  angewendet wird — wörtlich ADR-005: „Die vorige Fassung bleibt in
  `plan_versions` erhalten." Snapshot ist der komplette `StudyBlock[]`-
  Bestand als JSON, nicht nur der Diff (einfacher wiederherzustellen,
  DATA_MODEL.md nennt keine kompaktere Form). **Noch nicht gebaut:** eine
  UI, um eine frühere Fassung tatsächlich wiederherzustellen — `App.tsx`
  zeigt nur die Anzahl gespeicherter Fassungen an („N frühere Fassung(en)
  gespeichert"); „zurück zur vorigen Fassung" ist kein eigener
  ROADMAP.md-Punkt und wurde deshalb nicht mitgebaut, nur das von ADR-005
  geforderte Aufbewahren selbst.
- **`ui/ReplanView.tsx`** — neue Ansicht: Button „Rückstand prüfen und neu
  berechnen" ruft `replan()` auf und zeigt das Ergebnis als Diff-Liste
  (Thema, Art, Änderungsart, vorher/nachher inkl. Tage und Minuten) sowie
  weiterhin nicht untergebrachte Zeit — **ohne etwas anzuwenden**, bis
  „Übernehmen" geklickt wird (ADR-005). „Übernehmen" ist deaktiviert, wenn
  der Diff leer ist (nichts zu tun). Bleibt ausgeblendet (nur ein Hinweis),
  solange noch nie ein Plan übernommen wurde — `replan()` baut ohne
  bestehende `erstdurchgang`-Historie keinen sinnvollen Vorschlag.
- **`KIND_LABELS` nach `ui/kindLabels.ts` extrahiert** — stand dupliziert
  in `PlanView.tsx` und `TodayView.tsx`, jetzt ein drittes Mal gebraucht
  (`ReplanView.tsx`); ab drei Stellen keine vertretbare Duplikation mehr.
  Reiner Konstanten-Export, keine Verhaltensänderung.
- **`App.tsx`**: neuer `planVersions`-Zustand, `applyReplan`-Handler
  (speichert die *vorige* `study_blocks`-Fassung, bevor er den neuen
  Zustand setzt), `ReplanView` nach `TodayView` eingehängt.
- 14 neue Tests (`applyReplan`, `recordPlanVersion`, `ReplanView` inkl. des
  „Rückstand mitten in der Phase"-Szenarios aus Sicht der UI: ein
  erledigter plus ein verpasster Block wird korrekt als „verschoben"
  erkannt und beim Übernehmen zusammengeführt, ohne den erledigten Block zu
  verändern). Live im Dev-Server geprüft: „Neuberechnung"-Bereich zeigt
  korrekt den Hinweis „Erst einen Plan übernehmen …", solange kein Plan
  besteht, keine Konsolenfehler.

Direkt im Anschluss, Branch `feat/progress` (von `main` abgezweigt):
`domain/progress.ts` — mastery, Vorbereitungsgrad, nächster Schritt
(ARCHITECTURE.md), plus `ui/ProgressView.tsx`. Formeln wörtlich aus
DATA_MODEL.md „Abgeleitete Werte" übernommen:

- **`computeTopicMastery`**: Erledigungsquote (`actual_minutes`, Fallback
  `planned_minutes`) über alle nicht gestrichenen Blöcke eines Themas
  (**alle Arten** — Übung/Quiz/Wiederholung zählen zur Beherrschung, nicht
  nur Erstdurchgang, anders als `replanning.ts`s bewusst engerer Fokus),
  korrigiert um Schwierigkeits-Feedback: `FEEDBACK_MASTERY_WEIGHT = 0,15`
  (neu, wie `EXAM_FORMAT_MULTIPLIER` in `estimation.ts` erfunden, aber
  benannt und auffindbar exportiert statt versteckter Magic Number — nichts
  in DATA_MODEL.md beziffert diese Korrektur). „Zu schwer" drückt die
  Erledigungsquote um bis zu 15 Prozentpunkte, „zu leicht" hebt sie an,
  gekappt auf `[0, 1]`.
- **`computePreparedness`**: Σ(mastery × weight) / Σ(weight), über eine vom
  Aufrufer übergebene Themenliste (nicht aus `study_blocks` abgeleitet) —
  ein Thema **ohne** jeden Block zählt bewusst mit `mastery = 0`, statt im
  Ergebnis zu fehlen; sonst sähe „noch nie angefangen" aus wie „nicht
  relevant". `mastery` je Thema kommt dabei nur aus Blöcken der
  übergebenen `assessmentId` — dieselbe Vereinfachung wie die „nächste
  bevorstehende Prüfung"-Wahl in `planBuilder.ts`, ein Thema über mehrere
  Prüfungen hinweg zu verfolgen bräuchte eine Zuordnung, die das Schema
  nicht vorsieht.
- **`suggestNextTopic`**: `max(weight × (1 − mastery))`, stabil bei
  Gleichstand (zuerst übergebenes Thema gewinnt, keine versteckte
  Zufallsreihenfolge).
- **`ui/ProgressView.tsx`**: pro bevorstehender Prüfung (Datum ≥ `from`)
  Vorbereitungsgrad in Prozent plus „Nächster Schritt: <Thema>". Themen je
  Prüfung werden einfach über `topic.course_id === assessment.course_id`
  bestimmt (**alle** Themen des Fachs, nicht nur bereits verplante) — reiner
  Filter in der Komponente, keine eigene Berechnung (ARCHITECTURE.md
  „ui/"). In `App.tsx` direkt nach `PlanView` eingehängt.
- 20 neue Tests (16 `progress.test.ts`, 4 `ProgressView.test.tsx`). Live im
  Dev-Server geprüft: Fach + Prüfung angelegt, „Fortschritt" zeigt korrekt
  „Endklausur (2026-08-10)" mit „Noch keine Themen für dieses Fach." (da
  noch kein PDF importiert), keine Konsolenfehler.
- **Nicht mitgebaut:** Die in `replanning.ts` dokumentierte
  Fortführungslücke (Wiederholung nach abgeschlossenem Erstdurchgang) bleibt
  weiterhin offen — `progress.ts` berechnet mastery unabhängig von dieser
  Terminierungsfrage, löst sie nicht mit. Wurde bei der Schrittwahl als
  möglicher Nebeneffekt vermutet, hat sich beim Bauen aber nicht ergeben:
  beide Module bleiben unabhängig, wie ARCHITECTURE.md es für `domain/`
  vorsieht (keine Modul-Abhängigkeiten untereinander außer über die
  aufrufende Schicht).

Direkt im Anschluss, Branch `feat/pdf-viewer` (von `main` abgezweigt):
„PDF-Viewer mit Seitensprung" — bewusst als reiner `ui/`-Umfang gelesen
(ein Viewer, der zu einer Seite springen kann), nicht als „Klick auf ein
Thema navigiert automatisch zur richtigen Prüfungs-/Kalenderintegration"
o. Ä. Ausgewählt, weil er **keine** neue Abhängigkeit braucht (anders als
Lokale Benachrichtigungen/Kalender-Export, siehe unten) — `pdfjs-dist` ist
bereits Abhängigkeit von `ingest/pdf.ts`, hier erstmals für echtes
**Rendern** (`page.render`) statt nur Textextraktion verwendet.

- **`ui/PdfViewer.tsx`**: rendert eine Seite eines im Speicher gehaltenen
  PDFs (`Uint8Array`) auf ein Canvas. Vor/Zurück-Buttons (an den
  Dokumentgrenzen deaktiviert) plus ein Eingabefeld, das direkt zu einer
  Seitenzahl springt (außerhalb des gültigen Bereichs auf `[1, numPages]`
  gekappt). Übernimmt den Worker-Setup-Kommentar/-Guard wörtlich aus
  `ingest/pdf.ts` (`typeof window`-Guard, sonst wirft `getDocument` unter
  Vitest/Node keinen Fehler wegen des „Fake Worker"-Fallbacks von pdf.js).
  5 Tests (`pdfjs-dist` komplett gemockt, `canvas.getContext('2d')` ist in
  jsdom ohnehin `null` ohne das `canvas`-npm-Paket — die Komponente
  überspringt das eigentliche Rendern in dem Fall bewusst still, statt
  abzustürzen, siehe Kommentar im Code).
- **`ui/SourceViewer.tsx`**: verbindet Themenbaum und Viewer — pro
  `topic_section` ein Eintrag mit Themenname und Seitenbereich, „Im PDF
  ansehen" öffnet den `PdfViewer` direkt auf `page_start`. Das ist der
  eigentliche „Seitensprung": `topic_sections` trägt `document_id` und
  Seitenzahlen bereits (siehe DATA_MODEL.md), keine neue Datenstruktur
  nötig. Zeigt einen Hinweis statt abzustürzen, wenn die PDF-Bytes für ein
  Dokument nicht (mehr) vorliegen (siehe `App.tsx` unten). 5 Tests
  (`PdfViewer` darin gemockt, damit `SourceViewer`s eigene Logik isoliert
  getestet wird).
- **`App.tsx`**: neuer `documentBytes`-Zustand (`Record<documentId,
  Uint8Array>`), beim PDF-Import zusätzlich zur Extraktion befüllt — bisher
  wurden die rohen Bytes nach der Extraktion verworfen. **Bewusste
  Einschränkung, konsistent mit dem Rest von `App.tsx`:** nur für die
  laufende Sitzung im Speicher, keine echte Persistenz (`documents.
  stored_path` im Schema ist dafür vorgesehen, aber ungenutzt, bis der
  Tauri-Rahmen echte Dateisystem-Zugriffe hat) — `SourceViewer` zeigt in
  dem Fall den oben genannten Hinweis statt eines Absturzes.
- **Nicht Teil dieses Schritts:** ein Klick auf ein Thema in `TopicTree`
  direkt zum `SourceViewer` verlinken (aktuell zwei getrennte Bereiche in
  `App.tsx`) — wäre ein Komfortgewinn, aber `TopicTree` ist eine
  abgeschlossene, bereits getestete Komponente; eine engere Kopplung hier
  hineinzubauen war nicht Teil des Roadmap-Punkts.
- **Live im Dev-Server geprüft:** „Quellen"-Bereich zeigt korrekt „Noch
  keine Materialien importiert.", keine Konsolenfehler. **Nicht möglich:**
  ein echter PDF-Import über die Browser-Automatisierung (dieselbe
  Datei-Sandbox-Einschränkung wie beim Heute-Ansicht-Schritt, siehe dort) —
  das eigentliche Rendern (`page.render` auf ein echtes Canvas) ist damit
  nur über die gemockten Komponententests abgedeckt, nicht am echten
  Material verifiziert. Bekannte Lücke, wie schon beim PDF-Import-
  Plausibilitätscheck zuvor dokumentiert.

Direkt im Anschluss, Branch `feat/course-export` (von `main` abgezweigt):
„Kurs-Export/Import" (CONTEXT.md „Anforderungen": „Austausch: Kurs-Export
als Datei"; SECURITY.md: „Der Kurs-Export … ist die einzige Möglichkeit,
Arbeit zu sichern" — dient also zugleich dem Austausch zwischen den beiden
Nutzern und als einziges Backup).

- **`data/courseExport.ts`** (`exportCourse`, `importCourse`,
  `serializeCourseExport`, `deserializeCourseExport`): Export-Bundle pro
  Fach enthält `course`, `topics` (mit Hierarchie), `topicSections`,
  `assessments`, **und `study_blocks`** — letzteres bewusst, weil das die
  tatsächliche „Arbeit" aus SECURITY.md ist (geplante/erledigte Sitzungen
  samt Feedback), nicht nur Kursstruktur.
  - **Bewusst NICHT enthalten: die PDF-Dateien selbst.** SECURITY.md ist
    eindeutig: „Unterlagen … sind urheberrechtlich geschützt … Weitergabe
    häufig ausdrücklich untersagt". `topic_sections.document_id` bleibt
    als reine Zahl erhalten, zeigt nach dem Import ins Leere —
    `SourceViewer` behandelt fehlende PDF-Bytes bereits als regulären Fall
    (siehe letzter Schritt), kein Absturz.
  - **Bewusst NICHT enthalten (zweiter Grund): `documents`-Metadaten
    selbst** — `App.tsx` hält aktuell keine `Document[]`-Liste im Zustand
    (nur `topics`/`topicSections`), das nachzuziehen wäre eine eigene
    Erweiterung. Auch nicht enthalten: `plan_versions`, `calibration`,
    `ai_usage`, `settings` — Verlaufs-/Kalibrierungsdaten, die nach einem
    ID-Remapping nicht mehr sinnvoll wären bzw. rein persönlich sind.
  - **`importCourse` schreibt jeden Fremdschlüssel auf neue, an den
    lokalen Bestand anknüpfende IDs um** (`course_id`, `topic_id`,
    `parent_id` — zweiter Durchgang nötig, weil ein Thema auf ein im
    Bundle-Array später stehendes Elternthema verweisen kann —,
    `assessment_id`). **Bewusst einfach:** legt immer ein **neues** Fach
    an, auch bei Namensgleichheit — kein Zusammenführen/Konfliktauflösung,
    analog zu `materializeStudyBlocks`s „bewusst einfach" beim
    „Plan übernehmen"-Schritt.
  - `deserializeCourseExport` prüft nur ein `version`-Feld, keine tiefere
    Schema-Validierung — für ein internes Austauschformat zwischen zwei
    Nutzern derselben App-Version ausreichend, keine Fremdformat-Härtung
    nötig.
  - 10 Tests, u. a. Rundreise über JSON, ID-Remapping inkl. Eltern-Kind-
    Beziehung, Anknüpfen an einen nicht-leeren Bestand, unbekannte
    Export-Version.
- **`ui/CourseExportImport.tsx`**: Fach-Auswahl + „Exportieren" löst einen
  Browser-Download aus (`Blob` + `URL.createObjectURL` + programmatischer
  Klick auf ein `<a download>` — kein `tauri-plugin-fs` vor dem echten
  Rahmen, wie der PDF-Import). Datei-Input für den Import, zeigt eine
  Fehlermeldung statt abzustürzen, wenn die Datei kein gültiger Export ist.
  4 Tests (`URL.createObjectURL`/`revokeObjectURL`/`HTMLAnchorElement.
  prototype.click` gemockt, da in jsdom nicht implementiert).
  In `App.tsx` als letzte Sektion eingehängt (passt zu SECURITY.md „Kurs-
  Export in den Einstellungen").
- **Live im Dev-Server geprüft:** Fach angelegt, Export-Button geklickt —
  keine Konsolenfehler, App bleibt intakt (stärkster verfügbarer Nachweis
  für den Download-Ablauf ohne ein Downloads-Verzeichnis einsehen zu
  können). Import selbst nur über die Komponententests geprüft (bräuchte
  eine echte heruntergeladene Datei zum erneuten Hochladen, was denselben
  Download-Nachweis voraussetzt).

Direkt im Anschluss, Branch `feat/notifications` (von `main` abgezweigt):
„Lokale Benachrichtigungen" — nach Rückfrage beim Nutzer (siehe oben:
„Ja, Plugin hinzufügen" für die neue Abhängigkeit).

- **Neue Abhängigkeiten, nach Rückfrage/Freigabe:** `@tauri-apps/plugin-
  notification` (npm) und `tauri-plugin-notification = "2"` (Cargo),
  Plugin in `src-tauri/src/lib.rs` registriert (`.plugin(tauri_plugin_
  notification::init())`), Berechtigung `notification:default` in
  `src-tauri/capabilities/default.json` ergänzt. `cargo check --locked`
  (dieselbe Prüfung wie der CI-Job `tauri`, siehe CONTEXT.md „Sonstiges für
  den Wiedereinstieg") läuft fehlerfrei durch — vollständiger Bundle-Build
  nicht erneut angestoßen (bekanntes DMG-Problem, siehe Abschnitt 8 oben,
  irrelevant für diese Prüfung).
- **`src/platform/` neu angelegt** — erster Baustein dieser bisher nur in
  ARCHITECTURE.md beschriebenen Schicht („Benachrichtigungen,
  Dateisystem, Kalender-Export … gekapselt, damit eine spätere
  iOS-Version nicht die halbe App anfassen muss").
  `platform/notifications.ts` ist ein dünner Wrapper um das Tauri-Plugin
  (`ensureNotificationPermission`, `showNotification`) — die einzige
  Datei, die die neue Abhängigkeit importiert.
- **`domain/notifications.ts`**: reine Entscheidungslogik, kein
  Tauri-Bezug. Genau zwei Benachrichtigungsarten
  (`tagesuebersicht`/`faelligkeit`, je höchstens einmal pro Tag) — erfüllt
  CONTEXT.md Abschnitt 5s „höchstens zwei Benachrichtigungen pro Tag"
  **strukturell**, ohne eigene Zähllogik. `buildDailyOverviewNotification`
  fasst heutige offene Blöcke (Anzahl, Minuten, eindeutige Themennamen)
  zusammen, `buildDueSoonNotification` meldet Prüfungen innerhalb von
  `DEFAULT_DUE_SOON_DAYS = 3` (nirgends in den Anforderungen beziffert,
  erfunden wie `EXAM_FORMAT_MULTIPLIER`/`FEEDBACK_MASTERY_WEIGHT` an
  anderer Stelle — benannt, auffindbar, überschreibbar). 11 Tests.
- **`ui/NotificationsPanel.tsx`**: Button „Jetzt prüfen" statt echtem
  Hintergrund-Trigger — `App.tsx` hat keinen Scheduler
  (kein `tauri-plugin-cron` o. Ä.), ein täglicher Hintergrund-Check ist
  eine spätere Erweiterung, kein Teil dieses Schritts. Zeigt gezeigte
  Benachrichtigungen oder eine Fehlermeldung, falls `onCheckNow` wirft. 3
  Tests.
- **`App.tsx`**: neuer `notificationLog`-Zustand (`NotificationKind` →
  zuletzt gezeigtes Datum, wie das `ai_budget_last_notified_*`-Muster aus
  ADR-007), `checkNotifications()` verbindet `domain/notifications.ts` mit
  `platform/notifications.ts`.
- **Live im Dev-Server geprüft (kein echtes Tauri-Fenster):** Fach +
  Prüfung 2 Tage in der Zukunft angelegt, „Jetzt prüfen" geklickt — **kein
  Fehler**, `isPermissionGranted()`/`requestPermission()` lösen sich
  außerhalb der echten App zu „nicht erteilt" auf statt zu werfen,
  `checkNotifications` liefert dann `[]`, „Keine neuen Benachrichtigungen"
  wird angezeigt. Ruhiger als angenommen (siehe Kommentar in
  `platform/notifications.ts`) — kein Absturz, keine Konsolenfehler.
  **Noch nicht geprüft:** eine echte Benachrichtigung im tatsächlichen
  Tauri-Fenster (`npx tauri dev`, System-Dialog zur Erlaubnis bestätigen) —
  bräuchte eine interaktive macOS-Berechtigung, die diese Sitzung nicht
  autonom erteilen kann. Bekannte Lücke, wie schon beim PDF-Import/
  PDF-Rendering zuvor dokumentiert.

Direkt im Anschluss, Branch `feat/calendar-export` (von `main` abgezweigt):
„Kalender-Export" (ADR-006 „Einseitiger Kalenderexport") — nach Rückfrage
beim Nutzer zur Uhrzeit-Frage: feste, einstellbare tägliche Startzeit,
Blöcke eines Tages lückenlos hintereinander (siehe Antwort oben). Damit ist
ROADMAP.md Phase 3 „Alltag" **vollständig abgeschlossen**.

- **`platform/calendarExport.ts`** (`buildCalendarEvents`,
  `serializeIcs`): reine ICS-Erzeugung (RFC 5545), keine Tauri-Plugin-/
  OS-Abhängigkeit nötig — anders als `notifications.ts`, aber laut
  ARCHITECTURE.md trotzdem in `platform/`, nicht `domain/` (dort explizit
  „Kalender-Export" gelistet). Nur `study_blocks` mit Status `offen`
  fließen ein — Erledigtes/Gestrichenes braucht keinen Kalendereintrag
  mehr.
  - **Uhrzeit-Berechnung:** pro Tag werden die offenen Blöcke nach
    `planned_order` sortiert und ab der übergebenen Startzeit lückenlos
    aneinandergereiht (`Ende eines Blocks = Start des nächsten`) — kein
    neues Schema-Feld, die Uhrzeit ist ein rein abgeleiteter Wert beim
    Export, analog zu `mastery`/Vorbereitungsgrad in `progress.ts`
    (DATA_MODEL.md „Abgeleitete Werte": Speichern würde bei jeder
    Neuplanung veralten).
  - **Bewusst „floatende" Uhrzeiten** (kein `Z`, keine `TZID`) für
    `DTSTART`/`DTEND` — beide Nutzer lernen in derselben Zeitzone
    (CONTEXT.md „Nutzer": WHU), eine echte Zeitzonen-Behandlung wäre reine
    Komplexität ohne Nutzen. `DTSTAMP` ist die einzige Ausnahme (echter
    UTC-Zeitpunkt mit `Z`, wie RFC 5545 es für den Erzeugungszeitpunkt
    verlangt).
  - 9 Tests, u. a. lückenloses Aneinanderreihen unabhängig von der
    Eingabe-Reihenfolge, tagesweise getrennte Berechnung, Maskierung von
    Sonderzeichen (`;`, `,`, Zeilenumbruch) in `SUMMARY`/`DESCRIPTION`.
- **`ui/CalendarExport.tsx`**: Eingabe für die tägliche Startzeit (lokaler
  Zustand, Default 09:00) plus „Exportieren" (deaktiviert ohne offene
  Blöcke) — Download über dasselbe Blob-Verfahren wie Kurs-Export.
  **`ui/triggerDownload.ts` neu extrahiert** (geteilt mit
  `CourseExportImport.tsx`, das jetzt ebenfalls darauf zeigt) — zweites
  Auftreten desselben Download-Musters, gleich zusammengefasst statt
  auf ein drittes zu warten wie bei `KIND_LABELS`. 3 Tests, davon einer,
  der den tatsächlichen `Blob`-Inhalt ausliest und prüft, dass eine
  geänderte Startzeit korrekt im `DTSTART` landet.
- **`App.tsx`**: `CalendarExport` zwischen `NotificationsPanel` und
  `CourseExportImport` eingehängt.
- **Live im Dev-Server geprüft:** „Kalender-Export"-Bereich zeigt korrekt
  den leeren Zustand („Noch keine offenen Lernblöcke …", „Exportieren"
  deaktiviert), Startzeit-Feld zeigt „09:00", keine Konsolenfehler. Ein
  echter Export mit realen Daten war wie beim PDF-Import zuvor nicht über
  die Browser-Automatisierung möglich (Datei-Sandbox verhindert echtes
  PDF-Material) — dafür deckt ein Komponententest den `Blob`-Inhalt direkt
  ab (liest ihn aus, prüft `DTSTART` gegen eine geänderte Startzeit).

**ROADMAP.md Phase 3 „Alltag" ist damit vollständig** (alle sieben Punkte
erledigt). Vor Phase 4 kurz innehalten, siehe „Danach" unten.

**Antwort des Nutzers auf die obige Rückfrage:** zuerst den Rahmen härten
(echte Persistenz), danach Phase 4 der Reihe nach abarbeiten. Beides jetzt
in Arbeit, siehe unten.

### Persistenz-Härtung — Baustein 1: `tauri-plugin-sql` angebunden

Branch `feat/persistence-sql-plugin` (von `main` abgezweigt). Bisher ist
der komplette Zustand in `App.tsx` nur In-Memory React-State (siehe
Kommentar dort) — dieser Baustein schließt die Lücke schrittweise, siehe
„Nächster Schritt" für den Rest des Plans.

- **Neue Abhängigkeit, nach Rückfrage/Freigabe:** `@tauri-apps/plugin-sql`
  (npm) und `tauri-plugin-sql` (Cargo, Feature `sqlite`).
- **Migrationen laufen über den plugin-eigenen Mechanismus, kein eigener
  Runner nötig:** `src-tauri/src/lib.rs` bindet `src/data/migrations/
  0001_init.sql`/`0002_ai_usage.sql` per `include_str!` als
  `tauri_plugin_sql::Migration`-Einträge ein und übergibt sie
  `Builder::add_migrations("sqlite:lernplaner.db", …)` — das Plugin verfolgt
  selbst, welche Version schon angewendet wurde (eigene interne
  Trackingtabelle). Dieselben `.sql`-Dateien bleiben unverändert die
  Grundlage für `tests/data/schema.test.ts` (dort weiterhin gegen
  `better-sqlite3` geprüft, ohne Tauri-Laufzeit) — **eine** Quelle für das
  Schema, zwei Verifikationswege.
- **Berechtigungen** `sql:default`, `sql:allow-execute`, `sql:allow-select`
  in `src-tauri/capabilities/default.json` ergänzt.
- **`src/data/db.ts`** neu: `getDb()` (Lazy-Singleton-Verbindung,
  Datenbankname `sqlite:lernplaner.db` muss mit `lib.rs` übereinstimmen)
  sowie das `SqlConnection`-Interface (`execute`/`select`) als schmale
  Schnittstelle für kommende `data/*Repo.ts`-Module — noch **nicht**
  benutzt, reine Grundlage für die folgenden Schritte. Einzige Datei, die
  `@tauri-apps/plugin-sql` importiert (wie `platform/notifications.ts` für
  das Notification-Plugin).
- **`cargo check --locked` läuft fehlerfrei**, ebenso `npm run build`
  (Vite-Bundle unverändert erfolgreich, `db.ts` ist noch von nirgends
  importiert). Kein Plausibilitätscheck im Dev-Server nötig für diesen
  Schritt — keine UI-Änderung, `db.ts` wird erst in den folgenden Schritten
  tatsächlich verdrahtet. Funktioniert ohnehin nur im echten Tauri-Fenster
  (IPC-Bridge fehlt im Browser, dieselbe Einschränkung wie bei den
  Benachrichtigungen) — auch dort noch nicht manuell geprüft.

### Persistenz-Härtung — Baustein 2: Fächer echt in SQLite

Branch `feat/persistence-courses` (von `main` abgezweigt). Erste
tatsächlich umgestellte Entität — Fächer, wie geplant die einfachste
(keine Fremdschlüssel auf andere frisch persistierte Tabellen).

- **`tests/data/testConnection.ts` neu**: `SqlConnection`-Implementierung
  über `better-sqlite3` (frische In-Memory-DB, beide Migrationen
  angewendet) — **echtes SQL**, kein Mock. Geteilt zwischen allen
  kommenden `data/*Repo.ts`-Tests, damit nicht jede Datei die
  Migrations-Dateien selbst einliest. Das ist der Testweg, der bei
  `platform/notifications.ts` fehlte (dort gibt es keine SQL-Logik zu
  testen, nur einen dünnen Plugin-Aufruf) — hier lässt sich die
  eigentliche SQL-Korrektheit echt prüfen, nur die Tauri-IPC-Bridge
  selbst bleibt ungeprüft.
- **`SqlConnection` in `data/db.ts` korrigiert:** `execute()`s
  `lastInsertId` ist **optional** (`lastInsertId?: number`), passend zu
  `@tauri-apps/plugin-sql`s echtem `QueryResult`-Typ (fehlt z. B. bei
  UPDATE/DELETE) — beim ersten Verdrahten mit dem echten Paket aufgefallen
  (Typfehler), im ursprünglichen `db.ts`-Entwurf noch als Pflichtfeld
  angenommen.
- **`data/coursesRepo.ts`** (`loadCourses`, `insertCourse`,
  `updateCourseRow`, `setCourseArchivedRow`, `deleteCourseRow`): echte
  SQL-Operationen über `SqlConnection`. `insertCourse` liefert die
  **echte** `AUTOINCREMENT`-`id` zurück statt sie zu raten. 6 Tests.
- **`data/courses.ts` verkleinert:** `addCourse`/`nextId` entfernt (lokales
  Raten einer `id` wäre jetzt schlicht falsch, nicht mehr nur vorläufig) —
  `updateCourse`/`setCourseArchived`/`removeCourse` bleiben (keine
  `id`-Vergabe nötig, weiterhin nützlich fürs lokale Nachziehen des
  React-Zustands nach einem erfolgreichen DB-Write, siehe `App.tsx`).
  Zugehöriger Test entsprechend angepasst (Fixture statt `addCourse` zum
  Aufbauen der Testdaten).
- **`ui/CourseSetup.tsx`s API geändert:** ein einzelnes `onChange(courses:
  Course[])` (der Komponente unbekannt, *welche* Änderung geschah) durch
  vier explizite Callbacks ersetzt (`onAdd`/`onUpdate`/`onArchive`/
  `onRemove`) — der Aufrufer muss jetzt wissen, welche SQL-Operation zu
  welcher Aktion gehört, das ließ sich aus einem fertigen Array nicht mehr
  ableiten. `now`-Prop entfernt (Zeitstempel entsteht jetzt beim
  tatsächlichen DB-Write in `App.tsx`, nicht mehr in der Komponente).
  7 bestehende Tests entsprechend umgeschrieben (prüfen jetzt den
  jeweiligen Callback-Aufruf statt des fertigen Arrays).
- **`App.tsx`**: `useEffect` lädt Fächer beim Start (`getDb().then(loadCourses)`),
  vier Handler (`handleAddCourse` usw.) rufen jeweils die Repo-Funktion
  auf und ziehen bei Erfolg den lokalen Zustand nach (`updateCourse`/
  `setCourseArchived`/`removeCourse` aus `data/courses.ts` fürs
  Nachziehen, `insertCourse`s Rückgabewert direkt fürs Anhängen). Jeder
  Handler fängt Fehler ab und loggt sie (`console.error`) statt
  abzustürzen — nötig, weil `getDb()` außerhalb des echten Tauri-Fensters
  immer fehlschlägt (siehe Plausibilitätscheck unten).
- **Live im Dev-Server geprüft (kein echtes Tauri-Fenster):** Fach über
  das Formular angelegt — Konsole zeigt den erwarteten, abgefangenen
  Fehler („Cannot read properties of undefined (reading 'invoke')", exakt
  dieselbe fehlende IPC-Bridge wie bei den Benachrichtigungen), **kein
  Absturz**, und — wichtig — das Fach erscheint korrekt **nicht** in der
  Liste (kein optimistisches Update ohne erfolgreichen DB-Write, UI bleibt
  konsistent mit dem tatsächlichen, nicht gespeicherten Zustand). **Noch
  nicht geprüft:** echte Persistenz im tatsächlichen Tauri-Fenster
  (`npx tauri dev`) — bräuchte einen laufenden nativen Fensterprozess, den
  diese Sitzung nicht ohne Weiteres automatisiert bedienen kann (bekannte
  Lücke, wie schon bei den Benachrichtigungen).

### Persistenz-Härtung — Baustein 3: Prüfungen echt in SQLite

Branch `feat/persistence-assessments` (von `main` abgezweigt). Zweite
umgestellte Entität, exakt nach dem Muster von Baustein 2 (Fächer).

- **`data/assessmentsRepo.ts`** (`loadAssessments`, `insertAssessment`,
  `updateAssessmentRow`, `deleteAssessmentRow`) — kein „archived"-Konzept
  bei Prüfungen (anders als Fächer), deshalb kein Analogon zu
  `setCourseArchivedRow`. 5 Tests über `tests/data/testConnection.ts`,
  inkl. eines Cascade-Tests (Löschen des Fachs löscht auch dessen
  Prüfungen, `ON DELETE CASCADE`).
- **`data/assessments.ts` verkleinert:** `addAssessment`/`nextId` entfernt,
  aus demselben Grund wie bei `courses.ts` — `updateAssessment`/
  `removeAssessment`/`assessmentsByCourse` (reiner Anzeige-Filter, keine
  Mutation) bleiben.
- **`ui/AssessmentSetup.tsx`s API geändert:** `onChange(assessments)` durch
  `onAdd`/`onUpdate`/`onRemove` ersetzt, exakt wie bei `CourseSetup.tsx`.
  5 bestehende Tests entsprechend umgeschrieben.
- **`App.tsx`**: zweiter `useEffect` lädt Prüfungen beim Start
  (unabhängig vom Fächer-`useEffect`, beide laufen parallel), drei Handler
  nach demselben Fehlerbehandlungs-Muster (Repo-Aufruf, bei Erfolg
  lokalen Zustand nachziehen, bei Fehler `console.error` statt Absturz).
- **Live im Dev-Server geprüft:** kein Absturz nach dem Umbau, App lädt
  sauber. **Hinweis für künftige Plausibilitätschecks:** die Browser-
  Konsole dieser Sitzung hat über einen `preview_stop`/`preview_start`-
  Zyklus hinweg alte Fehlermeldungen behalten (aus dem vorigen
  Baustein-2-Check) — erst ein echtes `navigate` mit `force: true` auf
  dieselbe URL hat den Zustand sichtbar aufgeräumt und den tatsächlich
  aktuellen (fehlerfreien) Zustand gezeigt. Beim nächsten Baustein direkt
  nach dem `preview_start` einmal neu laden, um nicht versehentlich einen
  alten Fehler für einen neuen zu halten.

### Persistenz-Härtung — Baustein 4: Verfügbarkeit echt in SQLite

Branch `feat/persistence-availability` (von `main` abgezweigt). Dritte
umgestellte Entität — anders als Fächer/Prüfungen ohne `AUTOINCREMENT`.

- **`availability_pattern`/`availability_exception` tragen ihren
  fachlichen Schlüssel als Primärschlüssel** (`weekday` bzw. `date`,
  `0001_init.sql`) — „Anlegen" ist hier immer ein SQL-`UPSERT`
  (`INSERT … ON CONFLICT DO UPDATE`), kein reines `INSERT`. Deshalb **kein**
  Analogon zum courses/assessments-Muster nötig: `data/availability.ts`s
  reine Funktionen (`setAvailabilityPattern`/`setAvailabilityException`/
  `removeAvailabilityException`) waren schon immer Upserts, kein
  `addX`/`nextId` zu entfernen — sie bleiben unverändert, `App.tsx` nutzt
  sie weiterhin fürs lokale Nachziehen nach einem erfolgreichen DB-Write.
- **`data/availabilityRepo.ts`** (`loadAvailabilityPattern`,
  `upsertAvailabilityPatternRow`, `loadAvailabilityExceptions`,
  `upsertAvailabilityExceptionRow`, `deleteAvailabilityExceptionRow`).
  6 Tests über `tests/data/testConnection.ts`, u. a. dass ein zweiter
  Upsert auf denselben Wochentag/dasselbe Datum die Zeile ersetzt statt
  eine zweite anzulegen (Primärschlüssel-Verhalten).
- **`ui/AvailabilitySetup.tsx`s API geändert:** `onChangePattern`/
  `onChangeExceptions` (ganzes Array) durch drei Callbacks ersetzt
  (`onSetPatternMinutes(weekday, minutes)`, `onAddException(date, minutes,
  note)`, `onRemoveException(date)`) — konsistent mit `CourseSetup`/
  `AssessmentSetup`, obwohl hier keine `id`-Vergabe im Spiel ist: die
  Komponente soll `data/availability.ts`/`-Repo.ts` trotzdem nicht direkt
  kennen. 5 bestehende Tests entsprechend umgeschrieben.
- **`App.tsx`**: dritter `useEffect` lädt Wochenmuster **und** Ausnahmen
  parallel beim Start (`Promise.all`), drei Handler nach demselben
  Fehlerbehandlungs-Muster.
- **Wichtiger Befund zum Plausibilitätscheck-Vorgehen selbst:** die zuvor
  dokumentierte Abhilfe „nach `preview_start` einmal mit `force: true`
  neu laden" hat **nicht** gereicht — dieselbe alte Fehlermeldung aus dem
  vorigen Baustein blieb auf dem wiederverwendeten Tab „seed" bestehen,
  trotz Force-Reload. Eine **komplett neue Tab** (`tabs_create`) hat das
  Problem behoben und sofort den echten, fehlerfreien Zustand gezeigt.
  **Für künftige Plausibilitätschecks: nach `preview_start` einen neuen
  Tab anlegen statt den alten „seed"-Tab wiederzuverwenden**, wenn schon
  einmal ein Fehler in einer früheren Sitzung auf diesem Tab aufgetreten
  ist — Force-Reload allein reicht nicht zuverlässig.
- **Live im frischen Tab geprüft:** Wochentag-Minuten geändert — Konsole
  zeigt exakt die erwartete, abgefangene Fehlermeldung
  („Wochenmuster konnte nicht gespeichert werden"), kein Absturz, Eingabe
  fällt korrekt auf „0" zurück (kein optimistisches Update ohne
  erfolgreichen DB-Write).

### Persistenz-Härtung — Baustein 5: Themen/Themenabschnitte echt in SQLite

Branch `feat/persistence-topics` (von `main` abgezweigt). Vierte
umgestellte Entität, deutlich komplexer als Bausteine 2-4, weil zwei
Fragen zugleich zu lösen waren: (a) wie Baum-Operationen auf `topics`
(nicht nur einzelne Zeilen) in SQL abgebildet werden, (b) dass
`topic_sections.document_id NOT NULL REFERENCES documents(id)` erzwingt,
dass jetzt auch `documents`-Metadaten echt persistiert werden — beides war
vorher nur als vage Option offengehalten.

- **`data/documentsRepo.ts`** (neu): `loadDocuments`, `insertDocument` —
  nur Insert/Select, kein Update/Delete (Dokumente werden nie bearbeitet,
  nur neu importiert). Musste gebaut werden, weil `topic_sections` sonst
  auf eine nicht existierende `document_id` gezeigt hätte — der
  Fremdschlüssel im Test-Setup (`PRAGMA foreign_keys = ON`) hätte das
  sofort aufgedeckt. **PDF-Rohbytes bleiben bewusst In-Memory**
  (`documentBytes` in `App.tsx`, siehe SECURITY.md) — nur die Metadaten
  (Dateiname, sha256, Seiten-/Folienzahl, Zeichenzahl) landen in der DB;
  `stored_path` trägt vorerst einen Platzhalter (`in-memory://<filename>`),
  eine echte Dateisystem-Ablage ist eine spätere Erweiterung.
- **`data/topicsRepo.ts`** (neu): `loadTopics`, `insertTopic`,
  `updateTopicRow`, `deleteTopicRow` sowie der zentrale Baustein
  `syncTopics(conn, before, after)` — vergleicht den alten mit dem neuen
  `Topic[]`-Stand und wendet nur die Differenz als gezielte
  `UPDATE`/`DELETE`-Statements an. **Bewusste Entscheidung gegen** das
  Callback-Muster von Fächern/Prüfungen/Verfügbarkeit: `moveTopic`
  (`topicTree.ts`) kann bei einer einzigen Nutzeraktion mehrere Zeilen
  gleichzeitig ändern (Geschwister-Neunummerierung über zwei
  Elternebenen hinweg) — das als einzelne SQL-Operation nachzubilden hätte
  `topicTree.ts`s bereits korrekte Logik dupliziert. `ui/TopicTree.tsx`
  behält deshalb sein ursprüngliches `onChange(gesamtesArray)`-Signatur
  unverändert bei; `App.tsx` diffed vorher/nachher und persistiert nur die
  Differenz.
- **`data/topicSectionsRepo.ts`** (neu): `loadTopicSections`,
  `insertTopicSection` — nur Insert/Select, `topic_sections` sind
  import-only und kaskadieren mit ihrem `topic` (Fremdschlüssel).
- **`data/importTopics.ts`** komplett überarbeitet: die alte, nie
  tatsächlich angebundene `SqlExecutor`/`importExtractedDocument`-Variante
  sowie die reine Array-Variante `topicsFromExtractedDocument` entfernt
  (vor dem Löschen per Grep über `src/`, `tests/`, `scripts/` geprüft —
  `scripts/preview-import.ts` war ein echter, weiterhin genutzter
  Verbraucher und musste stattdessen mitgezogen werden). Neu:
  `computeSha256` (Web-Crypto-API, keine neue Abhängigkeit) und
  `persistExtractedDocument(conn, courseId, extracted, meta, importedAt)`
  — legt `document`, dann je Kapitel ein `topic` und (falls Folien
  vorhanden) eine `topic_section` an, mit den echten, sequenziell von der
  DB vergebenen IDs. Kein ID-Remapping nötig (anders als beim
  Kurs-Export/Import), weil hier nichts vorab lokal mit geratenen IDs
  berechnet wird.
- **`App.tsx`**: `handleChangeTopics` ruft `syncTopics` auf und zieht
  `topicSections` entsprechend nach; `importPdfs` ruft jetzt
  `persistExtractedDocument` auf statt lokal IDs zu vergeben.
  `nextDocumentId`-State entfernt (nicht mehr nötig). Bestehendes,
  bekanntes **Lücke, bewusst nicht in diesem Baustein geschlossen**:
  Kurs-Export/Import (`applyCourseImport`) geht für **keine** Entität
  durch die Repo-/Persistenzschicht — ein importierter Kurs existiert nur
  für die laufende Sitzung, nicht dauerhaft in der DB. Diese Lücke
  besteht seit Baustein 2 (Fächer) und betrifft jetzt auch Themen; sie zu
  schließen wäre eine eigene, größere Aufgabe (Import müsste transaktional
  über mehrere Repos hinweg schreiben) und würde diesen Baustein sprengen.
- **34 neue/umgeschriebene Tests** (`documentsRepo.test.ts` 3,
  `topicsRepo.test.ts` 10, `topicSectionsRepo.test.ts` 3,
  `importTopics.test.ts` 6 umgeschrieben, plus bestehende
  `TopicTree.test.tsx` unverändert) über `tests/data/testConnection.ts`,
  u. a. Fremdschlüssel-Kaskaden und ein Test, der bestätigt, dass
  `syncTopics` eine `moveTopic`-Geschwister-Neunummerierung korrekt als
  mehrere `UPDATE`s anwendet.
- **Starker Plausibilitätscheck über `npm run preview-import`** (echtes
  `better-sqlite3`, keine Tauri-IPC-Einschränkung) gegen echtes Material
  (`Beispiel pdfs/Microeconomics/02 Consumer Theory 01.pdf` und
  `03 Producer Theory 01.pdf`) — bestätigt korrekte, sequenzielle
  `documentId`s (1, 2) und unveränderte Kapitel-zu-Thema-Zuordnung
  gegenüber der bereits validierten Phase-1-Ausgabe.
- **Im frischen Tab geprüft:** App lädt fehlerfrei (leerer Themenbaum, da
  frische/leere DB im Dev-Server-Kontext — erwartetes Verhalten, kein
  Fehler).

### Persistenz-Härtung — Baustein 6: Lernblöcke echt in SQLite

Branch `feat/persistence-studyblocks` (von `main` abgezweigt). Fünfte
umgestellte Entität. Anders als bei Themen (Baustein 5) entstehen hier
über **drei** verschiedene Nutzeraktionen laufend neue Zeilen mit lokalen
Platzhalter-`id`s (`data/studyBlocks.ts`s `materializeStudyBlocks` vergibt
sie fortlaufend, „kompatibel mit dem späteren `AUTOINCREMENT`-Verhalten" —
das war für genau diesen Baustein so vorbereitet): „Plan (neu)
übernehmen" (`generateStudyBlocks`), Neuberechnung übernehmen
(`ReplanView`/`applyReplan`) und Block abschließen (`TodayView`/
`completeStudyBlock`, hier ohne neue Zeilen, nur ein Update).

- **`data/studyBlocksRepo.ts`** (neu): `loadStudyBlocks`, `insertStudyBlock`,
  `updateStudyBlockRow`, `deleteStudyBlockRow` sowie `syncStudyBlocks(conn,
  before, after)`. **Wichtiger Unterschied zu `syncTopics`:** `syncTopics`
  legt bewusst nie neue Zeilen an (Themen entstehen ausschließlich über den
  PDF-Import). Bei Lernblöcken ist das Gegenteil der Fall — alle drei
  genannten Aktionen können neue Blöcke einbringen. `syncStudyBlocks` hat
  deshalb zusätzlich einen Insert-Zweig (Zeilen aus `after`, deren `id`
  nicht in `before` vorkommt) und liefert **die korrigierte Liste
  zurück**, in der die lokalen Platzhalter-`id`s durch die echten
  `AUTOINCREMENT`-`id`s ersetzt sind — nur diese, nicht `after`, darf
  anschließend als neuer React-Zustand übernommen werden, sonst würde ein
  späteres `completeStudyBlock(id)` oder ein erneutes `syncStudyBlocks` die
  falsche Zeile treffen.
- **Warum kein separates „Alles löschen, alles neu einfügen" für „Plan
  übernehmen" nötig war:** man könnte annehmen, ein voller Regenerierungs-
  Klick bräuchte einen Sonderfall (DELETE ALL + INSERT ALL), weil
  `materializeStudyBlocks` beim zweiten Aufruf wieder bei `id = 1`
  anfängt und damit zufällig mit echten, bereits vergebenen `id`s
  kollidieren kann. Bei näherer Prüfung ist das unschädlich: `syncStudyBlocks`
  behandelt eine solche `id`-Koinzidenz einfach als „diese Zeile hat sich
  komplett geändert" und schreibt sie per `UPDATE` auf die neuen
  Feldwerte — das Endergebnis in der DB ist feldweise identisch mit einem
  Löschen+Neuanlegen (nur die physische Zeilenidentität bleibt zufällig
  erhalten, was hier nirgends eine Rolle spielt, da nichts auf
  `study_blocks.id` verweist). **Ein einziger genereller Sync deckt daher
  alle drei Aktionen ab**, kein Sonderfall nötig.
- **`App.tsx`**: neuer gemeinsamer Handler `handleChangeStudyBlocks(next)`
  (analog `handleChangeTopics`), den `generateStudyBlocks`,
  `applyReplan` (App.tsx-Ebene, ruft weiterhin zuerst `recordPlanVersion`
  auf, unverändert lokal, siehe Baustein 7) und `TodayView`s `onChange`
  jetzt alle drei aufrufen, statt direkt `setStudyBlocks`. Vierter
  `useEffect`-Lader (`loadStudyBlocks`) analog zu den bisherigen Ladern.
  Bekannte Lücke (Kurs-Export/Import, siehe Baustein 2/5) erweitert:
  betrifft jetzt auch importierte Lernblöcke.
- **9 neue Tests** (`studyBlocksRepo.test.ts`) über `tests/data/testConnection.ts`,
  u. a.: Fremdschlüssel-Kaskade beim Löschen eines referenzierten Themas,
  `completeStudyBlock` als reines `UPDATE`, Neuanlegen mit echter statt
  Platzhalter-`id` (mit bewusst weit entferntem `startId`, um einen
  Koinzidenz-Fehlalarm auszuschließen), und ein voller
  Neuberechnungs-Szenario-Test (behält/löscht/legt neu an in einem
  Durchlauf).
- **Im frischen Tab geprüft:** Klick auf „Plan übernehmen" ohne echtes
  Tauri-Fenster — Konsole zeigt exakt die erwartete, abgefangene
  Fehlermeldung („Lernblöcke konnten nicht gespeichert werden"), kein
  Absturz, Button-Text bleibt „Plan übernehmen" (kein optimistisches
  Update ohne erfolgreichen DB-Write, wie bei den bisherigen Bausteinen).

### Persistenz-Härtung — Baustein 7: Planversionen echt in SQLite (Persistenz-Härtung abgeschlossen)

Branch `feat/persistence-planversions` (von `main` abgezweigt). Letzte
verbleibende Entität — mit Abstand der einfachste Baustein: `plan_versions`
ist ein reines Anhänge-Protokoll (ADR-005 „die vorige Fassung bleibt
erhalten"), nie Update oder Delete.

- **`data/planVersionsRepo.ts`** (neu): `loadPlanVersions`,
  `insertPlanVersion` — kein Update/Delete, da `plan_versions` nie
  bearbeitet oder gelöscht wird.
- **`data/planVersions.ts` (die alte reine `recordPlanVersion`-Funktion)
  entfernt**, inkl. ihres Tests (`tests/data/planVersions.test.ts`) — sie
  vergab eine rein lokale, fortlaufende Platzhalter-`id` (`versions.reduce
  (...) + 1`), die durch `insertPlanVersion`s echte `AUTOINCREMENT`-`id`
  vollständig ersetzt wird. Anders als bei Themen/Lernblöcken (wo die reine
  Funktion weiterhin für lokale lineare Zustandsberechnung gebraucht wird)
  gibt es hier keinen Grund, beide Varianten parallel zu halten — vor dem
  Löschen per Grep geprüft, dass `recordPlanVersion` nirgends sonst
  verwendet wurde.
- **`App.tsx`**: `applyReplan` ruft jetzt `insertPlanVersion` auf (mit dem
  `studyBlocks`-Stand *vor* der Änderung als `snapshot_json`, wie zuvor)
  und hängt das Ergebnis (echte `id`) direkt an den lokalen
  `planVersions`-Zustand an. Fünfter `useEffect`-Lader (`loadPlanVersions`)
  analog zu den bisherigen Ladern.
- **Damit ist die Persistenz-Härtung abgeschlossen: alle sieben Entitäten
  (Fächer, Prüfungen, Verfügbarkeit, Themen/Themenabschnitte/Dokumente,
  Lernblöcke, Planversionen) sind echt in SQLite gespeichert.** Der
  `App.tsx`-Kopfkommentar wurde entsprechend aktualisiert — die
  „provisorischer Rahmen, Persistenz kommt schrittweise"-Formulierung ist
  komplett entfallen. Verbleibende, bewusst unveränderte Ausnahmen:
  PDF-Rohbytes (`documentBytes`, SECURITY.md) und die Kurs-Export/Import-
  Lücke (`applyCourseImport`, seit Baustein 2 bekannt) — beide weiterhin
  im Kopfkommentar dokumentiert.
- **2 neue Tests** (`planVersionsRepo.test.ts`), 2 alte entfernt — Gesamtzahl
  unverändert bei 278.
- **Im frischen Tab geprüft:** App lädt fehlerfrei, keine Konsolenfehler.

### Nächster Schritt

Persistenz-Härtung ist abgeschlossen. Weiter mit ROADMAP.md Phase 4 der
Reihe nach, wie vom Nutzer bestätigt. **„Nachschärfen aus dem Alltag"
übersprungen** (auf Rückfrage): setzt echte Nutzungserfahrung voraus, die
laut Plan erst ab September beginnt (heute: 21.07.2026) — nichts
Konkretes, an dem sich das festmachen ließe. Stattdessen direkt mit dem
nächsten Punkt begonnen.

### Phase 4 — Markieren im Dokument → Karteikarten

Branch `feat/highlight-to-flashcards` (von `main` abgezweigt). Erster
Phase-4-Punkt. `cards` (DATA_MODEL.md „Später befüllt, jetzt schon
angelegt") wird befüllt — bewusst nur das Anlegen von Karten aus
markiertem Text, **nicht** die Wiederholung/Bewertung selbst (das ist der
nächste Roadmap-Punkt „Spaced Repetition FSRS", siehe Abgrenzung weiter
oben in diesem Abschnitt).

- **`ui/PdfViewer.tsx` bekommt eine echte Textebene:** das bisherige
  Canvas-Rendering (`page.render`) zeigt nur ein Bild, keinen auswählbaren
  Text. `pdfjs.TextLayer` (Teil desselben `pdf.mjs`-Bundles wie
  `getDocument`, **keine neue Abhängigkeit**) legt unsichtbare, exakt
  positionierte `<span>`s über das Canvas — dieselbe Technik, die pdf.js'
  eigener Viewer für Textsuche/-markierung nutzt. Minimales CSS dafür
  selbst geschrieben (`TEXT_LAYER_STYLE`-Konstante), abgeleitet aus
  `pdfjs-dist/legacy/web/pdf_viewer.css`s `.textLayer`-Regeln — bewusst
  nur die für Positionierung/Auswahl nötigen Regeln übernommen, nicht das
  komplette, Annotation-Editor-lastige Stylesheet.
- **Neue Prop `onSelectionChange(text, page)`:** ein `document`-weiter
  `selectionchange`-Listener prüft bei jeder Änderung, ob
  `window.getSelection()`s Anker-Knoten innerhalb der Textebene dieser
  Seite liegt — nur dann wird der Text gemeldet, sonst ein leerer String
  (Auswahl aufgehoben oder außerhalb). So bleibt `PdfViewer` eine reine
  Präsentationskomponente: die Entscheidung, was mit der Auswahl passiert,
  trifft `SourceViewer`.
- **`ui/CardCreator.tsx`** (neu): Formular, das erscheint, sobald
  `SourceViewer` eine nichtleere Auswahl hält. `source_quote` kommt
  schreibgeschützt aus der Markierung; Vorder-/Rückseite schreibt der
  Nutzer von Hand — bewusst **kein** automatisches Frage-Antwort-Raten aus
  dem Zitat (das wäre KI-Gebiet, nicht dieser Baustein). Thema ist mit dem
  Thema des gerade betrachteten Abschnitts vorbelegt, aber über ein
  Dropdown änderbar (die Markierung kann fachlich zu einem anderen Thema
  gehören als der zufällig geöffnete Abschnitt).
- **`ui/SourceViewer.tsx`**: hält den `selection`-Zustand, zeigt
  `CardCreator` bei nichtleerer Auswahl, listet bestehende Karten **nach
  Thema gefiltert** (nicht nach Dokument/Seite — eine Karte gehört
  fachlich zum Thema). Auswahl wird zurückgesetzt, wenn ein anderer
  Abschnitt geöffnet wird (sonst bliebe eine Karte vom vorigen Dokument
  fälschlich stehen).
- **`data/cardsRepo.ts`** (neu): `loadCards`, `insertCard`,
  `deleteCardRow` — kein Update (eine falsch angelegte Karte wird
  gelöscht und neu erstellt, kein Bearbeitungsformular in diesem
  Baustein).
- **`App.tsx`**: `cards`-Zustand, sechster `useEffect`-Lader
  (`loadCards`), `handleCreateCard`/`handleDeleteCard` nach dem
  etablierten try/catch-Muster. `handleChangeTopics`s Kaskaden-Nachzug
  (bisher nur `topicSections`) um `cards` erweitert — ein gelöschtes Thema
  kaskadiert in der DB auch auf seine Karten (`ON DELETE CASCADE`).
- **14 neue Tests**: `cardsRepo.test.ts` (3, inkl. Fremdschlüssel-Kaskade),
  `CardCreator.test.tsx` (5), zwei neue Fälle in `PdfViewer.test.tsx`
  (Auswahl innerhalb/außerhalb der Textebene — über echte, nicht gemockte
  `document.createRange()`/`window.getSelection()`-APIs, die sich in
  jsdom für diesen Zweck spezifikationsgetreu verhalten), vier neue Fälle
  in `SourceViewer.test.tsx` (CardCreator erscheint/verschwindet,
  `onCreateCard`-Aufruf, Kartenliste je Thema, Auswahl-Reset beim
  Abschnittswechsel).
- **Grenze der Plausibilitätsprüfung im Dev-Server, ehrlich festgehalten:**
  ein echter Ende-zu-Ende-Durchlauf (Fach anlegen → PDF importieren → im
  Viewer markieren → Karte erstellen) ist im Dev-Server/Browser **nicht**
  erreichbar — schon das Anlegen eines Fachs scheitert dort ohne echtes
  Tauri-Fenster (dieselbe, bereits mehrfach dokumentierte IPC-Einschränkung
  wie bei jedem Persistenz-Baustein), und ohne Fach kein PDF-Import, ohne
  Import keine Seite zum Markieren. Geprüft wurde stattdessen: App lädt im
  frischen Tab fehlerfrei (nur der erwartete, abgefangene
  Fach-Speicherfehler in der Konsole, keine neuen Fehler durch die
  TextLayer-Änderungen), und die eigentliche Interaktionslogik
  (`selectionchange`-Listener, `CardCreator`-Formular, Kartenliste) ist
  über echte (nicht gemockte) DOM-Selection-APIs in den Unit-Tests
  abgedeckt.

### Phase 4 — Spaced Repetition (FSRS)

Branch `feat/spaced-repetition-fsrs` (von `main` abgezweigt). Zweiter
Phase-4-Punkt, baut auf `cards` (voriger Baustein) auf und befüllt die
bisher leere `reviews`-Tabelle.

- **Neue Abhängigkeit `ts-fsrs` (mit Rückfrage genehmigt):** FSRS hat viele
  fein kalibrierte Parameter (Standard-Gewichte, Vergessenskurven-Formeln,
  siehe CONTEXT.md „Recherche: Spaced Repetition") — ein Eigenbau wäre
  fehleranfällig und wartungsaufwändig gegenüber der etablierten,
  spezifikationstreuen TypeScript-Referenzimplementierung (auch von Anki
  intern genutzt). **Keine eigenen Laufzeit-Abhängigkeiten** (`npm ls
  ts-fsrs` zeigt keine Kindpakete) — die bereits vorhandenen
  Sicherheitswarnungen (`npm audit`) betreffen ausschließlich das
  bestehende vite/vitest-Toolchain, nicht `ts-fsrs`.
- **`domain/spacedRepetition.ts`** (neu): reine Funktionen um `ts-fsrs`
  herum (ARCHITECTURE.md „domain/ kennt weder DB noch UI" — `ts-fsrs`
  selbst ist reine Berechnung, kein I/O). Zentrale Herausforderung: die
  `reviews`-Tabelle (0001_init.sql, bereits vor diesem Baustein fest
  angelegt) speichert bewusst nur `stability`/`difficulty`/`due_at`/
  `rating`/`reviewed_at` je Wiederholung — nicht den vollen
  `ts-fsrs`-`Card`-Zustand (`state`/`reps`/`lapses`/`learning_steps`).
  `toFsrsCard` baut daraus ein gültiges `Card` für die nächste Berechnung
  zurück: `elapsed_days`/`scheduled_days` dürfen auf 0 bleiben, weil
  `ts-fsrs` das Intervall intern ohnehin frisch aus `last_review`/`now`
  berechnet (im Quelltext geprüft, nicht geraten) — `learning_steps` bleibt
  bewusst immer 0, da das vereinfachte Schema FSRS' Kurzzeit-„Learning
  Steps" (Wiederholung am selben Tag) nicht nachbildet: jede Karte mit
  mindestens einer Bewertung gilt hier als im Zustand `Review`.
  `isDue`/`scheduleReview` als öffentliche Funktionen.
- **`data/reviewsRepo.ts`** (neu): `loadReviews`, `insertReview` — reines
  Anhänge-Protokoll wie `plan_versions`, kein Update/Delete.
- **`ui/ReviewSession.tsx`** (neu): zeigt die erste fällige Karte
  (`isDue`) mit Vorderseite, „Antwort zeigen" deckt Rückseite und die vier
  FSRS-Bewertungsstufen auf — „Nochmal"/„Schwer"/„Gut"/„Leicht" (Anki-
  übliche vier Stufen, siehe Recherche-Abschnitt). Reine Präsentation,
  `now` kommt von außen wie bei `TodayView`.
- **`App.tsx`**: `reviews`-Zustand, siebter `useEffect`-Lader
  (`loadReviews`), `handleReview(cardId, grade)` — berechnet über
  `scheduleReview` die neue Fälligkeit aus der bisherigen Historie dieser
  Karte und persistiert sie. Kaskaden-Nachzug erweitert: Karte löschen und
  Thema löschen (kaskadiert über `cards` weiter) ziehen jetzt auch
  verwaiste `reviews` lokal nach.
- **17 neue Tests**: `spacedRepetition.test.ts` (7, u. a. „Nochmal" ergibt
  ein kürzeres Intervall als „Leicht" bei sonst gleichem Ausgangszustand —
  Eigenschaftstest statt exakter FSRS-Zahlenwerte, da die Zahlen selbst
  Sache von `ts-fsrs`s eigener Testsuite sind, nicht dieser hier),
  `reviewsRepo.test.ts` (3, inkl. Fremdschlüssel-Kaskade),
  `ReviewSession.test.tsx` (7).
- **Im frischen Tab geprüft:** App lädt fehlerfrei, „Wiederholung"-Bereich
  zeigt korrekt „Keine fällige Karte" (leerer Anfangszustand, keine neuen
  Konsolenfehler durch `ts-fsrs`). Ein echter Ende-zu-Ende-Durchlauf mit
  einer echten Karte ist im Dev-Server aus demselben Grund wie beim vorigen
  Baustein nicht erreichbar (Fach-/Karten-Anlegen scheitert ohne echtes
  Tauri-Fenster) — die FSRS-Berechnung selbst ist über die
  Eigenschaftstests in `spacedRepetition.test.ts` abgedeckt.

### Phase 4 — Formelextraktion sauber

Branch `feat/formula-extraction`. Dritter Phase-4-Punkt, behebt die
verbleibenden zwei der drei in Abschnitt 4 „Formelextraktion ist unsauber"
genannten Probleme (PowerPoint-Doppelzeichen war bereits in Phase 1
behoben, siehe `collapseDoubledMathChars`). Reine `ingest/`-Änderung,
keine UI/`App.tsx`-Berührung.

- **Diagnose zuerst am echten Material** (02 Consumer Theory 01.pdf,
  Seite 4 — Budget-Constraint-Formeln): ein Wegwerf-Skript hat die
  rohen `pdf.js`-Textfragmente mit Position/Schriftgröße/Breite
  ausgegeben. Bestätigt beide Probleme konkret: „•𝑥units of commodity 1"
  + eine separate, bedeutungslose Zeile „1" (der Index 1 von 𝑥₁ landet
  als eigene Zeile, weil seine Grundlinie leicht versetzt ist — mehr als
  die 2,5-Einheiten-Toleranz für „gleiche Zeile"); „budget" direkt gefolgt
  von „is" ohne Leerzeichen, obwohl real eine Lücke von 3,6 pt besteht
  (pdf.js trennt an einem Schriftwechsel manchmal ohne Leerzeichen-
  Fragment).
- **`ingest/types.ts`**: `TextItem` um `width` erweitert (`pdf.js`
  liefert das bereits mit, wurde bisher nur nicht durchgereicht) — Basis
  für die Lückenerkennung.
- **`ingest/extract.ts`**, `itemsToLines` neu aufgebaut:
  - **Leerzeichen an echten Lücken** (`joinWithGaps`): statt Fragmente
    einer Zeile bedingungslos mit `''` zu verketten, wird die x-Lücke
    zwischen Fragmentende und nächstem Fragmentanfang gegen eine
    Schwelle geprüft (`SPACE_GAP_RATIO = 0,15` der Schriftgröße, Mindest-
    wert 1,5 pt — an den oben genannten realen Werten kalibriert: echte
    Wortlücken lagen bei 15–25 % der Schriftgröße, echte
    Zeichen-Übergänge bei praktisch 0).
  - **Hoch-/Tiefstellung an die Bezugszeile anhängen** (`mergeScriptBuckets`):
    ein Bucket (vorläufige Zeile) gilt als Index einer Nachbarzeile, wenn
    seine Schrift deutlich kleiner ist (`SUBSCRIPT_SIZE_RATIO = 0,85`) UND
    seine Grundlinie nur leicht versetzt ist (`SUBSCRIPT_Y_TOLERANCE = 0,6`
    der Bezugsschriftgröße) — dann werden seine Fragmente in die
    Bezugszeile einsortiert (nach x neu sortiert), statt eine eigene,
    bedeutungslose Zeile zu bilden. **Bewusst in beide Richtungen
    geprüft** (voriger UND nächster Bucket in Lesereihenfolge): ein
    tiefgestellter Index steht in Lesereihenfolge NACH seiner Bezugszeile
    (spätere, tiefere Grundlinie), ein hochgestellter Exponent DAVOR
    (frühere, höhere Grundlinie) — nur den vorigen Bucket zu prüfen hätte
    Exponenten verpasst.
  - Zeilen-`y`/`size` bleiben nach dem Anhängen die der Bezugszeile, nicht
    die des angehängten Index — sonst würde nachgelagerte Positionslogik
    (`isBuildStep` in `slides.ts`) durch die falsche Schriftgröße/Grundlinie
    verfälscht.
- **9 neue Tests** (`tests/ingest/itemsToLines.test.ts`, bisher gab es
  keinen dedizierten Test für diese Funktion) — mit echten Koordinaten aus
  dem obigen Diagnose-Material, inkl. Tiefstellung, mehrere Indizes einer
  Formel korrekt verteilt, Hochstellung (Bucket-Reihenfolge umgekehrt),
  und zwei Fehlalarm-Tests (zwei normale Zeilen bleiben getrennt, eine
  weit entfernte kleinere Fußzeile verschmilzt nicht mit dem Fließtext).
- **Am echten Material vorher/nachher verglichen** (stärkere Prüfung als
  ein Dev-Server-Klickdurchlauf, siehe Baustein-5-Präzedenzfall — diese
  Änderung berührt ohnehin keine UI): „…up to𝑥units of commoditynis
  denoted by(𝑥,𝑥, . . . ,𝑥)" + separate Zeile „𝑛12𝑛" wird zu **einer**
  korrekten Zeile „…up to 𝑥𝑛 units of commodity n is denoted by (𝑥1, 𝑥2,
  . . . , 𝑥𝑛)". Zusätzlich an einem zweiten, unabhängigen Dokument
  bestätigt (2 Bonds.pdf, Anleihen-Bewertungsformeln mit Exponenten):
  „(1 + 𝑃)𝑛" und „9 (1+𝑖)𝑛" — Exponenten korrekt angehängt, keine
  Fehlalarme bei den echten Zeilenumbrüchen des Dokuments.
- **Bewusst nicht behoben:** eine unsichtbare Aufzählungszeichen-Glyphe
  (kein Unicode-Leerzeichen, aber im Terminal nicht sichtbar) erzeugt in
  seltenen Fällen einen optisch wie ein führendes Leerzeichen wirkenden
  Zeilenanfang (z. B. „ Bundle is affordable if…") — bestand vorher schon
  (nur durch das lückenlose Verketten unsichtbar), ist ein reines
  Aufzählungszeichen-Darstellungsartefakt, kein Formel- oder
  Leerzeichenproblem, und bleibt außerhalb des Umfangs dieses Bausteins.
- **`## 9. Bekannte Einschränkungen`**: „Formelextraktion unzureichend"
  entfernt — die beiden verbliebenen, konkret benannten Probleme sind
  behoben.

### Zwischenentscheidung: Quiz-Generierung zurückgestellt

Auf Rückfrage entschieden: **Quiz-Generierung braucht einen echten
KI-Anbieter** (LLM-API, um Fragen aus Themenabschnitten zu erzeugen) —
ARCHITECTURE.md nennt `ai/` selbst als „austauschbar", „optional, nach
Rückfrage". Der Nutzer wollte sich noch nicht auf einen Anbieter
(Anthropic/OpenAI) festlegen und hat Quiz-Generierung zurückgestellt.
Stattdessen mit dem nächsten, eindeutig KI-freien Punkt weitergemacht:
**Fehlerhistorie → gezielte Wiederholung**. **Probeklausur-Simulation**
ebenfalls zurückgestellt (auf Rückfrage) — im Roadmap nicht näher
spezifiziert, mögliche KI-Abhängigkeit ungeklärt.

### Phase 4 — Fehlerhistorie → gezielte Wiederholung

Branch `feat/error-history` (von `main` abgezweigt). Baut auf `cards`/
`reviews` (vorige zwei Bausteine) auf, ohne KI.

- **`domain/errorHistory.ts`** (neu): `rankTroubledCards(cards, reviews)`
  — Karten mit mindestens einer `Rating.Again`/`Rating.Hard`-Bewertung,
  absteigend nach Fehlerquote sortiert (Gleichstand nach absoluter Anzahl
  schwieriger Bewertungen). Bewusst **unabhängig von der FSRS-Fälligkeit**
  (`isDue`) — der Sinn gezielter Wiederholung ist gerade, Problemkarten
  VOR ihrem regulären Termin nochmal zu üben, nicht erst wenn FSRS sie
  ohnehin fällig stellt.
- **`ui/FlashcardReview.tsx`** (neu, aus `ReviewSession.tsx` extrahiert):
  die Aufdecken-und-bewerten-Interaktion (Vorderseite → „Antwort zeigen"
  → Rückseite + vier Bewertungsstufen) war in `ReviewSession` fest
  eingebaut — jetzt eigene Komponente, da `ErrorHistory` dieselbe
  Interaktion für eine anders ausgewählte Karte braucht. `ReviewSession`
  entsprechend gekürzt, bestehende Tests liefen unverändert durch (der
  gerenderte DOM-Baum bleibt identisch).
- **`ui/ErrorHistory.tsx`** (neu): listet Problemkarten mit Thema und
  Fehlerquote, „Gezielt üben" öffnet `FlashcardReview` für die gewählte
  Karte. Bewertung läuft über denselben `onReview`-Callback wie
  `ReviewSession` — persistenzseitig ist eine gezielte Wiederholung
  dieselbe Art Ereignis wie eine reguläre, `App.tsx` braucht keinen neuen
  Handler.
- **`App.tsx`**: `<ErrorHistory>` neben `<ReviewSession>` gerendert, mit
  denselben `cards`/`reviews`/`topics`/`handleReview`.
- **13 neue Tests**: `errorHistory.test.ts` (6, u. a. Sortierung,
  Gleichstand-Tiebreaker, „Hard" zählt genauso wie „Again"),
  `FlashcardReview.test.tsx` (2, die extrahierte Komponente für sich),
  `ErrorHistory.test.tsx` (5).
- **Im frischen Tab geprüft:** App lädt fehlerfrei, „Fehlerhistorie —
  gezielte Wiederholung" zeigt korrekt den leeren Anfangszustand.

### Phase 4 — Paper-Workflow

Branch `feat/paper-workflow` (von `main` abgezweigt). Anders als
Quiz-Generierung/Probeklausur-Simulation **keine Rückfrage nötig** — das
Datenmodell war dafür bereits vollständig vorbereitet (`paper_steps`,
0001_init.sql, sowie `PaperStep`/`PaperStepStatus` in `schema.ts`),
CONTEXT.md Abschnitt 3 hatte das von Anfang an mitgedacht: „der Planer
muss Paper-Teilschritte von Anfang an mitdenken, auch wenn der
Paper-Workflow erst in Phase 4 ausgebaut wird." Reine Checklisten-
Verwaltung für Paper-Abgaben (`assessments.type = 'paper'`) — kein
automatisches Ableiten von Schritten aus dem Prüfungsformat, das wäre
Spekulation ohne Vorgabe.

- **`data/paperSteps.ts`** (neu, reine Funktionen) + **`data/paperStepsRepo.ts`**
  (neu, SQL) — exaktes Muster von `courses.ts`/`coursesRepo.ts`: einfache
  Entität, `NewPaperStepInput` in der reinen Datei definiert, Repo liefert
  die echte `AUTOINCREMENT`-`id` beim Anlegen zurück.
- **`ui/PaperSteps.tsx`** (neu): zeigt je Paper-Abgabe des gewählten Fachs
  (`assessments.type === 'paper'`) eine Teilschritt-Liste mit
  Status-Dropdown (`offen`/`in_arbeit`/`erledigt`) und Fälligkeitsdatum,
  plus Formular zum Anlegen neuer Schritte. Reine Präsentation wie
  `AssessmentSetup` — `onAdd`/`onUpdate`/`onRemove`-Callbacks, kein
  direkter Repo-Zugriff. Rendert nichts, wenn das Fach keine Paper-Abgabe
  hat (`null`, kein leerer Rahmen).
- **`App.tsx`**: `paperSteps`-Zustand, achter `useEffect`-Lader
  (`loadPaperSteps`), drei Handler nach dem etablierten Muster.
  `handleRemoveAssessment` um Kaskaden-Nachzug erweitert — eine gelöschte
  Prüfung kaskadiert in der DB auch auf ihre `paper_steps`
  (`ON DELETE CASCADE`).
- **12 neue Tests**: `paperSteps.test.ts` (2), `paperStepsRepo.test.ts`
  (4, inkl. Fremdschlüssel-Kaskade), `PaperSteps.test.tsx` (6, u. a. dass
  die Komponente bei einem Fach ohne Paper-Abgabe nichts rendert).
- **Im frischen Tab geprüft:** App lädt fehlerfrei. Ein echter
  Ende-zu-Ende-Durchlauf (Fach anlegen → Paper-Prüfung anlegen →
  Teilschritt anlegen) ist im Dev-Server aus demselben, bereits mehrfach
  dokumentierten Grund nicht erreichbar (Fach-Anlegen scheitert ohne
  echtes Tauri-Fenster).

### Zwischenstand: Phase 4 — was geht, ist erledigt

Auf Rückfrage auch **Altklausur-Analyse → automatische Gewichtung**
zurückgestellt: eine sinnvolle Zuordnung „welche Altklausur-Frage gehört
zu welchem Thema" bräuchte entweder ein schwaches Stichwortabgleich-Signal
(die meisten Fragen nennen den Themennamen nicht wörtlich) oder echte
KI-Klassifikation — also dieselbe Anbieter-Rückfrage wie bei
Quiz-Generierung. Damit sind alle vier ROADMAP.md-Phase-4-Punkte, die
**ohne** KI-Anbieter und **ohne** echte Nutzungsdaten (ab 1. September)
umsetzbar waren, gebaut und gemergt:

- ✅ Markieren im Dokument → Karteikarten
- ✅ Spaced Repetition (FSRS)
- ✅ Formelextraktion sauber
- ✅ Fehlerhistorie → gezielte Wiederholung
- ✅ Paper-Workflow

Zurückgestellt, jeweils auf Rückfrage:
- ⏸ Nachschärfen aus dem Alltag — braucht echte Nutzungserfahrung (ab
  1. September)
- ⏸ Quiz-Generierung — braucht einen noch nicht gewählten KI-Anbieter
  (Anthropic/OpenAI)
- ⏸ Probeklausur-Simulation — im Roadmap nicht näher spezifiziert,
  vermutlich ebenfalls KI-abhängig
- ⏸ Altklausur-Analyse → automatische Gewichtung — bräuchte echte
  Themen-Klassifikation, dieselbe Anbieter-Frage wie Quiz-Generierung

### Stand: KI-Anbindung und Phase 4 — komplett (2026-07-22)

**Kurzfassung für den Wiedereinstieg:** Alle Phase-4-Punkte, die auf einen
KI-Anbieter gewartet hatten, sind gebaut, getestet und released (aktuell
v0.13.0). Es gibt **keine offene Implementierungsaufgabe** aus diesem
Themenblock — die einzige verbleibende Phase-4-Aufgabe
(„Nachschärfen aus dem Alltag") braucht echte Nutzungsdaten und wartet
bewusst auf den Echtbetrieb-Start am 1. September 2026. Eine neue Sitzung
sollte zuerst fragen, ob der Nutzer die neuen Funktionen (Quiz,
Probeklausur, Altklausur-Analyse, Zusammenfassungs-Import) inzwischen
ausprobiert hat und Rückmeldung/Bugs mitbringt, statt hier von sich aus
weiterzubauen.

**KI-Anbindung** (ADR-011/ADR-013, `src/ai/`):
- Zwei austauschbare Anbieter, umschaltbar in den Einstellungen
  (`ui/AiSettings.tsx`): Anthropic (`claude-sonnet-5`) und OpenAI
  (`gpt-5.6-terra`, Übergangslösung, solange die Anthropic-Zahlung noch
  nicht lief — jederzeit zurückwechselbar, beide Schlüssel bleiben
  unabhängig in der Keychain gespeichert).
- Schlüssel-Speicherung über `platform/keychain.ts` + drei Tauri-Commands
  (`src-tauri/src/lib.rs`), `keyring`-Crate **mit** `apple-native`-Feature
  (`Cargo.toml`) — **wichtiger Bugfix:** ohne dieses Feature fällt
  `keyring` auf einen nicht-persistenten Mock zurück und „speichert"
  Schlüssel, die beim nächsten Lesen wieder weg sind. Schlüssel, die vor
  v0.11.0 eingegeben wurden, waren nie echt gespeichert.
- HTTP-Aufrufe laufen über `@tauri-apps/plugin-http` (nicht Browser-
  `fetch`, umgeht CORS), Netzwerk-Scope in
  `src-tauri/capabilities/default.json` auf `api.anthropic.com`/
  `api.openai.com` begrenzt. OpenAI mit neueren Modellen (`gpt-5.6-terra`)
  braucht `max_completion_tokens` statt `max_tokens`.
- Kostenprotokollierung über `data/aiUsageRepo.ts` in die bestehende
  `ai_usage`-Tabelle — **die Budget-Benachrichtigung selbst (ADR-007)
  ist noch nicht an `NotificationBanner` angeschlossen**, reine
  Protokollierung reicht bisher.
- **Kein Bestätigungsdialog vor jeder KI-Übertragung** (bewusste
  Entscheidung, SECURITY.md entsprechend korrigiert) — die gezielte
  Nutzung einer KI-Funktion durch den Nutzer ist die Bestätigung, ein
  API-Schlüssel ist ohnehin Voraussetzung für jede Übertragung.

**Drei gebaute Phase-4-Funktionen** (ADR-012, neuer Navigationspunkt
„Quiz"):
- **Quiz-Generierung**: `AIProvider.generateQuestions` erzeugt Fragen aus
  echtem Belegtext eines Themenabschnitts (`ingest/pdf.ts`
  `extractPageRangeText`) — nur für Abschnitte wählbar, deren PDF noch
  geladen ist. Multiple-Choice wird automatisch bewertet
  (`domain/quiz.ts`), Freitext durch Selbsteinschätzung wie bei
  Karteikarten.
- **Probeklausur-Simulation**: dasselbe Quiz-System, nur mit
  Prüfungs-Zuordnung und Zeit-Countdown (`assessment.duration_minutes`) —
  kein eigenes Datenmodell, nur ein `quizzes.config_json`-Modus.
- **Altklausur-Analyse → automatische Gewichtung**:
  `AIProvider.classifyExamContent` + `domain/examWeighting.ts` schlagen
  Gewichts-Erhöhungen für häufig geprüfte Themen vor — **immer nur als
  Vorschlag** (`ui/AltklausurAnalysis.tsx`, Diff wie bei der
  Neuberechnung, ADR-005-Prinzip), nie automatisch übernommen, rührt nie
  ein `manual_override`-Thema an.
- Neu dafür: `domain/quiz.ts`/`domain/examWeighting.ts` (mit Tests),
  `data/quizzesRepo.ts`/`questionsRepo.ts`/`answersRepo.ts`,
  `ui/QuizSetup.tsx`/`QuizSession.tsx`/`AltklausurAnalysis.tsx`.

**Materialien überstehen jetzt Neustart/Rechner-Aus** (ADR-013,
`platform/documentStorage.ts`): PDFs werden unter
`$APPDATA/documents/<sha256>.pdf` gespeichert, `documentBytes` wird beim
App-Start von der Festplatte nachgeladen. Die frühere Annahme „PDF-Bytes
bleiben bewusst nicht persistiert" war **kein** SECURITY.md-Verbot (das
verbietet nur, PDFs ins Git-Repo zu committen), nur schlicht noch nicht
gebaut. Vor v0.11.0 importierte Dokumente tragen noch den alten
`in-memory://`-Platzhalter und haben ihr PDF unwiederbringlich verloren —
einmal neu importieren behebt das dauerhaft.

**Dokumenttypen — jetzt frei erweiterbar und automatisch erkannt**
(ADR-013/ADR-014, `ingest/docType.ts`):
- Beim Import wählbar (vorher hart auf `folien` codiert): `folien`,
  `skript`, `uebung`, `altklausur`, `musterloesung`, `zusammenfassung`,
  `sonstiges` (mit freier Bezeichnung, Migration `0003_document_type_
  label.sql`, `documents.doc_type_label`).
- `inferDocType()` schlägt den Typ automatisch aus Dateiname/Ordnername
  vor (kein KI-Aufruf — Namensmuster reichen bei echtem Material fast
  immer), überschreibt aber **nie** eine bewusste Nutzerauswahl (`folien`
  gilt als „noch nicht entschieden"-Default). Deckt inzwischen sowohl
  englische WHU-Begriffe (Slides, Exercise, Solutions, Mock Exam, …) als
  auch deutsche Mathe-Kurs-Begriffe ab (Vorlesung → Folien, Aufgabenblatt/
  Assignment → Übung).
- **Nachträglich korrigierbar:** `ui/DocumentList.tsx` +
  `documentsRepo.updateDocumentType` — falls die Vermutung danebenliegt.

**Zusammenfassungen bekommen einen eigenen KI-Einlesepfad** (ADR-015):
Zusammenfassungen sind von Studierenden selbst geschrieben, jede anders
aufgebaut — manche ganz ohne optische Gliederung (reine Frage-Antwort-
Listen). Die folienbasierte Kapitelerkennung (`ingest/chapters.ts`) passt
hier nicht. Stattdessen liest `AIProvider.detectTopicsFromText` den
kompletten Seitentext und gruppiert **inhaltlich** nach Themen
(`data/importTopics.ts` `persistAiDetectedDocument`, parallel zum
bestehenden folienbasierten Pfad). **Bekannte, bewusst nicht behobene
Grenze:** handschriftliche Notizen (z. B. Tablet-App-Exporte) haben zwar
oft einen Textlayer, dieser ist aber häufig fehlerhaft/durcheinander-
gewürfelt (echtes OCR wäre nötig — ROADMAP.md „Später/offen" führt „OCR,
Handschrift" bereits als eigenen, unterminierten Punkt).

**Material-Analyse durchgeführt** (Nutzerauftrag, Ordner „Beispiel
pdfs", nicht im Git-Repo, `.gitignore`-geschützt): echtes Material aus
mehreren WHU-BBA-Kursen (Microeconomics, Money Banking and Financial
Markets, Data & Information Management, Entrepreneurial Transformation,
Nurturing Customer Relationships) sowie ein Mathematik-Kurs (Topic 1–3)
gesichtet. `poppler` (`brew install poppler`) wurde dafür installiert,
damit PDF-Seiten gerendert werden können. Alle daraus abgeleiteten
Code-Änderungen sind oben in den jeweiligen Abschnitten eingearbeitet;
die einzelnen Rohbefunde stehen nicht mehr separat hier, um Wiederholung
zu vermeiden.

### Danach (unverändert aus der Roadmap)

Phase 1, Phase 2 und Phase 3 sind komplett.

Siehe [ROADMAP.md](ROADMAP.md) für die vollständige Phasenplanung.

### Zwischenstand: Design-System, Auto-Updater, Verteilung (2026-07-22)

Parallel zu Phase 4 eine komplette macOS-native Design-Überarbeitung plus
Verteilungsinfrastruktur — beides unabhängig vom Roadmap-Fortschritt oben,
aber für jede künftige Sitzung wichtig zu wissen:

- **Design-System** (`PRODUCT.md`, `DESIGN.md`, `src/styles/tokens.css`,
  `src/styles/global.css`, siehe PR #32): Sidebar+Toolbar-App-Rahmen im
  macOS-Stil mit Liquid-Glass-Vibrancy (`backdrop-filter`), warme
  Creme-/Terrakotta-Palette (an die Claude-App angelehnt, auf
  Nutzerwunsch — nicht Apple-Blau), Systemschrift statt Web-Fonts.
  `App.tsx` von einer langen Ein-Seiten-Scrollliste auf 7 Sektionen mit
  Navigation umgestellt. Fach-Farbe (`CourseSetup.tsx`) als kuratiertes
  Dropdown (`COURSE_COLORS`) statt freier Hex-Eingabe.
- **Auto-Updater** (ADR-008, PRs #32/#34): `tauri-plugin-updater` +
  `tauri-plugin-process`, Signierschlüssel lokal unter
  `~/.tauri/lernplaner-updater.key` (Backup zusätzlich unter
  `App/signing-key-backup/` im Projektordner, dort `.gitignore`-geschützt
  über die `*.key`-Regel). **Repository ist deshalb public** (nötig,
  damit der unauthentifizierte Update-Check der App private
  Release-Assets erreichen kann) — Quellcode ist öffentlich einsehbar,
  private Lerndaten/PDFs waren nie im Repo, davon unberührt.
  `ui/UpdateBanner.tsx` zeigt automatisch (Start + alle 45 Min., PR #40)
  einen Hinweis bei neuer Version.
- **Benachrichtigungen laufen nur In-App** (ADR-009, PR #39): native
  macOS-Push-Benachrichtigungen funktionieren bei unserem
  ad-hoc-signierten Build nicht zuverlässig (bestätigt: App taucht nie in
  `com.apple.ncprefs.plist` auf — `UNUserNotificationCenter` braucht
  echte Apple-Entwickler-ID-Signatur, selbstsigniertes Zertifikat
  reicht nicht). Auf Rückfrage entschieden: `ui/NotificationBanner.tsx`
  (In-App) ist der primäre Weg, `showNotification` bleibt nur
  Best-Effort-Zusatz. Bekannter, akzeptierter Kompromiss: kein Hinweis,
  solange die App geschlossen ist.
- **Verfügbarkeit — Mehrfachauswahl** (PR #33): abweichende Tage lassen
  sich jetzt als Sammlung mehrerer Tage (Chips) auf einmal mit
  Minuten/Notiz eintragen, statt nur einen Tag pro Durchlauf.
- **Release-Workflow ist jetzt automatisch** (CONTRIBUTING.md „Releases"-
  Abschnitt, Standing Instruction seit 2026-07-22): jede sichtbare
  Änderung wird automatisch versioniert, signiert gebaut und als
  GitHub-Release veröffentlicht, PR-Merges sind für dieses Repo
  vorab-autorisiert — beides ohne erneute Rückfrage.
- **Moodle-Anbindung geprüft und abgelehnt** (ADR-010): WHU nutzt SSO für
  Moodle, kein Selbstbedienungs-Token verfügbar — der einzig verbleibende
  Weg (Browser-SSO-Login-Flow) wäre deutlich aufwendiger und im Ausgang
  ungewiss. Auf Rückfrage nicht verfolgt. Prüfungstermine bleiben manuell.

### Ordner-Import (v0.14.0)

Nutzerwunsch: nicht nur einzelne PDFs, sondern einen ganzen (bereits nach
Unterthemen sortierten) Ordner auf einmal importieren können, inkl.
Übernahme der Unterordner-Struktur als Themenbaum. Branch
`feat/folder-import`, [PR #44](https://github.com/henrigrimme/Lernplaner/pull/44)
(Squash-Merge nach Nutzer-Bestätigung — Auto-Mode-Classifier hatte den
ersten Merge-Versuch trotz der stehenden Autorisierung blockiert, Nutzer hat
daraufhin für diese Sitzung alle künftigen Merges ausdrücklich freigegeben).

- **`data/importTopics.ts`**: `persistExtractedDocument`/
  `persistAiDetectedDocument` bekommen einen neuen, optionalen
  `parentTopicId`-Parameter (Default `null`, bestehende Aufrufe
  unverändert) — die aus PDF-Kapiteln entstehenden Themen hängen damit
  wahlweise unter einem Ordner-Thema statt immer auf oberster Ebene.
  Technisch möglich, ohne das Schema zu ändern: `topics.parent_id` war
  von Anfang an für beliebige Tiefe angelegt (bisher nur ungenutzt, siehe
  „Jedes Kapitel wird zu einem Thema, parent_id NULL" weiter oben in
  diesem Abschnitt).
- **`ensureFolderTopicPath`** (neu, `data/importTopics.ts`): löst eine
  Ordner-Pfadkette (aus `File.webkitRelativePath`) in eine Kette
  verschachtelter Themen auf. Wiederverwendet ein bestehendes Thema mit
  gleichem Namen unter gleichem Elternthema (`normalizeForCompare`, wie
  bei der Kapitel-Fuzzy-Zusammenführung in `ingest/chapters.ts`) statt es
  zu duplizieren — wichtig sowohl für mehrere Dateien im selben
  Unterordner innerhalb eines Imports als auch für einen späteren
  erneuten Ordner-Import über denselben Kursordner. `manual_override = 0`
  (Ordnername kommt vom Nutzer, ist aber eine automatische
  Import-Entscheidung, keine UI-Bearbeitung — dieselbe Konvention wie bei
  den übrigen Import-Themen).
- **`App.tsx`**: zweiter Datei-Input „Oder ganzen Ordner importieren"
  neben dem bestehenden Mehrfach-PDF-Import, mit `webkitdirectory` (kein
  von React/TS typisiertes JSX-Attribut, daher per `ref`-Callback direkt
  am DOM-Element gesetzt, nicht als Prop). Neue Funktion `importFolder`:
  der erste Pfadabschnitt aus `webkitRelativePath` (der gewählte
  Wurzelordner selbst) wird verworfen — das Fach ist bereits über
  `selectedCourse` gewählt, keine weitere Themen-Ebene dafür nötig. PDFs
  direkt im Wurzelordner (kein Unterordner) verhalten sich wie beim
  bisherigen Mehrfach-Import (`parent_id = null`). `knownTopics` wird
  während des Imports laufend um neu angelegte Ordner- und
  Kapitel-Themen erweitert, damit `ensureFolderTopicPath` sie sofort für
  nachfolgende Dateien desselben Imports wiederverwenden kann, ohne
  zwischendurch aus der DB neu zu laden.
- **14 neue Tests** (`tests/data/importTopics.test.ts`): `parentTopicId`
  wird korrekt gesetzt, `ensureFolderTopicPath` legt verschachtelte
  Themen an, dedupliziert (auch über Groß-/Kleinschreibung und
  Sonderzeichen hinweg), hält gleichnamige Ordner unter verschiedenen
  Elternthemen auseinander, vergibt fortlaufende `sort_order` unter
  Geschwistern, wirft bei leerer Pfadkette.
- **Im frischen Tab geprüft:** App lädt fehlerfrei, keine neuen
  Konsolenfehler. Ein echter Ende-zu-Ende-Durchlauf (Fach anlegen →
  Ordner importieren) ist im Dev-Server aus dem bekannten Grund nicht
  erreichbar (Fach-Anlegen scheitert ohne echtes Tauri-Fenster, wie bei
  jedem Persistenz-Baustein) — die eigentliche Logik ist über die 14
  Unit-Tests gegen eine echte In-Memory-SQLite-Datenbank abgedeckt.
- **Release v0.14.0 veröffentlicht** (signiert, `latest.json` aktualisiert,
  Auto-Updater greift). `npx tsc --noEmit`, `npm test` (381 Tests) und
  `npm run build` liefen vor dem Release fehlerfrei.
- **Keine weitere offene Aufgabe aus diesem Wunsch** — vollständig
  umgesetzt.

### Seitenleiste größenverstellbar und einklappbar (v0.15.0)

Nutzerwunsch: die linke Navigationsleiste (Fächer, Verfügbarkeit, Planung,
…) sollte sich in der Breite anpassen und komplett wegklappen lassen, damit
mehr Platz für den eigentlichen Inhalt bleibt — wie in der Claude-App. Kein
neuer Branch-Name mit PR-Nummer-Präzedenzfall nötig, gleicher Ablauf wie
beim Ordner-Import: Branch `feat/sidebar-resizable-collapsible`,
[PR #45](https://github.com/henrigrimme/Lernplaner/pull/45) (Squash-Merge,
ausdrücklich freigegeben — siehe „Freigaben" oben).

- **`ui/AppSidebar.tsx`** (neu): reine Präsentationskomponente wie
  `TopicTree`/`CourseSetup`. Breite (`width`) und Eingeklappt-Status
  (`collapsed`) kommen als Props von außen (kontrollierte Komponente) —
  die Komponente hält nur den kurzlebigen `isResizing`-Zustand während
  einer laufenden Ziehbewegung. Ein Trenngriff (`role="separator"`, echtes
  `<button>` statt reinem `<div>` für Tastaturbedienbarkeit) am rechten
  Rand: Ziehen per Maus (`document`-weite `mousemove`/`mouseup`-Listener,
  analog zum Muster in `ui/PdfViewer.tsx`s Selektions-Listener),
  Pfeiltasten (±16px), Home/End (Minimal-/Maximalbreite), Doppelklick setzt
  die Standardbreite (260px) zurück. Grenzen `MIN_SIDEBAR_WIDTH` (200) /
  `MAX_SIDEBAR_WIDTH` (420), exportiert und in `App.tsx` beim Lesen aus
  `localStorage` zum Klemmen wiederverwendet (kein doppelt gepflegter
  Grenzwert). Bei `collapsed = true` liefert die Komponente `null` — die
  Leiste verschwindet vollständig aus dem DOM, nicht nur optisch
  (`display: none`/Breite 0 hätte den Screenreader-Baum unnötig
  aufgebläht).
- **`App.tsx`**: `sidebarWidth`/`sidebarCollapsed`-Zustand, in
  `localStorage` gespiegelt (`lernplaner.sidebarWidth`/
  `lernplaner.sidebarCollapsed`) — **bewusst nicht** in SQLite wie die
  übrigen Entitäten (Persistenz-Härtung Bausteine 1–7): eine reine
  geräteabhängige UI-Präferenz, kein Lerninhalt, muss zwischen den zwei
  Nutzern nicht geteilt werden, und `localStorage` funktioniert (anders als
  `getDb()`/`tauri-plugin-sql`) auch ohne echtes Tauri-Fenster — dieselbe
  Einschränkung, die bei jedem anderen Persistenz-Baustein den
  Dev-Server-Test verhindert, greift hier also nicht. `app-shell`s
  `grid-template-columns` wird per Inline-Style aus diesem Zustand gesetzt
  (`${collapsed ? 0 : width}px 1fr`) — dynamischer Laufzeitwert, bewusste
  Ausnahme von der sonstigen Konvention „keine Inline-Styles in `App.tsx`"
  (CSS-Klassen können keinen beliebigen Pixelwert abbilden). Toggle-Button
  für Ein-/Ausklappen sitzt in der Toolbar (`app-sidebar-toggle`,
  CSS-gezeichnetes macOS-artiges Sidebar-Symbol, kein SVG/Icon-Set im
  Projekt) — bewusst dort und nicht in der Leiste selbst: bei vollständig
  weggeklappter Leiste gäbe es sonst keinen Weg mehr zurück.
- **7 neue Tests** (`tests/ui/AppSidebar.test.tsx`): Breite wird gesetzt,
  `collapsed` rendert nichts, Ziehen ruft `onResize` mit der Mausposition
  auf (und nicht mehr nach `mouseup`), Klemmen auf Min/Max, Pfeiltasten,
  Home/End, Doppelklick-Reset.
- **Im echten Browser getestet** (Playwright gegen `npm run dev` — hier
  tatsächlich vollständig möglich, anders als bei jedem
  Persistenz-Baustein: `localStorage` statt SQLite, kein Tauri-Fenster
  nötig): Resize per Drag (260px → 420px, korrekt geklemmt), Einklappen
  (Leiste verschwindet vollständig, 0 DOM-Elemente), Ausklappen (Breite
  bleibt bei 420px erhalten), **Reload** (Breite bleibt über
  `localStorage` erhalten) — keine Konsolenfehler. Screenshots bestätigen
  das erwartete Erscheinungsbild.
- **Release v0.15.0 veröffentlicht** (signiert, `latest.json`
  aktualisiert). `npx tsc --noEmit`, `npm test` (388 Tests) und
  `npm run build` liefen vor dem Release fehlerfrei.
- **Keine weitere offene Aufgabe aus diesem Wunsch** — vollständig
  umgesetzt.

### Liquid Glass, Dock-Hover, Keychain-Cache (v0.16.0)

Vier kleinere, im selben Zug umgesetzte Nutzerwünsche: mehr Liquid-Glass-
Charakter (wie bei Apple), ein Dock-artiger Wachstums-Effekt beim
Vorbeifahren mit der Maus über die Sidebar, die Seitenleiste so schmal
ziehbar machen, dass Text abgeschnitten wird, Klarheit über die
Prioritäts-/Schwierigkeits-Richtung, und (aus der Nachfrage zum
wiederkehrenden Keychain-Dialog entstanden) weniger native
Keychain-Zugriffe. Branch `feat/liquid-glass-dock-hover`,
[PR #46](https://github.com/henrigrimme/Lernplaner/pull/46) (Squash-Merge,
freigegeben).

- **`tokens.css`**: `--glass-blur` 20px → 26px, `--glass-saturate` 1.8 →
  2, neue Variable `--glass-highlight` (dezenter 1px-Specular-Highlight am
  oberen Rand von Sidebar/Toolbar, per `box-shadow: inset`) — das ist der
  eigentliche „Liquid"-Anteil (Licht bricht sich sichtbar an der Kante),
  nicht nur ein trüber Filter. Auch für Dark Mode und
  `prefers-reduced-transparency` abgesichert (dort `transparent`), wie die
  übrigen Glas-Variablen.
- **Dock-Magnify** (`ui/AppSidebar.tsx`): `.app-nav-item`-Einträge wachsen
  je nach Abstand zur Maus (nur Y-Achse, vertikale Liste) über eine
  CSS-Custom-Property `--dock-scale`, die `global.css` als
  `transform: scale(var(--dock-scale, 1))` liest. Direkte DOM-Mutation
  (`item.style.setProperty`) statt React-State/Re-Render pro
  Mausbewegung, `requestAnimationFrame`-gedrosselt. Bewusst gedämpft
  (max. 10 % Wachstum, Radius 70px) — anders als beim echten Dock sind das
  Textzeilen, keine quadratischen Icon-Glyphen, ein größerer Sprung hätte
  nur unruhig gewirkt. Reagiert automatisch auf
  `prefers-reduced-motion` (globaler Fallback in `global.css`, forciert
  `transition-duration` nahe 0 — kein Extra-Code nötig).
- **Seitenleiste bis auf 64px ziehbar** (`MIN_SIDEBAR_WIDTH` 200 → 64,
  `AppSidebar.tsx`): `.app-nav-item`/`.app-brand`-Beschriftung jetzt in
  eigene `<span>`s mit `white-space: nowrap` + `text-overflow: ellipsis`
  gefasst (vorher direkter Text-Kindknoten des Flex-Buttons — Ellipsis
  greift zuverlässig nur an einem eigenen Block-/Inline-Block-Element,
  nicht am Flex-Container selbst). `min-width: 0` an jeder Flex-Ebene
  nötig, sonst verhindert Flexbox' Default (`min-width: auto`) das
  Schrumpfen unter die Inhaltsbreite. Bleibt eine eigene, unabhängige
  Einstellung vom vollständigen Wegklappen (`collapsed`-Toggle in der
  Toolbar) — dieser Minimalwert ist nur die Ziehgrenze.
- **`ui/CourseSetup.tsx`**: Labels „Priorität"/„Schwierigkeit" um
  „(1 = niedrig, 5 = hoch)" bzw. „(1 = leicht, 5 = schwer)" ergänzt — vorher
  nirgends ersichtlich, in welche Richtung die Skala zeigt.
  `difficulty`-Richtung war über `domain/estimation.ts`s
  `scaleMultiplier` bereits real festgelegt (höherer Wert → mehr
  Lernzeit, siehe „Phase 2 — Planung"-Abschnitt oben); `priority` ist
  aktuell ein unbenutztes, für spätere Planungslogik vorgesehenes Feld
  (nur in `coursesRepo.ts` gespeichert, sonst nirgends gelesen) — die
  Richtung „1 = niedrig, 5 = hoch" ist hier eine reine Beschriftungs-
  Konvention, konsistent mit `difficulty` gewählt, keine bestehende
  Logik geändert.
- **`platform/keychain.ts`**: In-Memory-Cache pro `account`
  (`Map<string, string | null>`, Sitzungsdauer, kein `localStorage`).
  Grund: `AiSettings.tsx` liest bei jedem Öffnen von „Einstellungen" und
  jede KI-Funktion (`ai/index.ts` `getConfiguredAIProvider`) bei jeder
  Nutzung erneut aus der Keychain — jeder native Zugriff kann macOS'
  Zugriffsdialog auslösen. Mit Cache passiert der native Zugriff
  höchstens einmal je Account und App-Start. **Löst nicht** den
  separaten, bereits dokumentierten Grund, warum der Dialog nach jedem
  neuen Release-Build erneut erscheint (fehlende
  Apple-Developer-ID-Signatur, ADR-008/009 weiter oben) — das ist ein
  Signatur-, kein Zugriffshäufigkeits-Problem, bleibt bestehen.
- **5 neue Tests** (`tests/platform/keychain.test.ts`, `@tauri-apps/api/core`
  gemockt): wiederholtes Lesen desselben Accounts ruft nur einmal nativ
  auf, „nicht vorhanden" (`null`) wird ebenfalls gecacht, verschiedene
  Accounts unabhängig, `set`/`delete` aktualisieren den Cache sofort ohne
  zusätzlichen nativen Lesezugriff.
- **Im echten Browser getestet** (Playwright gegen `npm run dev`):
  Dock-Hover bestätigt (gehovertes Item ≈1.10x-Skalierung, direkter
  Nachbar ≈1.06x — Abstands-Falloff funktioniert), Sidebar auf 64–70px
  gezogen und Text sichtbar per Ellipsis abgeschnitten (Screenshot),
  keine Konsolenfehler.
- **Release v0.16.0 veröffentlicht** (signiert, `latest.json`
  aktualisiert). `npx tsc --noEmit`, `npm test` (393 Tests) und
  `npm run build` liefen vor dem Release fehlerfrei.
- **Keine weitere offene Aufgabe aus diesen vier Wünschen** — vollständig
  umgesetzt.

### Sidebar schwebt über dem Inhalt + PDF-Worker-Bugfix (v0.17.0)

Zwei Teile in einem Release gebündelt: das eigentliche Liquid-Glass-Redesign
(Fortsetzung des v0.16.0-Wunsches, „genau wie bei Apple, aber Farben/
Hintergrund unverändert lassen") und ein davon unabhängiger, vom Nutzer als
**Priorität 1** gemeldeter Bug beim PDF-/Ordner-Import. Branches
`feat/floating-glass-sidebar` ([PR #47](https://github.com/henrigrimme/Lernplaner/pull/47))
und `fix/pdf-worker-import-not-working`
([PR #48](https://github.com/henrigrimme/Lernplaner/pull/48)), beide
gemergt, gemeinsam released.

**Vorgeschichte des Redesigns:** Ein erster Versuch in derselben Sitzung
(Sidebar-Inhalt per negativem Innenabstand überlappen lassen) hat
tatsächlich lesbaren Text unter der Glasleiste verschwinden lassen
(„Lernplaner" wurde zu „…ner") — sofort per `git restore` zurückgesetzt,
bevor er committet wurde. Ursache war ein Rechenfehler: der Überlappungs-
Betrag war kleiner als `.app-content`s eigener linker Innenabstand, wodurch
die Box nie wirklich unter die Sidebar reichte, aber der Container-weite
Versatz trotzdem den gesamten Text mitgezogen hat. Der zweite, tatsächlich
umgesetzte Versuch behebt das strukturell (siehe unten) — **wichtige Lehre
für künftige Layout-Änderungen an diesem Bereich:** jede Verschiebung, die
Text betrifft, muss exakt gegengerechnet werden (Box-Versatz und
Text-Innenabstand ändern sich gegenläufig um denselben Betrag), nicht nur
grob geschätzt.

**Sidebar-Umbau** (`global.css`, `App.tsx`):
- `.app-sidebar` ist jetzt `position: fixed` (vorher Grid-Spalte neben dem
  Inhalt) — entspricht PRODUCT.md's eigener, bis dahin nicht wirklich
  umgesetzter Vorgabe „Sidebar ... schweben mit spürbarer Vibrancy über dem
  Inhalt". Dazu ein echter, jetzt gerechtfertigter Schlagschatten am
  rechten Rand (DESIGN.md „Glass-Not-Shadow Rule" galt für Spalten
  nebeneinander, nicht für eine wirklich erhöhte, schwebende Ebene).
- Neuer Wrapper `.app-main` (Toolbar+Inhalt, volle Breite) mit
  Custom-Property `--main-inset` (von `App.tsx` gesetzt, Laufzeitwert
  `sidebarWidth`/`sidebarCollapsed`) — hält Text an **exakt** derselben
  Position wie vorher die Grid-Spalte, keine Verschiebung.
- **Einzige bewusste Ausnahme:** neue Opt-in-Klasse
  `.grouped-list--bleed-left`, nur in `ui/CourseSetup.tsx`s Fach-Liste
  eingesetzt (Pilot „Fächer & Themen"). Lässt die dekorative Box (Fläche,
  Rand, abgerundete Ecken) 24px unter das Glas reichen (`--bleed: 72px` —
  muss größer sein als `.app-content`s 48px-Innenabstand, sonst reicht sie
  nie wirklich hinüber, siehe „Vorgeschichte" oben), während `li`-Text um
  denselben Betrag zusätzlich eingerückt wird und dadurch exakt an seiner
  ursprünglichen Position bleibt. `overflow-x: hidden` auf `.app-content`
  fängt ab, dass diese Box bei eingeklappter Sidebar über den linken
  Fensterrand hinausragt.
- Visuell dezent (Box-Fläche `--color-surface` vs. App-Hintergrund
  `--color-bg` liegen bewusst nah beieinander, „Ruhe vor Reichtum"), aber
  ein echter, im Screenshot bestätigter Glaseffekt (abgerundete Ecke
  sichtbar durchs Glas), nicht nur eine Lichtkante wie in v0.16.0. Bei
  Bedarf auf weitere Ansichten übertragbar — bewusst nicht pauschal
  gemacht, jede Anwendung ist eine eigene, geprüfte Entscheidung.
- Mit dem `impeccable`-Skill erarbeitet (Nutzerwunsch, kompakter
  Shape-Brief statt vollem Ablauf, da PRODUCT.md/DESIGN.md Umfang und
  visuelle Richtung schon eindeutig beantworteten).

**PDF-/Ordner-Import-Bugfix — der eigentlich wichtige Teil:**
- **Symptom (Nutzerbericht):** Dateiauswahl-Dialog öffnet sich normal,
  nach der Auswahl passiert nichts — kein neues Fach/Dokument, keine
  Fehlermeldung, einfach still. Betraf sowohl einzelne PDFs als auch den
  Ordner-Import gleichermaßen.
- **Root Cause gefunden** (nach Ausschluss von SQL-Migrationen,
  Tauri-Capabilities/Berechtigungen, CSP — alle unauffällig): ein
  bekannter, beim Mozilla/Tauri-Projekt selbst noch ungelöster Bug
  (`tauri-apps/tauri#9975`, reproduziert explizit auf macOS). pdf.js lädt
  seinen Worker über einen verschachtelten Modul-Import; im **gebauten**
  (nicht dem Dev-Server-)Tauri-Fenster liefert Tauris Asset-Protokoll dafür
  manchmal fälschlich `index.html` statt der echten Worker-Datei zurück
  („SyntaxError: Unexpected token '<'"), wodurch `getDocument()` lautlos
  hängt.
- **Warum das nie vorher auffiel:** `scripts/analyze-material.ts`
  (Node-Diagnosewerkzeug, mit dem die Extraktion ausführlich an echtem
  Material validiert wurde, siehe Abschnitt 4/8 oben) läuft unter Node,
  wo pdf.js automatisch auf einen synchronen „Fake Worker" zurückfällt —
  nie einen echten Worker lädt, der betroffen sein könnte. Die
  Dev-Server-Playwright-Checks (viele Male in dieser Datei dokumentiert)
  laufen über ein anderes Protokoll (`http://localhost:1420`), ebenfalls
  nicht betroffen. **Ein echter Ende-zu-Ende-Import im tatsächlich
  gebauten `.app` wurde bis zu diesem Bugreport nie verifiziert** — jede
  frühere „Im frischen Tab geprüft"-Notiz in dieser Datei bezog sich
  explizit auf den Dev-Server, mit der bekannten Einschränkung „echter
  Durchlauf nicht erreichbar (kein Tauri-Fenster)". Diese Lücke selbst ist
  die eigentliche Lehre: eine Funktion, die nur im echten gebauten Fenster
  läuft, kann einen Fehler tragen, der durch keinen der bisherigen
  Testwege auffällt.
- **Fix** (`ingest/pdf.ts`, neue `configureWorker()`-Funktion, jetzt
  geteilt mit `ui/PdfViewer.tsx` statt dort dupliziert — betraf auch das
  reine PDF-**Anzeigen**, nicht nur den Import, aus demselben Grund): die
  Worker-Datei ganz normal per `fetch()` laden (funktioniert zuverlässig,
  derselbe Mechanismus, über den auch das Haupt-Bundle lädt) und über eine
  `Blob`-URL bereitstellen, statt pdf.js selbst den betroffenen Pfad
  auflösen zu lassen. Fällt bei Fetch-Fehlern auf den bisherigen direkten
  Pfad zurück. Per `navigator.userAgent`-Erkennung in jsdom (Vitest-UI-
  Tests) deaktiviert (dort sonst ein echter, sinnloser Netzwerk-Fetch
  gegen eine `file://`-URL, der `tests/ui/PdfViewer.test.tsx` durch
  Zeitüberschreitung hat scheitern lassen, bevor der Guard ergänzt wurde).
- **Zusätzlich, unabhängig von der eigentlichen Ursache:** Import-Fehler
  landen jetzt sichtbar in der App (`App.tsx`, neuer `importError`-State,
  `role="alert"`) statt nur in `console.error` — in einem Release-Build
  ohnehin unsichtbar, da `tauri_plugin_log` nur bei
  `cfg!(debug_assertions)` (Debug-Builds) aktiv ist. Macht künftige
  Import-Fehler sofort diagnostizierbar, unabhängig vom Grund.
- **Noch nicht verifiziert:** der eigentliche Fix wurde **nicht** im
  echten gebauten Tauri-Fenster getestet (nur die Ursachenanalyse und der
  Fix-Mechanismus sind durch die Recherche/den Code belastbar, plus
  Dev-Server-Konsolencheck ohne Fehler, `npm test`/`npx tsc --noEmit`/
  `npm run build` fehlerfrei) — der Nutzer wurde gebeten, v0.17.0 zu
  testen und zurückzumelden. **Nächste Sitzung: zuerst fragen, ob der
  Import jetzt funktioniert**, bevor an diesem Bereich weitergearbeitet
  wird. Falls nicht: die neue sichtbare Fehlermeldung sollte die exakte
  Fehlerursache zeigen, das ist jetzt der schnellste nächste
  Diagnoseschritt.
- **Release v0.17.0 veröffentlicht** (signiert, `latest.json`
  aktualisiert, Zip zusätzlich per SendUserFile geschickt).

### Import-Bug-Serie, Teil 2: ArrayBuffer-Detach + nativer Ordner-Dialog (v0.18.0)

Direkte Fortsetzung von oben: der v0.17.0-Worker-Fix hat den Import so weit
gebracht, dass ein **zweiter, echter Fehler** sichtbar wurde (dank der neu
eingebauten sichtbaren Fehleranzeige — genau der Zweck, für den sie gebaut
wurde): `„WHU_FSA_Lecture 1_2025.pdf" konnte nicht importiert werden:
Underlying ArrayBuffer has been detached from the view or out-of-bounds`.
Gleichzeitig weiterhin gemeldet: Ordner-Import zeigt **immer noch gar
keine** Reaktion (kein Fehler, kein Fach). Zwei unabhängige Root Causes,
beide in derselben Sitzung behoben, `fix/pdf-buffer-detached-and-native-folder-picker`,
[PR #49](https://github.com/henrigrimme/Lernplaner/pull/49).

**1) ArrayBuffer-Detach (der PDF-Einzelimport-Fehler):**
- **Ursache:** pdf.js überträgt den `ArrayBuffer` hinter `Uint8Array` als
  `Transferable` an seinen Worker (Zero-Copy-Performance) — danach ist der
  **Original**-Buffer „detached", jeder weitere Lesezugriff wirft genau
  diesen Fehler. `App.tsx`s `importRegularPdf`/`importSummaryPdf` lesen
  `data` aber mehrfach: erst `extractDocument(data, ...)` (öffnet den
  Worker, detacht den Buffer), danach nochmal `computeSha256(data)`,
  `saveDocumentFile(sha256, data)`, und `importPdfs`/`importFolder` legen
  `data` am Ende auch noch in `setDocumentBytes` ab.
- **Fix** (`ingest/pdf.ts` `readPages`, `ui/PdfViewer.tsx`): `data.slice()`
  statt `data` direkt an `pdfjs.getDocument()` übergeben — eine
  unabhängige Kopie, die pdf.js „verbrauchen" darf, während das Original
  beim Aufrufer unangetastet bleibt.
- **Betraf auch das reine PDF-Anzeigen, nicht nur den Import:**
  `PdfViewer.tsx`s Effekt läuft bei **jedem Seitenwechsel** erneut mit
  demselben `data`-Prop und ruft `getDocument({data})` jedes Mal neu auf
  (kein wiederverwendetes offenes Dokument) — ohne den Fix wäre spätestens
  der zweite Seitenwechsel beim Betrachten eines bereits importierten PDFs
  fehlgeschlagen. Bisher nicht aufgefallen, weil kein Testpfad tatsächlich
  zwei Seiten eines echten PDFs mit echtem Worker nacheinander geöffnet
  hat (`PdfViewer.test.tsx` mockt `pdfjs` komplett, siehe dort).

**2) Ordner-Import — kompletter Umbau auf nativen Dialog:**
- **Ursache:** `<input type="file" webkitdirectory>` gilt in WKWebView
  (Tauris Webview unter macOS) als bekannt unzuverlässig — recherchiert
  über mehrere Quellen (u. a. Apple-Entwicklerforum), der „Auswählen"-
  Button im Systemdialog kann beim Navigieren in einen Ordner deaktiviert
  bleiben. Passt exakt zum Symptom „Dialog verhält sich komisch, am Ende
  passiert nichts" — der Nutzer kommt vermutlich nie bis zu einer
  tatsächlichen Ordnerauswahl, die einen `change`-Event mit Dateien
  auslösen würde.
- **Fix, kein Workaround** (neu: `platform/folderImport.ts`): kompletter
  Wechsel von der Browser-API auf Tauris eigene, native Mechanismen —
  `@tauri-apps/plugin-dialog`s `open({directory: true})` für den echten
  macOS-Ordnerdialog, `@tauri-apps/plugin-fs`s `readDir`/`readFile` für
  rekursives Einlesen aller PDFs im gewählten Ordner (selbst geschriebene
  Rekursion, `readDir` ist in Tauri 2 nicht rekursiv). Neue Rust-
  Abhängigkeit `tauri-plugin-dialog`, in `lib.rs` registriert.
- **Neue Berechtigung** (`capabilities/default.json`): `fs:allow-read-file`/
  `-read-dir`/`-exists` jetzt zusätzlich auf `$HOME/**` (vorher nur
  `$APPDATA/documents/*`) — Vorlesungsmaterial liegt nicht zwingend im
  App-Datenordner. Reiner Lesezugriff, kein Schreiben außerhalb von
  `$APPDATA/documents`; `dialog:allow-open` zusätzlich. In SECURITY.md
  dokumentiert.
- **API-Änderung:** `importRegularPdf`/`importSummaryPdf` nehmen jetzt
  einen Dateinamen (`string`) statt eines `File`-Objekts entgegen — einzige
  bisher genutzte `File`-Eigenschaft war `.name`, dadurch funktioniert
  derselbe Code für Browser-`File`-Objekte (Einzelimport, `<input>` bleibt
  dafür bestehen — nur der *Ordner*-Import wurde umgebaut) und nativ per
  `readFile` gelesene Bytes (Ordner-Import) gleichermaßen. Die alte
  `relativePath`-Segmentierung (`slice(1, -1)`, dropte den Namen des
  Browser-`webkitRelativePath`-Wurzelordners) wurde zu `slice(0, -1)`
  angepasst, da `readPdfFilesRecursively`s `relativePath` den Wurzelordner
  von vornherein nicht mitführt.
- **Grenze dieser Sitzung:** wie beim Worker-Fix zuvor lässt sich der
  eigentliche native Dialog/Dateisystemzugriff **nicht** im Dev-Server
  verifizieren (`@tauri-apps/plugin-dialog`/`-fs` brauchen die echte
  Tauri-IPC-Bridge). Abgesichert: `npx tsc --noEmit`, `npm test` (393
  Tests), `npm run build`, `cargo check` (neues Plugin kompiliert sauber)
  liefen alle fehlerfrei; Dev-Server-Konsolencheck ohne neue Fehler.
- **Release v0.18.0 veröffentlicht** (signiert, `latest.json`
  aktualisiert, Zip per SendUserFile geschickt). **Noch nicht vom Nutzer
  im echten Fenster bestätigt** — das gilt jetzt für alle drei
  Import-Fixes zusammen (Worker, ArrayBuffer, Ordner-Dialog). Nächste
  Sitzung: zuerst nachfragen, ob PDF- **und** Ordner-Import beide
  funktionieren, bevor an diesem Bereich weitergearbeitet wird.

### Nachtsitzung 22.07.→23.07.2026 — große Wunschliste, autonom umgesetzt

Der Nutzer hat in einer einzigen Nachricht eine große Zahl an Wünschen
gegeben und ist dann schlafen gegangen, mit der ausdrücklichen Anweisung,
komplett autonom weiterzuarbeiten („mache das bitte alles komplett
selbstständig … arbeite weiter, bis Du der Meinung bist, dass Du nichts
mehr tun kannst"). **Wichtige Klarstellung, die im Gespräch selbst
festgehalten wurde:** Claude hat *keinen* Bildschirmzugriff und kann die
native App nicht klicken/bedienen — das ursprüngliche Nutzerbild („du
kannst dir doch selbst 10–15 Durchgänge in der App ansehen") war falsch;
stattdessen wurde die reale Ingest-Pipeline über die Node-Kommandozeilen-
Werkzeuge (`npm run analyze`/`npm run preview-import`) gegen das echte
Beispielmaterial (`Beispiel pdfs/`, 92 PDFs über alle Fächer) getestet —
das ist die einzige Form von „Selbsttest", die tatsächlich möglich war.
**Für die nächste Sitzung wichtig zu wissen, falls das noch nicht
angesprochen wurde.**

**Reihenfolge der Nacht** (jeweils eigener Branch → PR → Squash-Merge →
sofort released, wie in [[feedback_lernplaner_auto_release]]/
[[feedback_lernplaner_pr_merge_autonomy]] festgelegt — beide Freigaben
wurden in dieser Sitzung vom Nutzer nochmal ausdrücklich bestätigt, nachdem
der Auto-Mode-Classifier sie einmal blockiert hatte):

1. **v0.19.0 — Dark Mode, Prüfungsformat-Mehrfachauswahl, Quiz-
   Verbesserungen** (PR #50):
   - `ui/AppearanceSetting.tsx` (neu): Hell/Dunkel/System wählbar,
     `localStorage` + `data-theme`-Attribut auf `<html>`, `tokens.css`
     bekam `:root[data-theme='dark'/'light']`-Blöcke neben der
     bestehenden `prefers-color-scheme`-Media-Query.
   - `AssessmentSetup.tsx`: Prüfungsformat ist jetzt eine Checkbox-Gruppe
     statt Einzel-Dropdown. **Bewusst kein Schema-Umbau** —
     `assessments.format` bleibt eine einzelne Spalte
     (`AssessmentFormat`-Enum unverändert), bei genau einer Auswahl wird
     sie direkt gespeichert, bei mehreren `'mixed'` (bereits bestehender
     Wert, `EXAM_FORMAT_MULTIPLIER.mixed` in `domain/estimation.ts` deckt
     den Fall schon ab). Konsequenz: eine `'mixed'`-Prüfung lässt sich
     beim Bearbeiten nicht mehr in ihre ursprünglichen Einzelformate
     zurückübersetzen (Checkboxen starten dann leer) — dokumentiert im
     Code, kein Datenverlust, nur keine Rekonstruktion.
   - **Migration 0004** (`quiz_language_and_options.sql`):
     `questions.options` (JSON-Array der MC-Antwortoptionen, `NULL` bei
     Freitext oder alten Fragen) + `courses.language` (`'de'`/`'en'`,
     Default `'de'`). `ai/types.ts` `QuestionSuggestion.options` neu,
     `generateQuestions` bekommt `difficulty`/`language`-Parameter, beide
     Provider-Prompts (`anthropicProvider.ts`/`openaiProvider.ts`)
     angepasst. **Wichtig:** die KI-Sprache ist reine Fach-Eigenschaft
     (`CourseSetup.tsx` neues Feld) — die App-Oberfläche selbst (Menüs,
     Planung, Kalender) bleibt immer Deutsch, nur Quiz/Zusammenfassungs-
     Erkennung/Altklausur-Analyse für dieses Fach laufen in seiner
     Sprache.
   - `ui/QuizSession.tsx`: MC-Antworten jetzt anklickbare Buttons
     (`question.options`), fällt bei `options === null` (alte Fragen) auf
     das bisherige Texteingabefeld zurück — kein Datenverlust für
     bestehende Quizze.
   - `ui/QuizSetup.tsx`: Schwierigkeit (einfach/mittel/schwer) wählbar,
     „Fragen je Abschnitt"-Obergrenze von 10 auf 20 angehoben, laufende
     Gesamtzahl-Anzeige. **Deckt einen Teil des Wunsches „mehr
     Rückfragen vor der Quiz-Erstellung wie bei Claude" ab, aber nicht
     vollständig** — siehe Ideen-Liste unten.
   - 14 neue Tests (`AppearanceSetting`, `questionsRepo`-Options-
     Rückgabe, `QuizSession`-Klick-Verhalten).

2. **v0.20.0, Teil 1 — Fach-Ordner + Farbpaletten** (PR #51):
   - **Migration 0005** (`course_groups.sql`): neue Tabelle
     `course_groups` (`id`, `parent_id`, `name`, `sort_order`,
     `ON DELETE CASCADE` auf sich selbst) + `courses.group_id`
     (`ON DELETE SET NULL`). **Bewusst eigene Tabelle, nicht
     `courses.parent_id`** — ein Ordner ist kein Fach (keine
     Prüfungen/Themen/Priorität/Schwierigkeit), beides im selben Datensatz
     zu modellieren hätte zwei unterschiedliche Konzepte vermischt.
   - `data/courseGroups.ts` (reine Baumfunktionen, `buildCourseGroupTree`/
     `renameCourseGroup`/`moveCourseGroup`/`deleteCourseGroup`, eng an
     `data/topicTree.ts` angelehnt, aber ohne `weight`/`difficulty`-
     Vererbung) + `data/courseGroupsRepo.ts` (SQL) + neue
     `ui/CourseGroups.tsx` (Ordner anlegen/umbenennen/verschieben/löschen,
     Fach per Dropdown zuweisen — bewusst kein Drag & Drop, gleiche
     Begründung wie schon bei `TopicTree.tsx`: tastaturbedienbar, keine
     neue Laufzeit-Abhängigkeit).
   - **Seitenleiste zeigt jetzt den Ordnerbaum** (`App.tsx`
     `renderSidebarCourseTree`, neue modulweite Funktion): Ordner als
     nicht klickbare, eingerückte `app-nav-label`-Zwischenüberschriften,
     Fächer darunter wie bisher als `app-nav-item`. Nicht zugewiesene
     Fächer bleiben wie bisher flach oben in der Liste.
   - **Farbpaletten** (`ui/AppearanceSetting.tsx` erweitert): Terrakotta
     bleibt Standard, dazu British Racing Green, NATO Olive, Petrol,
     Bordeaux zur Wahl (Nutzerwunsch, explizit die ersten beiden Namen
     genannt). `data-palette`-Attribut auf `<html>`, `tokens.css`
     `[data-palette]`-Blöcke überschreiben **nur** die Primär-Akzentfarbe
     (Buttons, aktiver Sidebar-Eintrag) — die warmen Papier-/Sand-
     Neutralfarben und der sekundäre Petrol-Akzent bleiben immer gleich,
     das ist die eigentliche Markenidentität (DESIGN.md „One Accent
     Rule"), nicht die Akzentfarbe selbst. Bewusst nicht separat für
     Hell/Dunkel dupliziert (anders als `[data-theme]`) — Aufwand stand in
     keinem Verhältnis zum Nutzen, im Screenshot (Dunkel + NATO Olive)
     bestätigt gut lesbar.
   - **Vorgeschichte/Lehre aus einem verworfenen Zwischenversuch (noch vor
     dieser Liste, aber in derselben Sitzung):** ein erster Ansatz für
     „Sidebar schwebt über Inhalt, mit sichtbarem Glaseffekt" ließ echten
     Text unter der Glasleiste verschwinden (negativer Versatz war
     kleiner als der Innenabstand des Containers, siehe Abschnitt weiter
     oben „Sidebar schwebt über dem Inhalt + PDF-Worker-Bugfix (v0.17.0)"
     für die volle Analyse) — sofort per `git restore` verworfen, bevor
     committet. Der zweite, tatsächlich umgesetzte und released
     Versuch (`.grouped-list--bleed-left`) rechnet den Versatz exakt
     gegen, siehe dort. Bei jeder künftigen Layout-Änderung an diesem
     Bereich: Box-Versatz und Text-Innenabstand müssen sich exakt
     gegenläufig um denselben Betrag ändern, nicht nur grob geschätzt
     werden.
   - 12 neue Tests (`courseGroups`, `courseGroupsRepo`).

3. **v0.20.0, Teil 2 — Dokumentenliste kompakter** (PR #52):
   - `ui/DocumentList.tsx`: kleines CSS-gezeichnetes Dokument-Symbol
     (Seite mit umgeknickter Ecke, wie `.app-sidebar-toggle-icon` kein
     Icon-Set im Projekt) + einzeiliger, bei Bedarf abgeschnittener
     Dateiname statt langer Textzeile. Überschrift von „Importierte
     Dokumente — {Fach}" auf „Dokumente" verkürzt (Fach steht ohnehin
     schon im Toolbar-Kontext). Direkte Reaktion auf den Nutzerwunsch
     „PDF-Icons und kurze Beschreibung statt komplett ausgeschriebenem
     Text".

4. **v0.20.0, Teil 3 — Ordner-Import meldet übersprungene Dateien**
   (PR #53) — **direkt aus einem echten Nutzerbericht entstanden:**
   „Ordner hochgeladen, aber nicht alle Dokumente wurden komplett
   übernommen." Ursache am echten Beispielmaterial bestätigt:
   `Beispiel pdfs/4. Semester Kopie/` enthält u. a. `.docx`/`.xlsx`/
   `.pptx`/`.csv`/`.html`-Dateien (Paper, Case-Study-Foliensätze, Excel-
   Gruppeneinteilung, SQL-Workshop-Daten) — der Ordner-Import
   unterstützt bisher nur PDF (CONTEXT.md „Anforderungen", bestätigt) und
   hat alles andere bisher **lautlos** übersprungen. `platform/
   folderImport.ts` `readPdfFilesRecursively` liefert jetzt zusätzlich
   die Liste übersprungener Dateien (ignoriert `.DS_Store`/`Thumbs.db`),
   `App.tsx` zeigt sie sichtbar an (neuer `importInfo`-State,
   `role="status"`, oder als Teil der Fehlermeldung, falls der Ordner gar
   keine PDFs enthält). **Löst nicht** das eigentliche „Word/Excel
   importieren" — siehe Ideen-Liste unten, das ist eine bewusste
   Grenze, keine vergessene Aufgabe.

**Selbsttest gegen echtes Material** (`npm run analyze`/
`--detail`, gegen alle 92 PDFs in `Beispiel pdfs/`, inkl. der bisher nie
geprüften `4. Semester Kopie/`-Fächer Business Mediation/Data & Information
Management/Money Banking/Entrepreneurial Transformation/Nurturing Customer
Relationships): **keine Abstürze, keine neuen Auffälligkeiten.** Titel-
Erkennung durchgehend 53–100 % (niedrigster Wert bei einem Gastvortrags-
Foliensatz mit unüblichem Format, kein Fehler). Eine einzige echte
Auffälligkeit: `Data & Information Management/Mock Exam.pdf` liefert 0
Zeichen auf allen 16 Seiten (`--detail` zeigt „TRENN S.1…16, 0z" durchgängig)
— ein **gescanntes/bildbasiertes PDF ohne Text-Layer**, deckt sich exakt mit
der bereits in Abschnitt 9 dokumentierten Einschränkung „Kein OCR" — **keine
neue Regression**, nur die erste konkrete Bestätigung dieses bekannten Falls
an echtem Material.

**Zurückgestellte Ideen — bewusst nicht blind gebaut, für ein Gespräch mit
dem Nutzer vorgemerkt (dessen eigene Anweisung: „bei Verbesserungen, die Du
noch nicht super findest, schreib sie auf, damit ich morgen fragen kann"):**

1. **Volle Word/Excel/PowerPoint-Unterstützung beim Import.** Reversiert die
   bisher bestätigte Anforderung „nur PDF" (CONTEXT.md Abschnitt 3). Bräuchte
   neue Parser-Abhängigkeiten (z. B. `mammoth` für `.docx`, `exceljs`/`xlsx`
   für `.xlsx`, eine `.pptx`-Bibliothek) und vor allem ein anderes
   Kapitelerkennungs-Konzept — die bestehende `ingest/chapters.ts`-Heuristik
   basiert komplett auf „Folien" (Titel im oberen Drittel, Trennfolien,
   Build-Schritte), das existiert bei einem Word-Dokument oder einer
   Excel-Tabelle nicht. Realistischste Route: denselben KI-Textanalyse-Pfad
   wie bei Zusammenfassungen nutzen (`ai/detectTopicsFromText`,
   ADR-015) — bräuchte aber jedes Mal einen KI-Aufruf (Kosten, Sprachwahl)
   statt der bisher kostenlosen, deterministischen PDF-Erkennung. Sollte vor
   dem Bauen abgestimmt werden: reicht „zumindest den Text lesbar machen",
   oder wird eine echte Themenerkennung wie bei PDFs erwartet? Auch zu
   klären: CSV/HTML zählen vermutlich nicht als Lernmaterial (Datendateien
   eines SQL-Workshops) — absichtlich draußen lassen?
2. **Tieferer Quiz-Konfigurationsdialog mit Rückfragen** („wie bei Claude,
   wenn man einen Prompt gibt"). Aktuell (v0.19.0) sind Schwierigkeit, Anzahl
   und Sprache (über die Fach-Einstellung) bereits vorab wählbar — das deckt
   einen Teil des Wunsches ab. Nicht gebaut: eine echte mehrstufige
   Rückfrage-Erfahrung („nur Rechenfragen?", „ungefähre Zieldauer?" als
   eigene, gezielt nachgefragte Schritte statt eines einzigen Formulars).
   Wäre ein neues UI-Interaktionsmuster (Konversation statt Formular) —
   bewusst nicht in derselben Nacht wie das Datenmodell-Update riskiert,
   da es eine eigene, in Ruhe getroffene UX-Entscheidung verdient.
3. **Größere Sidebar-/Detailansicht-Neugestaltung** in Richtung „ganz
   modernes Apple-Design, komplett intuitiv, wenig Text, viel Regler/
   Dropdown/Anklicken" (wörtlicher Nutzerwunsch). Diese Nacht bereits in
   diese Richtung bewegt (schwebendes Glas, Dark Mode, Farbpaletten,
   kompaktere Dokumentenliste, Fach-Ordner reduzieren die Listenlänge) —
   aber die „Fächer & Themen"-Seite zeigt weiterhin sehr viel auf einmal
   (Fach-Setup, Ordner-Verwaltung, Prüfungen, Paper-Schritte, Import,
   Dokumentenliste, Altklausur-Analyse, Themenbaum, Quellen-Betrachter,
   alles untereinander). Eine echte Lösung (z. B. eine fokussierte
   Detailansicht pro gewähltem Fach statt einer langen Ein-Seiten-Liste)
   ist ein eigener Design-Durchgang mit dem `impeccable`-Skill (Shape-Brief,
   ggf. Mockups), nicht etwas, das man nachts nebenbei umbaut, ohne das
   Ergebnis mit dem Nutzer abzustimmen — genau der Fehler, der beim
   verworfenen Sidebar-Zwischenversuch schon einmal passiert ist (siehe
   oben). „base44" (vom Nutzer als möglicher Design-Helfer genannt) ist
   eine No-Code-Plattform, für diesen nativen Tauri/Rust-Code nicht direkt
   anwendbar — stattdessen weiter mit dem vorhandenen `impeccable`-Skill
   und DESIGN.md arbeiten.
4. **Wiederkehrende Tages-Blocker in der Verfügbarkeit** (Mittagspause,
   Abendessen, Gym o. ä. als feste Zeitfenster an bestimmten Wochentagen,
   die automatisch von der verfügbaren Lernzeit abgezogen werden) — vom
   Nutzer selbst als „Priorität 1" zurückgestuft, als kurz danach der
   Upload-Bug gemeldet wurde. Nicht angefangen. Sauberster Ansatz: neue
   Tabelle `recurring_blockers` (`weekday`, `starts_at`, `ends_at`, `label`)
   + `domain/`-Funktion, die ein Zeitfenster minus überlappende Blocker zu
   Minuten verrechnet (Intervall-Überlappung, keine Doppelzählung bei sich
   überschneidenden Blockern) — plus eine Entscheidung, ob das bestehende
   direkte Minuten-Eingabefeld in `AvailabilitySetup.tsx` ersetzt oder nur
   ergänzt wird.

**Freigaben, die für diese Sitzung weiterhin gelten** (nochmal bestätigt,
siehe „Freigaben" ganz oben in dieser Datei): PR-Merges und GitHub-Release-
Veröffentlichungen laufen ohne erneute Rückfrage, auch wenn der
Auto-Mode-Classifier einzelne Aktionen technisch blockiert — dann kurz
nachfragen/erneut bestätigen lassen, nicht stillschweigend überspringen.

**Releases dieser Nacht:** v0.19.0 → v0.20.0, jeweils signiert, `latest.json`
aktualisiert, letztes Zip per `SendUserFile` verschickt. `npx tsc --noEmit`,
`npm test` (415 Tests am Ende, +100 gegenüber Sitzungsbeginn), `npm run
build`, `cargo check` liefen vor jedem Release fehlerfrei.

### Word/PowerPoint/Excel/Markdown-Import (v0.21.0)

Direkt aus der Nachtsitzungs-Ideenliste (Punkt 1) aufgegriffen, auf
Rückfrage zur Themenerkennungs-Tiefe: **deterministisch aus der
Dokumentstruktur, keine KI** (ADR-018 für die vollständige Begründung je
Format). Branch `feat/multi-format-import`.

- **Vier neue Extraktionspipelines**, alle liefern dieselbe
  `ExtractedDocument`-Form wie PDF, `data/importTopics.ts`
  `persistExtractedDocument` bleibt dadurch unverändert:
  - `ingest/docx.ts` — `mammoth` wandelt Word-Formatvorlagen
    („Überschrift 1/2/…") in HTML-`<h#>`-Tags um, eigener
    Regex-HTML→Text-Parser (kein `DOMParser`, siehe Kommentar dort).
  - `ingest/pptx.ts` — echte Titel-Platzhalter (`<p:ph type="title"/>`)
    statt Schriftgrößen-Heuristik; Trennfolien-Erkennung
    wiederverwendet `ingest/chapters.ts`s bereits validierte Logik
    (neu exportiert: `detectChaptersFromSlides`).
  - `ingest/xlsx.ts` — ein Tabellenblatt = ein Kapitel.
  - `ingest/markdown.ts` — `#`/`##`/… als Kapitelsignal.
  - `ingest/headingStructure.ts` (neu, geteilt zwischen docx/markdown):
    flachste Überschriftsebene = Kapitelgrenze, tiefere Ebenen = Folien
    im Kapitel.
  - `ingest/documentImport.ts` (neu): `extractAnyDocument` wählt anhand
    der Dateiendung die passende Pipeline — einziger Ort, der
    Dateiendungen kennt.
- **Neue Abhängigkeiten** `mammoth`, `jszip`, `fast-xml-parser` (nach der
  am 23.07.2026 pauschal erweiterten Freigabe) — bewusst **nicht** das
  npm-Paket `xlsx` (zwei unbehobene hoch eingestufte CVEs) oder
  `exceljs` (69 transitive Pakete, eigene CVE), siehe ADR-018 für den
  vollständigen Abwägungsweg. `npm audit`: keine neue Schwachstelle.
- **Bugfix während der Entwicklung:** `mammoth`s Node-Paket akzeptiert
  nur `{path}`/`{buffer}`, nicht `{arrayBuffer}` (wirft „Could not find
  file in options") — `{arrayBuffer}` ist der Browser-Eingang, auf den
  Vite automatisch umschaltet. `ingest/docx.ts` verzweigt über denselben
  `typeof window`-Guard wie der pdf.js-Worker (`ingest/pdf.ts`), nur mit
  vertauschten Zweigen.
- **`ui/SourceViewer.tsx` angepasst:** `documentBytes` ist jetzt nicht
  mehr automatisch ein PDF — neue `documents`-Prop, `PdfViewer` wird nur
  noch für tatsächliche `.pdf`-Dateien gerendert, sonst ein Hinweis
  („Vorschau nur für PDF verfügbar"). **Bekannte, bewusst nicht
  geschlossene Lücke:** „Markieren im Dokument → Karteikarte"
  (ROADMAP.md Phase 4) bleibt für die vier neuen Formate vorerst nicht
  verfügbar — kein PDF-Viewer-Äquivalent gebaut, siehe ADR-018.
- **`platform/folderImport.ts`**: `readPdfFilesRecursively`/
  `PickedPdfFile` zu `readDocumentFilesRecursively`/`PickedDocumentFile`
  umbenannt, Dateifilter nutzt jetzt `isSupportedDocument` statt fest
  `.pdf`. Bewusst **nicht** dabei: CSV/HTML (reine Datendateien im
  gesichteten Material, kein Lernmaterial, siehe „Nachtsitzung" oben).
- **`App.tsx`**: `importPdfs`/`importRegularPdf` zu `importDocuments`/
  `importRegularDocument` umbenannt. Datei-Input zeigt jetzt „Dokumente
  … (PDF, Word, PowerPoint, Excel, Markdown)", `accept` deckt alle
  unterstützten Endungen ab, vom Browser durchgelassene, nicht
  unterstützte Dateien (z. B. bei „Alle Dateien" im Systemdialog) werden
  sichtbar gemeldet statt still ignoriert. Der KI-gestützte
  „Zusammenfassung"-Weg (ADR-015) bleibt PDF-exklusiv — bei anderen
  Formaten mit diesem Dokumenttyp greift stattdessen deren eigene
  deterministische Erkennung (Word-Überschriften, Markdown-Überschriften).
- **36 neue Tests** (`headingStructure` 7, `markdown` 6, `docx` 4, `pptx`
  5, `xlsx` 5, `documentImport` 5, plus 3 in `chapters.test.ts` und 1 in
  `SourceViewer.test.tsx`) — Zahl gegen den tatsächlichen Testlauf
  geprüft (415 vorher + 36 neu = 451, `npm test` bestätigt „451 passed"),
  nicht nur geschätzt (CONTRIBUTING.md „Tests" nennt einen früheren Fall,
  in dem genau das versäumt wurde, siehe PR-#5-Korrektur in Abschnitt 8
  weiter oben). `npx tsc --noEmit`, `npm run build` liefen ebenfalls
  fehlerfrei. Bundle-Größe geprüft: keine
  `fs`/`Buffer`-Referenzen aus `mammoth` im Browser-Bundle (bestätigt
  `grep` über `dist/assets/index-*.js`) — die Node/Browser-Weiche
  funktioniert wie vorgesehen.
- **Grenze der Plausibilitätsprüfung, ehrlich festgehalten:** kein
  Testmaterial in Word/PowerPoint/Excel verfügbar (anders als bei PDF,
  `Beispiel pdfs/`) — die drei OOXML-Formate sind stattdessen gegen
  selbst gebaute, minimale, aber gültige Testdateien geprüft (`jszip`
  direkt im Test, siehe `tests/ingest/docx.test.ts`/`pptx.test.ts`/
  `xlsx.test.ts`). Im Dev-Server bestätigt: App lädt fehlerfrei, keine
  neuen Konsolenfehler durch die drei neuen Abhängigkeiten — die
  eigentliche Import-UI war nicht erreichbar (kein Fach ohne echtes
  Tauri-Fenster anlegbar, dieselbe bereits mehrfach dokumentierte
  Einschränkung). **Nächste Sitzung: fragen, ob der Nutzer echtes Word-/
  PowerPoint-/Excel-Material importiert hat und wie die
  Themenerkennung dabei aussah** — das ist der erste echte Test dieser
  vier Pipelines.

### Wiederkehrende Tages-Blocker (ADR-019, Release-Version siehe unten)

Nutzerwunsch vom 22.07.2026 (damals zugunsten des Import-Bugs
zurückgestellt), jetzt nachgeholt. Branch `feat/recurring-blockers`.

- **Migration 0006** (`recurring_blockers`): Wochentag + „HH:MM"-Uhrzeiten
  + Bezeichnung. `data/recurringBlockers.ts`/`-Repo.ts` nach dem
  `paperSteps.ts`-Muster (einfache Entität, `AUTOINCREMENT`-`id`, kein
  Update — falsch angelegt wird gelöscht und neu erstellt).
- **`domain/capacity.ts` überarbeitet:** Blocker (absolut datiert) und
  wiederkehrende Blocker werden jetzt als **eine gemeinsame
  Vereinigungsmenge** verrechnet (`mergedOverlapMinutes`), nicht mehr als
  zwei/mehrere separate Summen — deckt dabei einen latenten Fehler in der
  bereits bestehenden `blockers`-Logik mit auf (zwei sich überschneidende
  Blocker hätten ihre gemeinsame Zeit vorher doppelt abgezogen). Neuer
  Test dafür, unabhängig von `recurring_blockers`.
- **Durchgereicht bis in die eigentliche Planung:** `scheduleStudyBlocks`/
  `replan`/`buildSchedule` berücksichtigen wiederkehrende Blocker jetzt
  ebenfalls, nicht nur die Kapazitätsanzeige — neue Parameter bewusst ans
  **Ende** der Funktionssignaturen gestellt (nicht an ihre naheliegende
  Position), weil mehrere bestehende Aufrufer `options` bereits
  positional als letztes Argument übergeben; ein dazwischengeschobener
  Parameter hätte diese still falsch verdrahtet.
- **UI in `ui/AvailabilitySetup.tsx` integriert** (neuer Abschnitt
  „Wiederkehrende Blocker" unter Wochenmuster/Ausnahme-Tage) — Wochentag,
  Von/Bis (`<input type="time">`), Bezeichnung, mit Validierung „Bis"
  muss nach „Von" liegen.
- **20 neue Tests** (`recurringBlockers`/`-Repo` 8, `capacity.ts`-
  Erweiterungen 6, `scheduling`/`replanning`-Integration 2,
  `AvailabilitySetup.tsx` 5) — `npx tsc --noEmit`, `npm test` (471
  Tests), `npm run build`, `cargo check` liefen fehlerfrei.
- **Im Dev-Server vollständig durchgeklickt** (anders als bei
  Fach-abhängigen Funktionen: „Verfügbarkeit" braucht kein ausgewähltes
  Fach) — Blocker anlegen, Validierungsmeldung bei ungültiger Zeitspanne,
  Screenshot bestätigt. DB-Schreibfehler ohne echtes Tauri-Fenster
  korrekt abgefangen (dieselbe, bereits x-fach dokumentierte
  IPC-Einschränkung), kein Absturz, kein optimistisches Update.
- **Keine weitere offene Aufgabe aus diesem Wunsch** — vollständig
  umgesetzt.

### Redesign „Fächer & Themen": fokussierte Fach-Reiter statt Ein-Seiten-Liste

Mit dem `impeccable`-Skill umgesetzt (kompakter Shape-Brief-Ablauf,
PRODUCT.md/DESIGN.md beantworteten Umfang/Richtung bereits eindeutig,
gleiches Vorgehen wie beim Sidebar-Redesign v0.17.0). Löst den in der
Nachtsitzung zurückgestellten Punkt „fokussierte Detailansicht pro Fach
statt einer langen Ein-Seiten-Liste".

- **Neue Komponente `ui/CourseWorkspace.tsx`:** sobald ein Fach gewählt
  ist, erscheinen Prüfungen/Paper, Material (Import + Dokumentenliste +
  Altklausur-Analyse) und Themen & Quellen (Themenbaum + Quellen-
  Betrachter) in drei Reitern statt untereinander. Reine Präsentation
  (ARCHITECTURE.md „ui/") — `App.tsx` reicht jeden Reiterinhalt fertig
  zusammengesetzt als `ReactNode` herein, `CourseWorkspace` kennt selbst
  weder Themen noch Dokumente. Alle drei Panels bleiben über `hidden` im
  DOM (kein bedingtes Unmounten), ein Reiterwechsel verwirft daher keinen
  offenen Formularzustand in einem anderen Reiter. Siehe DESIGN.md „Fach-
  Reiter" für die vollständige Optik-Begründung.
- **Echter Korrektheits-Nebenfund beim Umbau:** `TopicTree`/`SourceViewer`
  bekamen bisher die **komplette, ungefilterte** `topics`/`topicSections`-
  Liste über alle Fächer hinweg — der Themenbaum eines gewählten Fachs
  zeigte technisch auch die Themen aller anderen Fächer mit an. Beide
  Komponenten filtern jetzt in `App.tsx` auf `course_id === selectedCourse.id`,
  bevor sie hereingereicht werden; `TopicTree`s `onChange` führt die
  geänderte Teilmenge anschließend wieder mit den unveränderten Themen der
  übrigen Fächer zusammen, bevor `handleChangeTopics` (Diff-Persistenz)
  aufgerufen wird. War vorher nicht sichtbar aufgefallen, weil beide
  Sitzungs-Nutzer bisher nie mehrere Fächer gleichzeitig mit Themen
  angelegt hatten, um es zu bemerken.
- **`<details>` für Fach-/Ordner-Verwaltung:** `CourseSetup`/`CourseGroups`
  bleiben unverändert als eigene Komponenten, stecken jetzt aber in einem
  nativen `<details>` (kein selbstgebautes Akkordeon, PRODUCT.md „Native
  vor custom") — eingeklappt, sobald ein Fach gewählt ist, aufgeklappt,
  solange keins gewählt ist. `key={selectedCourseId}` sorgt dafür, dass
  nur ein tatsächlicher Fachwechsel den Standardzustand neu setzt, ein
  manuelles Auf-/Zuklappen durch den Nutzer bleibt zwischen anderen
  Re-Renders erhalten (`<details open>` als React-Prop ist sonst
  unkontrollierbar, sobald es an denselben State-Wert gebunden bleibt, der
  sich durch andere Re-Renders nicht ändert — hier kein Problem, weil
  React eine unveränderte Prop nicht erneut ins DOM schreibt, aber beim
  Fachwechsel selbst soll jedes Fach unabhängig mit seinem eigenen
  Standardzustand starten).
- **9 neue Tests** (`CourseWorkspace.test.tsx`) — `npx tsc --noEmit`,
  `npm test` (475 Tests), `npm run build` liefen fehlerfrei. Alle
  bestehenden Komponententests (`CourseSetup`/`AssessmentSetup`/
  `PaperSteps`/`TopicTree`/`SourceViewer` usw.) liefen unverändert durch —
  sie testen die Komponenten isoliert, nicht über `App.tsx`s
  Zusammensetzung, daher unberührt vom Umbau.
- **Im Dev-Server geprüft, mit einer ehrlichen Lücke:** der
  „kein Fach gewählt"-Zustand (Fach-/Ordner-Verwaltung aufgeklappt, Hinweis
  „Fach auswählen …") ist per Playwright-Screenshot bestätigt, keine neuen
  Konsolenfehler. **Der „Fach gewählt"-Zustand mit den drei Reitern selbst
  ist NICHT visuell im Browser bestätigt** — dieselbe, bereits x-fach
  dokumentierte Einschränkung (kein Fach ohne echtes Tauri-Fenster
  anlegbar). Die Reiter-Logik selbst (Umschalten, ARIA, DOM-Erhalt) ist
  über die neuen Komponententests abgedeckt, die Optik stützt sich auf
  bereits an anderer Stelle visuell bestätigte, hier nur wiederverwendete
  Muster (aktiver Sidebar-Eintrag, Standard-Button). **Nächste Sitzung:
  sobald ein Fach existiert, einmal auf die drei Reiter schauen und
  melden, ob es wie gewünscht wirkt.**
- **Keine weitere offene Aufgabe aus diesem Wunsch** — vollständig
  umgesetzt.

### Quiz-Konfiguration als Schritt-für-Schritt-Assistent (ADR-020)

Letzter der vier vom Nutzer am 23.07.2026 in einer Nachricht georderten
Punkte (Install.command, wiederkehrende Blocker, Fach-Reiter-Redesign,
dieser). Löst den in der Nachtsitzung genannten Wunsch „tieferer Quiz-
Konfigurationsdialog mit echten Rückfragen, wie bei Claude".

- **`ui/QuizSetup.tsx` komplett zum Fünf-Schritt-Assistenten umgebaut:**
  Material (Fach + Themenabschnitte) → Fragen-Fokus → Umfang → Art &
  Schwierigkeit → Zusammenfassung. „Weiter" bleibt gesperrt, bis ein
  Schritt sinnvoll abgeschlossen ist. Reiner UI-Zustand, keine neue
  Geschäftslogik — `onGenerate` unverändert erst im letzten Schritt
  aufgerufen.
- **Neuer `QuestionFocus`-Parameter** (`gemischt`/`rechnen`/`konzept`,
  `ai/types.ts`) beantwortet direkt die erste im Nachtsitzungs-Wunsch
  genannte Beispiel-Rückfrage („nur Rechenfragen?") — durchgereicht an
  beide `AIProvider`-Implementierungen (Anthropic/OpenAI), verändert dort
  die Prompt-Anweisung.
- **Umfang als Zeit-Voreinstellungen** (Kurz/Mittel/Lang, je mit einer
  Gesamtfragenzahl über alle gewählten Abschnitte, plus „Eigene Anzahl")
  statt einer rohen „Fragen je Abschnitt"-Zahl — beantwortet die zweite
  genannte Beispiel-Rückfrage („ungefähre Zieldauer?").
- **Bewusst keine KI-gestützte Konversation** — die Frage-Antwort-Sammlung
  selbst bleibt eine gewöhnliche React-Zustandsmaschine, kein
  zusätzlicher KI-Aufruf nur für die Konfiguration (Kosten/Latenz ohne
  echten Mehrwert, ADR-007), siehe ADR-020 für die volle Begründung.
- **16 neue/geänderte Tests** (`QuizSetup.test.tsx` 7 neu) — `npx tsc
  --noEmit`, `npm test` (482 Tests), `npm run build` liefen fehlerfrei.
  Im Dev-Server geprüft (kein Fach im laufenden Dev-Server anlegbar,
  bekannte Einschränkung): Assistent rendert fehlerfrei im
  „kein Fach"-Ausgangszustand, „Weiter" korrekt gesperrt, keine
  Konsolenfehler. Die eigentliche Schritt-Navigation/Validierung ist über
  die neuen Komponententests abgedeckt (alle fünf Schritte durchlaufen,
  Zurück ohne Datenverlust, Umfangs-Umrechnung, `onGenerate`-Aufruf mit
  allen gesammelten Angaben).
- **Nicht Teil dieser Änderung:** die Reihenfolge/Anzahl der Schritte ist
  eine erste plausible Aufteilung, nicht an echtem Nutzerverhalten
  validiert — bei Bedarf später nachjustierbar (ADR-020).
- **Damit sind alle vier in dieser Sitzung angeforderten Punkte
  vollständig umgesetzt** (Install.command, wiederkehrende Blocker,
  Fach-Reiter-Redesign, Quiz-Assistent) — siehe jeweils eigene
  Abschnitte oben für Details.

---

## 9. Bekannte Einschränkungen

- **Kein Backup** — Gerätedefekt bedeutet Totalverlust (bewusst)
- **Zeitschätzung braucht ~10 Datenpunkte pro Fach**, bis sie taugt. Die App
  zeigt das offen an, statt falsche Präzision vorzutäuschen
- **Trennfolien-Erkennung zu grob** — `isDividerPage` markiert jede
  fast-textleere Folie als Kapitel-Trennfolie, auch reine Diskussionsfragen
  oder Bildfolien ohne Fließtext. Drückt `slideCount`/`uniqueChars`
  künstlich. Gehört zur Kapitelerkennung (nächste Phase), siehe Abschnitt 8
- **Kein OCR** — gescannte Dokumente werden nicht unterstützt. Am echten
  Material bestätigt (22.07.2026): `Data & Information Management/Mock
  Exam.pdf` liefert 0 Zeichen auf allen Seiten
- **Nur PDF, kein Word/Excel/PowerPoint** — bewusste, bestätigte
  Einschränkung (Abschnitt 3), am echten Material konkret sichtbar
  geworden (`.docx`/`.xlsx`/`.pptx` in `4. Semester Kopie/`, siehe
  „Nachtsitzung"-Abschnitt, Ideen-Liste Punkt 1). Ordner-Import meldet
  seit v0.20.0 wenigstens sichtbar, welche Dateien deswegen übersprungen
  wurden, statt es stillschweigend zu tun

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
