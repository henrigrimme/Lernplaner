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

## Releases

> **Standing instruction (Claude):** Nach jeder vom Nutzer angestoßenen
> Änderung, die tatsächlich sichtbares/nutzbares Verhalten betrifft (UI,
> Funktion, Bugfix — nicht reine Doku-/Interna-Änderungen), automatisch:
> Version anheben (`package.json`, `src-tauri/tauri.conf.json`,
> `src-tauri/Cargo.toml` — alle drei gleichzeitig), signierten Release-Build
> bauen (`TAURI_SIGNING_PRIVATE_KEY` aus `~/.tauri/lernplaner-updater.key`
> bzw. dem Backup unter `App/signing-key-backup/`), `latest.json` erzeugen
> und einen neuen GitHub Release veröffentlichen (Zip fürs manuelle
> Nachinstallieren + `.tar.gz`/`.sig`/`latest.json` für den Auto-Updater).
> **Ohne erneute Rückfrage** — das ist der ganze Sinn dieser Anweisung:
> der Nutzer soll jede Änderung direkt in der laufenden App sehen können,
> ohne bei jedem Mal erneut nach einem Release zu fragen (siehe ADR-008).
>
> Ablauf, der sich bewährt hat (PR #32/#33 als Präzedenzfall):
> 1. Feature-Branch → PR → **Merge automatisch autorisiert** (Nutzerwunsch,
>    2026-07-22) — nicht mehr einzeln nachfragen.
> 2. Version an der dritten Stelle (Minor) anheben, nicht Patch — jede
>    veröffentlichte Änderung ist für die zwei Nutzer sichtbar, nicht nur
>    intern.
> 3. Build + Signierung + Release wie oben.
> 4. Kurze Release-Notes: was hat sich geändert, in einfachen Worten (nicht
>    Commit-Message-Jargon) — die Nutzer sind keine Entwickler.

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
