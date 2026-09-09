# Lernplaner

Private Lernplanungs-App für zwei WHU-Studenten. Importiert Vorlesungsfolien als
PDF, leitet daraus Themen und Umfang ab und erzeugt einen Lernplan, der sich an
Prüfungstermine, verfügbare Zeit und den tatsächlichen Fortschritt anpasst.

**Nicht für Veröffentlichung oder Verkauf gedacht.**

---

## Status

| | |
|---|---|
| Phase | 4 von 4 — Echtbetrieb, additive Verbesserungen aus dem Alltag |
| Version | **v0.37.0** (signierte Releases, Auto-Update) |
| Im Einsatz seit | 1. September 2026 |
| Prüfungsphase | Oktober 2026 |

Genauer Arbeitsstand und nächster Schritt: **[CONTEXT.md](CONTEXT.md)
Abschnitt 8 „Stand"** (wird nach jedem Schritt nachgeführt).
Phasenüberblick: [ROADMAP.md](ROADMAP.md).

---

## Was die App macht

1. **Importieren** — PDF/`.docx`/`.pptx`/`.xlsx`/`.md`/`.txt`/`.csv` sowie
   Anki-Decks (`.apkg`/`.colpkg`); Text und Struktur werden ohne KI extrahiert
2. **Verstehen** — Themenbaum pro Fach, mit Seitenreferenzen, manuell korrigierbar
3. **Planen** — Aufwand schätzen, Kapazität prüfen, in Tagesblöcke terminieren;
   Verfügbarkeit per Regel/Zeitraum oder im Freitext an „Sven" (KI-Assistent)
4. **Begleiten** — Tagesansicht, Zeiterfassung, Neuberechnung bei Verzug,
   Fortschritt pro Fach

Umgesetzt: Karteikarten mit Spaced Repetition (FSRS), Quiz, Probeklausur,
Fehlerhistorie, Altklausur-Gewichtung, Kalender-Export, PDF-Viewer,
Kurs-Export/Import, KI-Assistent „Sven". Offen: siehe [ROADMAP.md](ROADMAP.md)
„Später / offen".

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
