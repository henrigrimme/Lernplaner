---
target: Lernplaner Kernansichten (Fächer, Heute, Wiederholen, Quiz, Verfügbarkeit, Einstellungen)
total_score: 27
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
timestamp: 2026-07-24T15-53-52Z
slug: heute-wiederholen-quiz-verf-gbarkeit-einstellungen
---
Method: dual-agent (A: a31350ce138410a00 · B: ac9b11738c44daf2f)

## Design Health Score

| # | Heuristik | Score | Kernbefund |
|---|-----------|-------|------------|
| 1 | Sichtbarkeit des Systemstatus | 2 | Kein globales Fehler-Feedback bei DB-Fehlern (~25 `handle*`-Funktionen in App.tsx loggen nur `console.error`) |
| 2 | Übereinstimmung mit realer Welt | 3 | Deutsche Fachbegriffe, macOS-Metaphern passen zur Zielgruppe |
| 3 | Nutzerkontrolle & Freiheit | 3 | "Plan übernehmen" als expliziter Schritt vorbildlich; Undo nach Löschen nicht verifizierbar |
| 4 | Konsistenz & Standards | 3 | Ein-Akzent-Regel konsequent; zwei Muster für "eine Option wählen" (Segmented-Pillen vs. Dropdown) |
| 5 | Fehlervermeidung | 3 | Inline-Validierung vorhanden; 0-Minuten-Verfügbarkeit ohne Warnung möglich |
| 6 | Wiedererkennen statt Erinnern | 3 | Leerzustände erklären nächsten Schritt nur als Text, nicht als Link |
| 7 | Flexibilität & Effizienz | 3 | ⌘K-Suche + Anki-Kürzel sind echte Effizienz-Features; kein Bulk-Editing |
| 8 | Ästhetik/Minimalismus | 3 | Ruhig, wenig Rauschen; einige Leerzustände wirken zu karg |
| 9 | Fehler erkennen/beheben | 2 | Async-DB-Fehler enden nie sichtbar in der UI (deckt sich mit Heuristik 1) |
| 10 | Hilfe & Dokumentation | n/a | Zwei technisch versierte Einzelnutzer — keine Verletzung |

**Total: 27/36 (9 bewertbare Heuristiken)** → 75 % → **Good**, kein poliertes Produkt-Niveau.

## Design-Spezifitäts-Verdikt

**LLM-Einschätzung:** Das visuelle System (Palette, Grouped Lists, Glas nur auf Sidebar/Toolbar/Overlay, kuratierter Fach-Farb-Picker) ist klar für dieses Produkt gebaut, nicht generisch. Bruch: die Kern-Inhaltsansichten (Heute, Wiederholen, Fortschritt, Quiz-Abschluss) nutzen fast nackte `<h2>/<p>/<ul>`-Strukturen ohne dieselbe Sorgfalt wie die Formulare — die Design-Persönlichkeit sitzt im Rahmen, hat die stressigsten Bildschirme selbst aber noch nicht durchdrungen.

**Deterministischer Scan:** 29 Findings (28 advisory, 1 warning) über `src/ui/`, `App.tsx`, `src/styles/`. 21× Font-Size-Abweichungen vom dokumentierten 4-Stufen-Ramp (11px/13px/15px statt nur 22/16/14/12px) — echte, systematische Drift zwischen DESIGN.md und Implementierung. 2× Radius-Abweichungen (3px/2px, nur auf kleinen Deko-Icons). 5× Farbwerte außerhalb der Token-Palette (größtenteils vertretbare Ausnahmen: Kurs-Swatches, PDF-Textauswahl, Schatten-Alpha-Werte). 1× Falsch-Positiv (Kommentartext, keine echte CSS-Regel).

**Browser-Belege:** Fokusring vorhanden und sichtbar (2px Accent-Outline, per Tab-Taste verifiziert). Kontrast überwiegend stark (bis 14.35:1 für Fließtext), ein AA-Fail: Platzhaltertext in Eingabefeldern 4.22:1 statt 4.5:1 (knapp). Responsive bei 900px/1600px ohne Layout-Bruch, außer: der "KI-Anbindung"-Tab in Einstellungen bricht bei 900px in zwei Zeilen um, während die übrigen vier Tabs einzeilig bleiben.

## Overall Impression

Solides, bewusst gestaltetes System mit einer echten, dokumentierten Design-Sprache — deutlich über generischem AI-Slop-Niveau. Die größte Lücke ist nicht visuell, sondern strukturell: async Fehler aus der Datenbank-Schicht verschwinden komplett in der Konsole, ohne dass der Nutzer je erfährt, ob eine Änderung wirklich gespeichert wurde. Für eine App, die über Wochen Prüfungsvorbereitung begleiten soll, ist das das größte Einzelrisiko.

