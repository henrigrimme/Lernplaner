---
name: Lernplaner
description: macOS-natives Produkt-UI — Sidebar-Navigation, Liquid-Glass-Material, warme Creme-/Terrakotta-Palette
colors:
  primary: "oklch(0.64 0.13 45)"
  primary-hover: "oklch(0.58 0.14 45)"
  accent: "oklch(0.55 0.08 200)"
  accent-hover: "oklch(0.49 0.09 200)"
  success: "oklch(0.58 0.13 145)"
  warning: "oklch(0.78 0.14 95)"
  danger: "oklch(0.55 0.19 20)"
  bg: "oklch(0.97 0.014 75)"
  surface: "oklch(0.94 0.017 72)"
  surface-2: "oklch(0.895 0.02 68)"
  border: "oklch(0.84 0.019 65)"
  ink: "oklch(0.26 0.02 50)"
  muted: "oklch(0.52 0.02 50)"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 620
    lineHeight: 1.3
    letterSpacing: "-0.006em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
---

# Design System: Lernplaner

## 1. Overview

**Creative North Star: "Notizblock im Nachmittagslicht"**

Eine ruhige, native macOS-App im Stil der eigenen Apple-Apps — Notizen und
Kalender — kombiniert mit der warmen Creme-/Terrakotta-Stimmung der
Claude-App (expliziter Nutzerwunsch): warmes Beige-Papier statt sterilem
Weiß, ein einziges Terrakotta als durchgehender Akzent. Glas ist ein echtes
Material, kein Dekor — Sidebar und Toolbar schweben mit spürbarer Vibrancy
über dem Inhalt, alles andere bleibt flach. Die App begleitet
Prüfungsstress; sie soll ihn nie vergrößern (PRODUCT.md, Anti-Reference
„nicht überfordernd").

Dieses System lehnt explizit ab: generische SaaS-Paletten (Indigo/Blau,
Gradient-Buttons, Hero-Metric-Karten), Material-Design-Sprache (FABs, harte
Schatten, Ripple-Effekte) und jede Form visuellen Lärms, der neben
Prüfungsvorbereitung zusätzlich belastet.

**Key Characteristics:**
- Ein Akzent (Terrakotta), sparsam eingesetzt — jede zweite Farbe ist neutral
- Warmes Creme/Beige als Grundfläche statt sterilem Weiß (bewusste Ausnahme
  von der generischen "reines Weiß"-Regel — hier explizit als Umgebung
  gewünscht, an die Claude-App angelehnt)
- Glas nur auf Sidebar/Toolbar/Overlays, nie auf Karten oder Text
- Gruppierte Listen (Systemeinstellungen-Stil) statt Card-Grids
- Systemschrift (SF Pro über `-apple-system`), keine Web-Fonts, keine Cloud

## 2. Colors

Warme, niedrig-chromatische Neutrale (Hue ~50-75°, Creme/Beige/Braun) plus
zwei klar unterscheidbare Marken-Töne, die nie mehr als Buttons, aktive
Navigation und Badges einnehmen.

### Primary
- **Kraft Terracotta** (`oklch(0.64 0.13 45)`): einzige Farbe für
  Primär-Buttons (`type="submit"`) und den aktiven Sidebar-Eintrag. An das
  Claude-Markenorange angelehnt — steht für „das ist die wichtige Handlung
  auf diesem Bildschirm", sonst nirgends verwendet.

### Secondary
- **Quiet Petrol** (`oklch(0.55 0.08 200)`): Links, sekundäre Hinweise,
  künftige Info-Badges. Bewusst eine kühle Gegenfarbe zum warmen Terrakotta,
  damit Primär- und Sekundäraktion nie verwechselt werden.

### Tertiary
- **System Green** (`oklch(0.58 0.13 145)`) / **System Amber** (`oklch(0.78 0.14 95)`)
  / **System Red** (`oklch(0.55 0.19 20)`): Erfolg/Warnung/Gefahr. Der
  System-Rotton liegt bewusst näher am reinen Rot (Hue 20°) als das
  Terrakotta-Primär (Hue 45°), damit eine Fehlermeldung nie wie ein
  Primär-Button aussieht. Noch nicht breit im Code verwendet — für künftige
  Status-Badges reserviert (z. B. Kapazitäts-Defizitwarnung).

### Neutral
- **Warm Paper** (`oklch(0.97 0.014 75)`): Haupt-Inhaltsfläche. Trägt
  bewusst Wärme (Creme/Beige) statt reinem Weiß — die Umgebung selbst ist
  Teil der Marke (Named Rule unten).
- **Warm Sand** (`oklch(0.94 0.017 72)`): Sidebar-Grundfläche unter dem
  Glas, gruppierte Listen, Formulare.
- **Warm Sand Deep** (`oklch(0.895 0.02 68)`): Hover-Zustand auf
  Sekundär-Buttons.
- **Hairline** (`oklch(0.84 0.019 65)`): jede Trennlinie, Card-/Formularrand.
- **Ink** (`oklch(0.26 0.02 50)`): warmes Dunkelbraun, Fließtext, ≥7:1 gegen
  Warm Paper.
- **Muted Ink** (`oklch(0.52 0.02 50)`): Label-Text, Sekundärtext, ≥4.5:1
  gegen Warm Paper.

Dark Mode folgt `prefers-color-scheme` automatisch (siehe `tokens.css`):
Bg auf ein warmes Dunkelbraun (`oklch(0.19 0.012 50)`, nicht neutrales
Schwarz), Primary/Accent leicht aufgehellt für Lesbarkeit auf dunklem
Grund — keine separate Umschaltung, die App folgt der macOS-Systemeinstellung
wie jede native App.

### Named Rules
**The One Accent Rule.** Kraft Terracotta erscheint nur auf
`button[type=submit]` und dem aktiven Navigationseintrag. Kein zweiter Ort
im UI verwendet dieselbe Farbe für eine andere Bedeutung.

**The Warm-Ground Rule.** Anders als der generische Produkt-Default (reines
Weiß, Wärme nur im Akzent) trägt hier auch die Grundfläche selbst Wärme —
bewusste Entscheidung, an die Claude-App angelehnt, nicht Zufall.

## 3. Typography

**Display/Body/Label Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif`

**Character:** Eine einzige Systemschrift in drei Gewichten — kein
Font-Pairing, weil die native SF-Pro-Rendering-Qualität selbst der Punkt
ist (kein Web-Font-Ladevorgang, keine Cloud-Abhängigkeit, passt zu ADR-003).

### Hierarchy
- **Headline** (650, 22px, 1.2): Toolbar-Titel, App-Name.
- **Title** (620, 16px, 1.3): Abschnittsüberschriften (`h2`, z. B. „Fächer").
- **Label** (550, 12px, 1.4, keine Großschreibung): Formular-Labels,
  Sidebar-Gruppentitel (dort in 11px + `letter-spacing: 0.02em` + Uppercase
  als einzige Ausnahme — Systemeinstellungen-Konvention für Gruppentitel).
- **Body** (400, 14px, 1.5): Fließtext, Listeneinträge. Max. 70ch.

### Named Rules
**The No-Web-Font Rule.** Kein `@font-face`, kein Google-Fonts-Import. Die
Systemschrift ist die Marke.

## 4. Elevation

Flach mit gezieltem Glas, kein Schatten-Vokabular für Tiefe im
Standardzustand. Formulare/gruppierte Listen heben sich nur über
Flächenfarbe (Warm Sand auf Warm-Paper-Inhaltsfläche) und einen
1px-Hairline-Rand ab, nie über Schlagschatten. Schatten sind ausschließlich
der Sidebar-/Toolbar-Marke selbst vorbehalten (Vibrancy braucht keinen
zusätzlichen Schatten) und punktuellem Zustands-Feedback (Button-Press via
`transform`, nicht Schatten).

### Shadow Vocabulary
- **sm** (`0 1px 2px oklch(0.26 0.02 50 / 0.08)`): App-Marke-Icon in der
  Sidebar, sehr dezent.
- **md** (`0 4px 16px oklch(0.26 0.02 50 / 0.1)`): reserviert für
  zukünftige Overlays/Popover.
- **lg** (`0 12px 32px oklch(0.26 0.02 50 / 0.16)`): reserviert für Modals.

### Named Rules
**The Glass-Not-Shadow Rule.** Sidebar und Toolbar erzeugen ihre Trennung
vom Inhalt über `backdrop-filter: blur(20px) saturate(1.8)` plus einen
1px-Rand (`--glass-border`), nicht über `box-shadow`. Unter
`prefers-reduced-transparency` fällt das Glas auf eine solide
`--color-surface`-Fläche zurück (`--glass-blur: 0px`).

## 5. Components

### Buttons
- **Shape:** 6px Radius (`--radius-sm`), nie eckig, nie pill-förmig außer
  explizit als Badge.
- **Primary** (`type="submit"`): Kraft Terracotta, warmweißer Text, 6px/16px
  Padding.
- **Hover / Focus:** Hover dunkelt die Fläche eine Stufe ab
  (`--color-primary-hover` bzw. `--color-surface-2`); Fokus zeigt einen
  2px-Accent-Ring mit 2px Offset (`:focus-visible`), kein Farbwechsel.
- **Secondary** (`type="button"`): Warm-Sand-Fläche, Hairline-Rand, Ink-Text
  — die Standard-Handlung für alles außer der einen Primäraktion pro Formular.
- **Active:** `transform: scale(0.97)` — der einzige Bewegungs-Hinweis auf
  Druck, kein Farbwechsel gleichzeitig.

### Cards / Containers
- **Corner Style:** 14px Radius (`--radius-lg`) für Formulare und gruppierte
  Listen.
- **Background:** Warm Sand auf Warm-Paper-Inhaltsfläche.
- **Shadow Strategy:** keine — Abgrenzung über Flächenfarbe + Hairline-Rand
  (siehe Elevation).
- **Border:** 1px Hairline.
- **Internal Padding:** 16px (`--space-md`).

### Inputs / Fields
- **Style:** Warm-Paper-Fläche (Kontrast zur Warm-Sand-Formularfläche
  darunter), 1px Hairline-Rand, 6px Radius.
- **Focus:** Rand wechselt zu Quiet Petrol + 3px weicher Ring
  (`box-shadow: 0 0 0 3px oklch(from var(--color-accent) l c h / 0.2)`),
  kein Farbwechsel der Fläche.

### Fach-Farbwahl (Signature Component)
Statt einer freien Hex-Eingabe ein `<select>` mit acht kuratierten,
benannten Farben (Terrakotta, Ocker, Olivgrün, Petrolblau, Taubenblau,
Pflaume, Bordeaux, Graphit — `ui/CourseSetup.tsx`, `COURSE_COLORS`), mit
einem runden 20px-Swatch links neben dem Dropdown als Live-Vorschau. Jede
Farboption ist deutlich von Kraft Terracotta (dem App-Akzent selbst)
unterscheidbar, damit eine Fach-Farbe nie mit der App-Akzentfarbe
verwechselt wird.

### Navigation (Sidebar)
- **Style:** Glas-Fläche über der gesamten Fensterhöhe, 260px breit. Jeder
  Eintrag ein `button.app-nav-item`, 13px Body-Gewicht, 6px Radius.
- **Default:** transparent, Ink-Text.
- **Hover:** 6%-Ink-Tönung (`oklch(from var(--color-ink) l c h / 0.06)`).
- **Active** (`aria-current="page"`): Kraft-Terracotta-Fläche, warmweißer
  Text, 560-Gewicht — der einzige Ort außer Primär-Buttons, der die
  Akzentfarbe trägt.

### Toolbar (Signature Component)
Glas-Leiste über dem Inhalt, 52px hoch, zeigt den Titel des aktiven
Navigationspunkts links und — sobald ein Fach gewählt ist — dessen Namen
rechts. Trennt sich vom Inhalt ausschließlich über Vibrancy + Hairline,
nicht über Schatten (siehe Elevation, „Glass-Not-Shadow Rule").

### Fach-Reiter (Signature Component, seit Redesign 2026-07-23)
`ui/CourseWorkspace.tsx` — sobald ein Fach gewählt ist, zeigt „Fächer &
Themen" nicht mehr alle Bereiche (Prüfungen, Material, Themen) unterein-
ander, sondern in drei Reitern: „Prüfungen", „Material", „Themen &
Quellen". Segmented-Control-Optik: `--color-surface`-Fläche mit
Hairline-Rand als Behälter (`--radius-md`), jeder Reiter ein
`button[role="tab"]`, `--radius-sm`, transparent im Ruhezustand. Aktiver
Reiter (`aria-selected="true"`) trägt Kraft Terracotta + warmweißen
Text — dieselbe „aktueller Ort"-Sprache wie der aktive Sidebar-Eintrag
(`.app-nav-item[aria-current='page']`), kein zweiter Ort mit derselben
Bedeutung (DESIGN.md „One Accent Rule" bleibt gewahrt: nur eine von
mehreren „aktueller Zustand"-Stellen, nicht eine zweite Akzentfarbe).
Alle drei Panels bleiben über `hidden` im DOM (kein bedingtes Unmounten),
damit ein Reiterwechsel keinen offenen Formularzustand verwirft.

Darüber, in einem eigenen `<details>`-Element (`.course-management`,
natives Aufklappen statt selbstgebautem Akkordeon), bleibt die
Fach-/Ordner-Verwaltung erreichbar — eingeklappt, sobald ein Fach gewählt
ist, damit die fokussierte Reiteransicht des gewählten Fachs den ersten
Blick bekommt.

## 6. Do's and Don'ts

### Do:
- **Do** Kraft Terracotta (`oklch(0.64 0.13 45)`) ausschließlich für
  `type="submit"`-Buttons und den aktiven Sidebar-Eintrag verwenden.
- **Do** warme Creme-/Beige-Töne für alle Flächen verwenden (Warm Paper/Warm
  Sand) — das ist hier bewusste Marke, keine generische Abweichung.
- **Do** Glas (`backdrop-filter`) nur auf Ebenen einsetzen, die über Inhalt
  schweben (Sidebar, Toolbar, künftige Modals/Popover) — nie auf Karten oder
  Formularen selbst.
- **Do** `prefers-reduced-transparency` und `prefers-reduced-motion`
  respektieren; beide haben bereits ein CSS-Fallback in `tokens.css`/
  `global.css`.
- **Do** native Systemschrift verwenden (`-apple-system`-Stack), keine
  Web-Fonts laden.
- **Do** Fach-Farben über das kuratierte `COURSE_COLORS`-Dropdown wählen
  lassen, nie über freie Hex-Eingabe.

### Don't:
- **Don't** ein generisches SaaS-Dashboard bauen — keine Indigo/Blau-Paletten,
  keine Gradient-Buttons, kein Hero-Metric-Muster, keine identischen
  Card-Grids (PRODUCT.md Anti-Reference).
- **Don't** Material-Design-Elemente verwenden — keine FABs, keine harten
  eckigen Schatten, keine Ripple-Effekte (PRODUCT.md Anti-Reference).
- **Don't** eine zweite Akzentfarbe für Primär-Aktionen einführen — Quiet
  Petrol ist für sekundäre/informative Zwecke reserviert, nie für die
  Hauptaktion eines Formulars.
- **Don't** Glas dekorativ auf Text oder Karten legen, nur weil es "modern"
  aussieht — es ist Sidebar/Toolbar/Overlay vorbehalten (Named Rule
  „Glass-Not-Shadow").
- **Don't** Schlagschatten für Card-Tiefe verwenden — Abgrenzung läuft über
  Flächenfarbe + 1px-Hairline.
- **Don't** eine Fach-Farbe anbieten, die mit Kraft Terracotta verwechselbar
  ist (z. B. ein zweites Orange/Rot in `COURSE_COLORS`).
