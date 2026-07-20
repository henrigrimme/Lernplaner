# Architektur

Tauri 2, TypeScript/React im Frontend, SQLite lokal. Begründung in
[ADR-001](DECISIONS.md).

---

## Schichten

```
┌──────────────────────────────────────────────┐
│  ui/          React-Komponenten               │
│               keine Geschäftslogik            │
├──────────────────────────────────────────────┤
│  domain/      Planung · Schätzung · Fortschritt│
│               reine Funktionen                │
│               kennt weder DB noch UI noch KI  │
├───────────┬──────────┬───────────┬───────────┤
│  data/    │ ingest/  │  ai/      │ platform/ │
│  SQLite   │ PDF      │ Anbieter  │ macOS     │
└───────────┴──────────┴───────────┴───────────┘
```

**Die Regel, an der alles hängt:** `domain/` importiert nichts aus den anderen
Schichten. Planung, Aufwandsschätzung und Fortschrittsberechnung sind reine
Funktionen über einfache Datenstrukturen.

Der Grund ist praktisch: Der Planungsalgorithmus ist der Teil, der stimmen muss,
und der einzige, der sich sinnvoll testen lässt. Sobald er Datenbankzugriffe
enthält, ist er nur noch mit laufender App prüfbar — und dann wird er nicht mehr
geprüft.

---

## Schichten im Einzelnen

### `ingest/` — vom PDF zur Struktur

```
PDF-Datei
  → pdf.js: Text mit Position und Schriftgröße
  → Titelerkennung (größte Schrift im oberen Drittel)
  → Animationsschritte zusammenfassen
  → Kapitelerkennung (Untertitel / Trennfolien / Dateiname)
  → Fuzzy-Normalisierung der Kapitelnamen
  → Themenbaum + Umfangsmaße
```

Rein deterministisch. Die KI kommt erst danach und nur zur Verfeinerung.

### `domain/` — die Logik

- `estimation.ts` — Aufwand aus Umfang, Schwierigkeit, Gewicht, Prüfungsart
- `capacity.ts` — verfügbare vs. benötigte Zeit, Defiziterkennung
- `scheduling.ts` — Terminierung, Verschränkung, Wiederholungsabstände
- `replanning.ts` — Neuberechnung und Diff
- `progress.ts` — mastery, Vorbereitungsgrad, nächster Schritt

### `data/` — Persistenz

SQLite über `tauri-plugin-sql`. Migrationen nummeriert und vorwärtsgerichtet.
Ab dem 1. September nur noch additive Änderungen.

### `ai/` — austauschbar

Eine Schnittstelle, mehrere Implementierungen:

```ts
interface AIProvider {
  refineTopics(doc: ExtractedDocument): Promise<TopicSuggestion[]>
  estimateDifficulty(topic: Topic, sample: string): Promise<number>
  // später: generateQuestions, explainAnswer
}
```

Anbieterwechsel ist Konfiguration. Jeder Aufruf wird mit Tokenverbrauch
protokolliert, damit die Kostenanzeige stimmt.

### `platform/` — macOS

Benachrichtigungen, Dateisystem, Kalender-Export. Gekapselt, damit eine
spätere iOS-Version nicht die halbe App anfassen muss.

---

## Datenfluss beim Import

```
Nutzer zieht PDFs in die App
        ↓
ingest/  extrahiert, erkennt Struktur, misst Umfang
        ↓
data/    legt documents, topics, topic_sections an
        ↓
ai/      verfeinert Themen  (optional, nach Rückfrage)
        ↓
ui/      zeigt Themenbaum zur Prüfung
        ↓
Nutzer korrigiert  →  manual_override = true
        ↓
domain/  schätzt Aufwand, prüft Kapazität, terminiert
        ↓
data/    schreibt study_blocks
        ↓
ui/      Heute-Ansicht
```

---

## Tests

`domain/` wird gegen erfundene Szenarien getestet, nicht gegen die Datenbank.
Die Fälle, die zählen:

- fünf parallele Prüfungen mit knapper Zeit
- Rückstand mitten in der Vorbereitung
- verschobener Prüfungstermin
- neues Material nachträglich importiert
- Kapazität reicht nicht → Streichvorschlag

`ingest/` wird gegen echte Foliensätze getestet — die drei bereits analysierten
Fächer decken sehr unterschiedliche Bauweisen ab und sind der Referenzfall.