## Was funktioniert

1. `styles/tokens.css`/`global.css`: konsequente OKLCH-Strategie, sauberer `prefers-reduced-transparency`/`prefers-color-scheme`/`data-theme`-Fallback-Stack.
2. `CourseWorkspace.tsx` + `QuizSetup.tsx`: Reiter bleiben dauerhaft im DOM (kein Zustandsverlust), Schritt-Punkte im Assistenten.
3. Fokusring, Kontrast und Responsive-Verhalten sind technisch solide (siehe Browser-Belege oben) — keine harten Barrierefreiheits- oder Layout-Brüche gefunden.

## Priorisierte Probleme

**[P0] Async-DB-Fehler bleiben für den Nutzer unsichtbar**
Warum wichtig: Unbemerkter Datenverlust (Fach/Review/Prüfung nicht gespeichert) kurz vor der Prüfungsphase Oktober 2026 wäre das schlimmstmögliche Vertrauens-Ereignis für diese App.
Fix: Zentrales Fehler-Banner (analog `NotificationBanner.tsx`), das bei jedem Repo-Fehler erscheint, statt nur `console.error`.
Empfohlener Befehl: `/impeccable harden`

**[P1] Leerzustand "Heute" ohne emotionale Abfederung und ohne klickbaren Verweis**
Warum wichtig: Genau die Ansicht, die laut PRODUCT.md täglich in kurzen, oft gestressten Sessions geöffnet wird.
Fix: Klickbarer Verweis zur Planung statt reinem Fließtext; wärmerer Ton.
Empfohlener Befehl: `/impeccable delight` bzw. `/impeccable clarify`

**[P1] `AvailabilitySetup.tsx` überlastet das Arbeitsgedächtnis**
Warum wichtig: Drei konzeptionell verschiedene Aufgaben (Wochenmuster/Ausnahmen/Blocker) ohne Gliederung auf einer sehr langen Seite, ausgerechnet in der für den App-Erfolg entscheidenden Setup-Phase.
Fix: Gleiche Reiter-Lösung wie `CourseWorkspace`/`SettingsView` anwenden.
Empfohlener Befehl: `/impeccable layout`

**[P2] Zwei Muster für dieselbe Interaktionsklasse (Segmented-Pillen vs. Dropdown)**
Fix: Fach-Farbwahl auf dieselbe Pillen-/Swatch-Optik wie die Paletten-Auswahl umstellen — Muster existiert bereits im Code.
Empfohlener Befehl: `/impeccable layout`

**[P2] Quiz-Abschluss ohne sofortiges Ergebnis**
Fix: Score direkt im Abschluss-Screen zeigen, vor "Auswerten und speichern".
Empfohlener Befehl: `/impeccable delight`

## Persona Red Flags

**Jordan (Erstnutzer):** Kein Onboarding-Hinweis auf "Fächer & Themen"; nach Fach-Anlage keine Handlungsaufforderung Richtung Material-Import; Leerzustände ohne klickbare Verknüpfung.

**Riley (Stresstester, Prüfungsphase):** Kein globaler Speicher-Indikator (deckt sich mit P0); `AvailabilitySetup`-Überlänge widerspricht "kurze, häufige Sessions" unter Zeitdruck. Positiv: Quiz-Countdown zeigt bei Zeitüberschreitung bewusst beruhigenden Text statt Zwang.

**Sam (Barrierefreiheit):** Tastaturkürzel nur als `title`-Tooltip dokumentiert, nicht sichtbar für Screenreader ohne Maus-Hover; Fokusring technisch vorhanden und gut (Browser-verifiziert); kein Skip-to-Content bei vielen Sidebar-Einträgen.

## Minor Observations

- Font-Size-Ramp real driftend vom dokumentierten 4-Stufen-System (21 Fundstellen) — DESIGN.md oder Code sollte angeglichen werden.
- "KI-Anbindung"-Tab bricht bei 900px Breite als einziger Tab zweizeilig um.
- Platzhaltertext in Eingabefeldern knapp unter AA-Kontrast (4.22:1 statt 4.5:1).
- `.app-brand-mark` nutzt einen Gradient — technisch ein Mini-Verstoß gegen die eigene "keine Gradient-Buttons"-Regel, nur auf einem 20px-Icon, keine praktische Relevanz.
- Fehlerhinweis bei "Bis muss nach Von liegen" steht unterhalb des Submit-Buttons, nicht direkt am betroffenen Feld.
