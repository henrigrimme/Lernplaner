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
  `tests/ingest/extract.test.ts` (9 Tests, `npm test`).

### ✅ Animationsschritt-Erkennung — dritter Ansatz, deutlich verbessert

**Neuer Ansatz (Idee 1 aus der vorherigen Session, Positionssignal):** Eine
Zeile der früheren Seite gilt zusätzlich dann als erhalten, wenn sie auf der
späteren Seite an (fast) derselben Position wiederkehrt (±3pt y, ±5pt x) —
auch wenn sich ihr exakter Zeilenumbruch geändert hat. Das ist eine
**Ergänzung**, kein Ersatz für den Textvergleich: Positionsübereinstimmung
zählt nur zusammen mit Textähnlichkeit (≥ 50 % gemeinsamer Zeichenanteil,
`textsOverlap`) — sonst wären titelgleiche Folien mit demselben
Layout-Template (der Money-&-Banking-Fall) wieder fälschlich zusammengefasst
worden, weil ihre erste Zeile zufällig an derselben Stelle beginnt.
Containment-Schwelle von 80 % auf 70 % gesenkt. Implementiert in
`isBuildStep` / `linePersists` / `textsOverlap`, `src/ingest/slides.ts`.

**Nebenbefund, der die Diagnose stärker verbessert hat als die
Positionsänderung selbst:** `findRepeatingLines` hatte einen Bug. Fußzeilen
mit eingebetteter Foliennummer (z. B. `"19March 16, 2026Prof. Dr. Priscilla
Kraft"` — Nummer ohne Leerzeichen ans nächste Wort angehängt) tauchen nie
zweimal wortgleich auf, weil jede Seite eine andere Nummer hat. Die
Sonderbehandlung dafür in `bodyLinesOf` (Abgleich der um die Nummer
bereinigten Zeile gegen `repeating`) konnte deshalb **nie greifen** —
`repeating` wurde nur mit Rohzeilen befüllt, nie mit bereinigten. Der Zweig
war faktisch totes Coding. Effekt: Auf praktisch jeder Seite blieb eine
nie-wieder-passende Fußzeilen-Restzeile im Inhalt zurück und senkte den
Containment-Wert jedes Seitenpaars künstlich. Fix: `findRepeatingLines`
zählt jetzt zusätzlich die um die **eigene** Seitenzahl bereinigte Fassung
jeder Zeile (`stripOwnPageNumber` — exakter Abgleich mit `page.number`,
nicht irgendeine Ziffernfolge, sonst wären nummerierte Aufzählungspunkte wie
„1 Introduction …" fälschlich als Fußzeile behandelt worden; dafür gibt es
einen eigenen Test).

