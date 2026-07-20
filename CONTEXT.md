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
`feat/ingest-pipeline` (noch nicht gepusht, noch kein Commit auf diesem Branch).**

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
- Import-Pipeline in TypeScript geschrieben (**noch nicht committet**,
  liegt als unstaged/untracked im Arbeitsverzeichnis):
  - `src/ingest/types.ts` — Typen (`Page`, `Slide`, `Chapter`, `ExtractedDocument` …)
  - `src/ingest/extract.ts` — Zeilenbildung aus pdf.js-Fragmenten,
    Titelerkennung (oberes Drittel, größte Schrift), Normalisierung,
    Erkennung wiederkehrender Kopf-/Fußzeilen, Behebung der
    PowerPoint-Doppelzeichen bei Formeln (`𝑢𝑢` → `𝑢`)
  - `src/ingest/slides.ts` — Zusammenfassen von Animationsschritten zu
    Folien, eindeutiger Zeichenumfang
  - `src/ingest/pdf.ts` — Gesamtpipeline PDF → `ExtractedDocument`
  - `scripts/analyze-material.ts` — Kommandozeilen-Diagnosewerkzeug,
    `npm run analyze -- [--detail] <pfad.pdf>`
- **Titelerkennung bestätigt: 95–98 % über alle sieben getesteten
  Foliensätze** (drei Fächer). Das Verfahren (größte Schrift im oberen
  Seitendrittel) funktioniert robust.

### 🔴 Gerade in Arbeit — ungelöst, hier ansetzen

**Problem:** Die Animationsschritt-Erkennung (`isBuildStep` in
`src/ingest/slides.ts`) liefert falsche Ergebnisse.

**Was implementiert ist:** Zwei Seiten gelten als derselbe Folie, wenn (a)
der Titel übereinstimmt UND (b) der Zeileninhalt der früheren Seite zu
≥ 80 % in der späteren wieder vorkommt (Containment-Test).

**Was der Test an echtem Material zeigt:** Dieses Kriterium ist **zu
streng** und erkennt fast keine Builds mehr (Faktor sank von den vorher
gemessenen 1,10–2,21× auf 1,00–1,23×, siehe Tabelle unten). Grund: Bei
Money & Banking teilen sich mehrere **inhaltlich verschiedene** Folien
denselben Titel — das ist eine wiederkehrende Abschnittsüberschrift, kein
Animationsaufbau. Beispiel „4 Financial Institutions", Seiten 20–22, Titel
jeweils „Types of Financial Intermediaries":

```
S.20 → S.21: 0/10 Zeilen erhalten = 0 %
S.21 → S.22: 3/14 Zeilen erhalten = 21 %
```

Das sind drei separate Folien zu Unterarten von Finanzintermediären
(Depository / Contractual Savings / …), keine Aufbauschritte einer Folie.
Gleiches Muster bestätigt bei S.9→10, S.17→18 (verschiedene Textinhalte
trotz gleichem Titel).

**Konsequenz:** Titel-Gleichheit ist offenbar **kein verlässliches Signal**
für „gleiche Folie" in diesem Fach — anders als ursprünglich angenommen
(vgl. die frühere, zu lockere Heuristik reiner Titelvergleich, die
umgekehrt zu viel zusammenfasste). Der reine Textvergleich ohne Titel
könnte echte Builds finden, aber dann fehlt das Abgrenzungskriterium zu
inhaltlich neuen Folien mit zufällig ähnlichem Text.

**Testergebnisse der aktuellen (zu strengen) Heuristik zum Vergleich:**

| Datei | PDF-Seiten | erkannte Folien | Faktor | (vorher, alte Heuristik) |
|---|---|---|---|---|
| Consumer Theory 01 | 32 | 32 | 1,00 | — |
| Producer Theory 01 | 21 | 21 | 1,00 | — |
| ET Slides Session 1 | 53 | 52 | 1,02 | 1,23 (reiner Titelvergleich, zu locker) |
| ET Slides Session 2 | 51 | 49 | 1,04 | 1,27 |
| MBFM 1 Financial Systems | 40 | 35 | 1,14 | 1,60 |
| MBFM 2 Bonds | 64 | 57 | 1,12 | 2,21 |
| MBFM 4 Financial Institutions | 53 | 43 | 1,23 | 1,56 |

