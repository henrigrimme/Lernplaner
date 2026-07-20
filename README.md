# Lernplaner

Private Lernplanungs-App für zwei WHU-Studenten. Importiert Vorlesungsfolien als
PDF, leitet daraus Themen und Umfang ab und erzeugt einen Lernplan, der sich an
Prüfungstermine, verfügbare Zeit und den tatsächlichen Fortschritt anpasst.

**Nicht für Veröffentlichung oder Verkauf gedacht.**

---

## Status

| | |
|---|---|
| Phase | 1 von 4 — Fundament |
| Zieltermin | **1. September 2026** nutzbar |
| Prüfungsphase | Oktober 2026 |

Siehe [ROADMAP.md](ROADMAP.md) für den Stand im Detail.

---

## Was die App macht

1. **Importieren** — PDFs per Drag & Drop, Text und Struktur werden extrahiert
2. **Verstehen** — Themenbaum pro Fach, mit Seitenreferenzen, manuell korrigierbar
3. **Planen** — Aufwand schätzen, Kapazität prüfen, in Tagesblöcke terminieren
4. **Begleiten** — Tagesansicht, Zeiterfassung, Neuberechnung bei Verzug

Später: Karteikarten, Spaced Repetition, Quiz und Probeklausuren.

---

## Einrichtung

Voraussetzungen: Node.js ≥ 20, Rust (für Tauri), macOS.

```bash
git clone <repo-url>
cd Lernplaner
npm install
cp .env.example .env      # dann AI_API_KEY eintragen
npm run tauri dev
```

Einen Gemini-API-Schlüssel gibt es unter https://aistudio.google.com/apikey.
Die Kosten liegen für den Planungsbetrieb bei unter 1 € pro Monat.

---

## Wo die Daten liegen

Alles lokal, nichts in der Cloud:

```
~/Library/Application Support/Lernplaner/
  lernplaner.db        SQLite-Datenbank
  library/             Kopien der importierten PDFs
```

**Kein automatisches Backup.** Wer seine Arbeit sichern will, nutzt den
Kurs-Export in den Einstellungen.

---

## Dokumentation

| Datei | Inhalt |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Vision, Nutzer, Anforderungen, Recherche, Stand |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Aufbau und Schichten |
| [DATA_MODEL.md](DATA_MODEL.md) | Datenbankschema mit Begründungen |
| [DECISIONS.md](DECISIONS.md) | Architekturentscheidungen mit Datum |
| [ROADMAP.md](ROADMAP.md) | Phasen und Stand |
| [SECURITY.md](SECURITY.md) | Schlüssel, Unterlagen, Datenschutz |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Mitarbeiten, Branches, Commits |

---

## Wichtig

Vorlesungsunterlagen, Altklausuren und persönliche Lerndaten gehören **nicht**
in dieses Repository. Die `.gitignore` schließt sie aus — siehe
[SECURITY.md](SECURITY.md).
