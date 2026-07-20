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

> **Standing instruction (Claude):** Änderungen werden automatisch committet —
> nach jedem abgeschlossenen Arbeitsschritt, ohne auf eine explizite
> Aufforderung des Nutzers zu warten. Das gilt auch für Zwischenstände, die
> noch nicht fertig sind (z. B. eine Heuristik, die noch nachgebessert wird)
> — dann mit `wip:`-Präfix. Grund: Sicherheitsnetz gegen Datenverlust
> (versehentliches `reset --hard`, Festplattenproblem) und eine
> nachvollziehbare Historie. **Nicht** der Grund: das Fortsetzen in einem
> neuen Chat — das funktioniert unabhängig vom Commit-Stand, weil eine neue
> Sitzung die Dateien direkt von der Festplatte liest. `CONTEXT.md` ist die
> eigentliche Brücke zwischen Chats, nicht der Commit-Log.
>
> **Damit das nicht in Unübersichtlichkeit umschlägt:** WIP-Commits bleiben
> auf dem Feature-Branch. Beim Zusammenführen in `main` wird **gesquasht**
> (`gh pr merge --squash` bzw. „Squash and merge" auf GitHub) — `main` zeigt
> dadurch nur saubere, nachvollziehbare Schritte, unabhängig davon, wie
> viele Zwischenversuche auf dem Branch nötig waren. Weiterhin **keine
> Force-Pushes** und kein Umschreiben bestehender Commits ohne ausdrückliche
> Bitte.

Klein und nachvollziehbar. Eine Änderung pro Commit.

```
ingest: Animationsschritte beim Import zusammenfassen
domain: Aufwandsschätzung auf eindeutige Zeichen umstellen
fix: Gedankenstrich in Kapitelnamen normalisieren
wip: Positionssignal für Build-Erkennung, noch nicht validiert
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
