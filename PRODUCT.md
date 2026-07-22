# Product

## Register

product

## Users

Zwei WHU-Studenten, private Nutzung auf eigenen MacBooks (Apple Silicon).
Kontext: Prüfungsvorbereitung im Alltag neben Vorlesungen — die App wird täglich
geöffnet, oft in kurzen Sessions zwischen anderen Aufgaben (Heute-Ansicht,
Timer, schnelles Nachschlagen im Themenbaum). Ab 1. September 2026 Echtbetrieb,
Prüfungsphase Oktober 2026. Beide Nutzer kennen macOS-native Apps gut (Notizen,
Kalender, Erinnerungen) und erwarten dieselbe Vertrautheit hier.

## Product Purpose

Importiert Vorlesungsfolien (PDF), leitet Themen und Lernaufwand daraus ab und
baut einen Lernplan, der sich an Prüfungstermine, verfügbare Zeit und
tatsächlichen Fortschritt anpasst. Begleitet den täglichen Lernalltag (Heute-
Ansicht, Zeiterfassung, Karteikarten, Spaced Repetition) statt nur einmalig zu
planen. Erfolg heißt: die App wird ab September täglich freiwillig geöffnet,
nicht nach einer Woche liegen gelassen (siehe DECISIONS.md ADR-005 — genau das
Scheitern, das vermieden werden soll).

## Brand Personality

**Vertraut, ruhig, sorgfältig.** Orientierung an macOS-eigenen Apps im Stil von
Notizen/Kalender: warm statt steril, eine zurückhaltende Akzentfarbe statt
vieler, Karten mit dezentem Schatten statt harten Kästen, spürbar aber sparsam
eingesetztes Material/Liquid-Glass (Sidebar, Toolbars, Overlays) statt
dekorativem Blur überall. Native Systemkontrollen wo möglich (HIG-Prinzip) statt
durchgängig selbstgebauter Widgets.

## Anti-references

- **Kein generisches SaaS-Dashboard** — keine Cream/Indigo-Paletten, keine
  Gradient-Buttons, kein "Hero-Metric"-Muster, keine identischen Card-Grids.
- **Kein Material Design** — keine FABs, keine harten/eckigen Schatten, keine
  Ripple-Effekte, keine Material-typische Elevation-Sprache.
- **Nicht überfordernd** — die App begleitet Prüfungsstress, sie soll ihn nicht
  vergrößern. Kein visuelles Rauschen, keine aggressiven Farben/Animationen,
  keine Benachrichtigungsflut in der UI selbst (passt zu ADR-007, das schon
  auf "benachrichtigen statt sperren" setzt).

## Design Principles

1. **Native vor custom** — wo macOS/HIG bereits eine Lösung hat (Sidebar-
   Navigation, Kontextmenüs, Systemfarben für Fokus/Selektion), die
   übernehmen statt neu erfinden.
2. **Glas als Material, nicht als Dekoration** — Vibrancy/Blur gezielt für
   Ebenen, die über Inhalt schweben (Sidebar, Toolbar, Modals, Popovers),
   nie flächendeckend auf Karten oder Text.
3. **Vorschlagen, nie bevormunden** — spiegelt ADR-005 (Umplanung als
   Vorschlag) auch visuell: Änderungen/Diffs ruhig und deutlich als
   "Vorschlag" markiert, nie als plötzliche Zustandsänderung.
4. **Ruhe vor Reichtum** — eine Akzentfarbe, viel Weißraum, klare
   Gruppierung; Prüfungsvorbereitung ist stressig genug.
5. **Dichte folgt Kontext** — Planungs-/Setup-Ansichten (Fächer, Prüfungen,
   Verfügbarkeit) dürfen dichter/tabellarischer sein; die Heute-Ansicht und
   Karteikarten-Wiederholung bleiben großzügig und fokussiert, da sie in
   kurzen, häufigen Sessions genutzt werden.

## Accessibility & Inclusion

WCAG AA (Kontrast ≥4.5:1 für Text, ≥3:1 für große Schrift/UI-Komponenten).
`prefers-reduced-motion` wird respektiert (die App läuft auf persönlichen
Geräten, keine bekannten spezifischen Nutzerbedürfnisse darüber hinaus).
Vibrancy/Glas-Effekte müssen unter `prefers-reduced-transparency` (macOS-
Systemeinstellung "Transparenz reduzieren") auf solide Flächen zurückfallen.
