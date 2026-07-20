# Mitarbeiten

Zwei Entwickler, zwei MacBooks, ein privates Repository.

---

## Einrichtung

```bash
git clone <repo-url>
cd Lernplaner
npm install
cp .env.example .env      # AI_API_KEY eintragen
npm run tauri dev
```

Jeder nutzt seinen **eigenen** API-Schlüssel. Schlüssel werden nicht geteilt und
nicht committet — siehe [SECURITY.md](SECURITY.md).

---

## Branches

`main` bleibt jederzeit lauffähig. Keine direkten Commits auf `main`.

```
feature/pdf-import
fix/kapitel-normalisierung
docs/datenmodell
```

Zusammenführung per Pull Request. **Keine Force-Pushes.**

---

## Commits

Klein und nachvollziehbar. Eine Änderung pro Commit.

```
ingest: Animationsschritte beim Import zusammenfassen
domain: Aufwandsschätzung auf eindeutige Zeichen umstellen
fix: Gedankenstrich in Kapitelnamen normalisieren
```

Präfix nach Schicht (`ui`, `domain`, `data`, `ingest`, `ai`, `platform`) oder
Art (`fix`, `docs`, `test`, `chore`).

---

## Vor jedem Push

```bash
npm test
npm run lint
git status          # nichts Unerwartetes?
git diff --cached   # was geht wirklich raus?
```

Besonders nach Materialimport oder Konfigurationsänderungen.

---

## Tests

Die Planungslogik in `src/domain/` ist reine Funktion und muss ohne laufende App
testbar bleiben. Jede Änderung daran braucht einen Test — insbesondere die
Fälle, die im Oktober zählen:

- fünf parallele Prüfungen
- weniger Zeit als Stoff
- Rückstand mitten in der Phase
- verschobener Prüfungstermin

---

## Dokumentation aktuell halten

| Wann | Was |
|---|---|
| Architekturentscheidung getroffen | `DECISIONS.md` — neuer ADR |
| Schema geändert | `DATA_MODEL.md` |
| Phase abgeschlossen | `ROADMAP.md`, `CONTEXT.md` (Abschnitt 8) |
| Neue Erkenntnis über Material/Nutzung | `CONTEXT.md` |

`CONTEXT.md` ist die Datei, die man nach vier Wochen Pause zuerst liest. Sie
muss stimmen.