**Validiert an echtem Material** (die ursprünglichen Testdateien lagen
inzwischen an anderem Ort, siehe „Fundstellen" unten):

| Datei | PDF-Seiten | Folien | Trenn | Builds |
|---|---|---|---|---|
| Consumer Theory 01 | 32 | 32 | 0 | 0 |
| Producer Theory 01 | 21 | 21 | 0 | 0 |
| ET Slides Session 1 | 53 | 40 | 12 | 1 |
| ET Slides Session 2 | 51 | 38 | 7 | 6 |
| ET Slides Session 3 | 34 | 26 | 7 | 1 |
| ET Slides Session 4 | 41 | 33 | 5 | 3 |
| ET Slides Session 5 | 45 | 35 | 5 | 2 |

Stichprobenartig von Hand nachvollzogen (Positions-/Textdaten der
betroffenen Seiten ausgegeben, nicht nur die Zahlen geglaubt):
- **S.6–8, Session 2** (dreimal derselbe Titel „Why do established companies
  often fail…", je andere Zitate/Bullet-Points): korrekt **nicht**
  zusammengefasst — genau das Money-&-Banking-Muster, jetzt auch hier
  bestätigt und richtig behandelt.
- **S.19–20, Session 2**: identische Zeile „New-to-World innovation /
  New-to-Firm innovation" an exakt derselben Position, S.20 ergänzt nur ein
  Bild darunter → korrekt als Build erkannt (vorher durch den
  Fußzeilen-Bug verpasst).
- **S.39–43, Session 2** (mehrere fast-leere „Examples"-Folien mit
  wechselndem Titel): bleiben getrennt, weil sie als Trennfolien erkannt
  werden (0 Zeilen Inhalt) und `groupIntoSlides` nie über eine Trennfolie
  hinweg zusammenfasst.

**Der gestiegene Trenn-Anteil ist eine Korrektur, kein neues Problem:** Die
vorher als „Inhalt" gezählten 0-Zeilen-Folien enthielten ausschließlich
Fußzeilen-Reste (Bug oben) — mit dem Fix zeigen sie korrekt 0 echte
Textzeilen. Stichprobe von Hand geprüft (Session 1, S.10/S.11, S.15/S.16):
tatsächlich reine Bild-/Titelfolien ohne Fließtext.

**Nebenbeobachtung, NICHT behoben (außerhalb des Umfangs dieser Session):**
`isDividerPage` markiert jede fast-textleere Folie als „Trennfolie", auch
wenn sie inhaltlich kein Kapitelwechsel ist, sondern z. B. eine
Diskussionsfrage („What do these companies have in common?") oder eine reine
Bildfolie. Das drückt `slideCount`/`uniqueChars` künstlich, weil solche
Folien aus `contentSlides` herausfallen. Gehört sachlich zur
Kapitelerkennung (nächste Phase), nicht zur Animationserkennung — hier nur
vermerkt, damit es nicht verloren geht.

**Jetzt am Original validiert:** Die ursprünglichen Testdateien „1 Financial
Systems" (40 S.), „2 Bonds" (64 S.), „4 Financial Institutions" (53 S.) —
Seitenzahlen exakt identisch mit den in dieser Sektion früher notierten
Werten, also zweifelsfrei dieselben Dateien — sind wieder aufgetaucht (vom
Nutzer manuell in `Beispiel pdfs/` gelegt). Der dokumentierte Fehlerfall
„Types of Financial Intermediaries" (S.20–23 in „4 Financial Institutions")
wurde am Original nachgeprüft: **korrekt nicht zusammengefasst.**
Stichprobenartig wurden weitere ~15 Folgen mit wiederkehrendem Titel in
allen drei Dateien von Hand durchgesehen (z. B. „Measurement of Risk"
S.28–36 in Financial Systems, „The Term Structure of Interest Rates"
S.50–61 in Bonds, „Bank Capital and Profitability" S.33–35 in Financial
Institutions) — durchweg echte Folgen unterschiedlicher Unterpunkte unter
einer wiederkehrenden Abschnittsüberschrift, korrekt nicht zusammengefasst.

**Überraschender, aber plausibler Befund:** In allen drei Dateien wurden
**0 echte Animationsschritte** erkannt (`buildGroups: 0`). Die gesamte
Aufblähung (Faktor 1,12–1,23) kommt ausschließlich aus Trennfolien und
Unterpunkt-Folgen mit gleichem Titel. Das ist wahrscheinlich korrekt, kein
Erkennungsfehler — diese drei Foliensätze scheinen schlicht ohne
PowerPoint-Animationen exportiert zu sein, anders als Entrepreneurial
Transformation. Ein echter Aufbauschritt (Positionstest greift) wurde in
„3 Exchange Rates & Financial Instruments" bestätigt (S.4–5, identische
Bildquellenangabe an exakt gleicher Position, Chart-Bild kommt dazu).

**Fundstellen des Testmaterials:** Der Nutzer hat das komplette Set jetzt
lokal unter `Beispiel pdfs/` abgelegt (gitignored, siehe SECURITY.md) und
nach Fach sortiert:
- `Beispiel pdfs/Microeconomics/` — 01 Introduction, 02 Consumer Theory
  01+02, 03 Producer Theory 01+02, 04 Market Structures 01, 05 Game
  Theory 01
- `Beispiel pdfs/Money Banking and Financial Markets/` — 0 Introduction,
  1 Financial Systems, 2 Bonds, 3 Exchange Rates & Financial Instruments,
  4 Financial Institutions, 5 Central Bank, Online Questions 1+2 (je mit
  `_Solutions`), Problem Set 1+2 (je mit `_Solutions`)

Damit ist die Suche nach Testmaterial für künftige Sessions erledigt, ohne
erst wieder iCloud/OneDrive durchsuchen zu müssen. Nebenbefund beim Sortieren:
`Online Questions 2.pdf` enthält inhaltlich bereits die Lösungen (identisch
mit `Online Questions 2_Solutions.pdf`) — vermutlich ein Bezeichnungsfehler
beim Bereitstellen der Dateien, nicht durch die Pipeline verursacht; hier nur
vermerkt, nicht korrigiert.

Debug-Skript für Positions-/Textdaten pro Seite lag während der Untersuchung
im Scratchpad (nicht im Repo, siehe Konvention unten) und wurde nicht
übernommen — bei Bedarf neu schreiben: `readPages` laden, `findRepeatingLines`
+ `bodyLinesOf` pro Seite aufrufen, `x`/`y`/Text ausgeben.

### Nächster Schritt

Kein offener Blocker mehr für die Animationserkennung — am Original von
allen vier Fächern (Microeconomics, Entrepreneurial Transformation, Money &
Banking, plus die MBFM-Zusatzmaterialien Online Questions/Problem Sets)
bestätigt. PR öffnen (siehe Commit-Politik unten), dann weiter mit der
Roadmap.

### Sonstiges für den Wiedereinstieg

- **Rust ist auf diesem Mac nicht installiert.** Für den eigentlichen
  Tauri-Rahmen (Fenster, Notifications, SQLite-Plugin) wird es gebraucht,
  aber noch nicht für die aktuelle Arbeit (`src/ingest/` ist reines
  TypeScript, läuft mit `tsx`/`vitest` ohne Tauri). Vor Beginn des
  Tauri-Rahmens: `xcode-select -p` ist vorhanden, `rustc`/`cargo` fehlen —
  Installation via `rustup` beim Nutzer erfragen (keine globalen
  Abhängigkeiten ohne Rückfrage).
- **Commit-Politik:** Es wird laufend committet, auch WIP-Stände auf dem
  Feature-Branch (siehe Regel oben und [CONTRIBUTING.md](CONTRIBUTING.md)).
  PR erst öffnen, wenn die Animationsschritt-Erkennung ein belastbares
  Ergebnis liefert — dann per Squash-Merge nach `main`.

### Danach (unverändert aus der Roadmap)

- SQLite-Schema anlegen (vollständig, inkl. später genutzter Tabellen)
- Kapitelerkennung mit Fuzzy-Normalisierung
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