**Nächster Schritt (konkret):** Eine dritte, differenziertere Heuristik
entwerfen. Ideen, die noch nicht ausprobiert wurden:
1. **Layout-/Positionssignal statt nur Text:** pdf.js liefert `x`/`y` pro
   Textfragment. Ein echter Animationsschritt verschiebt bestehenden Text
   selten — neue Boxen kommen hinzu, alte bleiben an ihrer Position stehen.
   Bei inhaltlich neuen Folien mit gleichem Titel ist oft das gesamte
   Layout unterhalb des Titels anders. Positionsstabilität der
   Körper-Textblöcke prüfen, nicht nur Zeicheninhalt.
2. **Strengeres Kriterium für „neue Folie trotz gleichem Titel":** prüfen,
   ob die Seite eigene Aufzählungs-/Struktur-Marker hat (z. B. beginnt mit
   einer neuen Kategorie: „Depository institutions" vs. „Contractual
   savings institutions" — evtl. per Fettdruck/Größe der ersten Zeile
   erkennbar, die pdf.js mitliefert).
3. **Schwellenwert-Kalibrierung:** ggf. reicht ein deutlich niedrigerer
   Containment-Schwellenwert (z. B. 40–50 % statt 80 %) plus eine
   Zusatzbedingung (Seite hat keinen komplett neuen ersten Absatz).
4. **Pragmatischer Rückfall:** Falls sich Builds nicht zuverlässig von
   titelgleichen Neu-Folien unterscheiden lassen, könnte es besser sein,
   **auf Animationserkennung ganz zu verzichten** und stattdessen mit der
   rohen Seitenzahl zu leben, aber pro Fach kalibriert (siehe
   `calibration`-Tabelle in DATA_MODEL.md) — die Kalibrierung lernt dann
   implizit den fachspezifischen Aufblähfaktor mit. Das würde ADR-004
   nicht widerlegen (eindeutige Zeichen bleiben das bessere Rohsignal),
   aber die Notwendigkeit einer separaten Build-Erkennung in Frage stellen.

**Offene Debug-Hilfsmittel:** Ein Wegwerf-Skript `dbg.mts` wurde während der
Untersuchung im Repo-Root angelegt und wieder gelöscht (gehörte nicht dorthin
— Debug-Skripte gehören ins Scratchpad, nicht ins Repository). Bei Bedarf neu
schreiben; Vorlage lässt sich aus dem Muster oben ableiten (Seiten laden,
`bodyLinesOf` pro Seite aufrufen, Zeilenmengen vergleichen).

### Sonstiges für den Wiedereinstieg

- **Rust ist auf diesem Mac nicht installiert.** Für den eigentlichen
  Tauri-Rahmen (Fenster, Notifications, SQLite-Plugin) wird es gebraucht,
  aber noch nicht für die aktuelle Arbeit (`src/ingest/` ist reines
  TypeScript, läuft mit `tsx`/`vitest` ohne Tauri). Vor Beginn des
  Tauri-Rahmens: `xcode-select -p` ist vorhanden, `rustc`/`cargo` fehlen —
  Installation via `rustup` beim Nutzer erfragen (keine globalen
  Abhängigkeiten ohne Rückfrage).
- **Noch keine Tests geschrieben** für `src/ingest/`. Sollte parallel zur
  Weiterentwicklung der Heuristik entstehen (Vitest ist eingerichtet,
  `npm test` lauffähig, aber `tests/` existiert noch nicht).
- **Commit-Politik geändert:** Es wird ab jetzt laufend committet, auch
  WIP-Stände auf dem Feature-Branch (siehe Regel oben und
  [CONTRIBUTING.md](CONTRIBUTING.md)). PR erst öffnen, wenn die
  Animationsschritt-Erkennung ein belastbares Ergebnis liefert — dann per
  Squash-Merge nach `main`.

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
- **Animationsschritt-Erkennung noch ungelöst** — aktueller Ansatz
  (Titel + Textcontainment) erwiesenermaßen zu streng, siehe Abschnitt 8
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
