# Sicherheit und Datenschutz

Das Repository ist privat, aber „privat" ersetzt keine Sorgfalt. Ein einmal
committetes Geheimnis bleibt in der Git-Historie, auch nach dem Löschen.

---

## Was nie ins Repository gehört

| Kategorie | Beispiele | Schutz |
|---|---|---|
| **Geheimnisse** | API-Schlüssel, Tokens, Passwörter | `.gitignore`: `.env`, `*.key`, `*.pem` |
| **Lerndaten** | `lernplaner.db`, Fortschritt, Notizen | `.gitignore`: `*.db`, `*.sqlite*` |
| **Unterlagen** | Vorlesungsfolien, Skripte, Paper | `.gitignore`: `*.pdf`, `*.pptx`, `*.docx` |
| **Altklausuren** | Klausuren, Musterlösungen | dieselben Regeln |

Der Grund ist bei jeder Kategorie ein anderer: Geheimnisse ermöglichen Missbrauch
auf fremde Kosten. Lerndaten sind persönlich. Unterlagen und Altklausuren sind
**urheberrechtlich geschützt** und ihre Weitergabe ist häufig ausdrücklich
untersagt — auch in einem privaten Repository.

---

## Umgang mit dem API-Schlüssel

**In der Entwicklung:** in `.env`, die per `.gitignore` ausgeschlossen ist.
Vorlage ist `.env.example` — dort steht nie ein echter Wert.

**Im Programm:** in der macOS-Keychain, nicht in der Datenbank und nicht in einer
Datei. Der Schlüssel wird nur zur Laufzeit gelesen.

**Nie:** im Quelltext, in Commit-Nachrichten, in Log-Ausgaben, in Screenshots,
in Fehlerberichten.

### Falls doch einmal ein Schlüssel committet wurde

1. **Schlüssel sofort beim Anbieter widerrufen** — das ist der einzige Schritt,
   der wirklich schützt
2. Neuen Schlüssel erzeugen
3. Erst danach über eine Bereinigung der Historie nachdenken

Reihenfolge einhalten. Ein Schlüssel, der in der Historie steht, ist verbrannt,
sobald das Repository je jemand anderes zu sehen bekommt.

---

## Was an externe Dienste übertragen wird

Die App nutzt eine externe KI-API (Claude oder ChatGPT, je nach eigener
Wahl in den Einstellungen — siehe ADR-011/ADR-013) für drei Funktionen:
Quiz-Generierung, Probeklausur-Simulation und Altklausur-Analyse
(ROADMAP.md Phase 4), sowie die Themenerkennung bei Zusammenfassungen
(ADR-015, da diese anders als Folien keine einheitliche Struktur haben,
aus der sich Themen ohne KI zuverlässig ableiten lassen).

**Übertragen wird:** extrahierter Text aus den jeweils betroffenen
Dokumenten — z. B. der Seitentext des ausgewählten Themenabschnitts bei
Quiz-Generierung, der Volltext ausgewählter Altklausuren bei der
Altklausur-Analyse, der Volltext einer Zusammenfassung bei deren
Themenerkennung.

**Nicht übertragen wird:** die PDF-Dateien selbst (nur extrahierter
Text), euer Lernfortschritt, eure Notizen, eure Prüfungsergebnisse.

**Kein gesonderter Bestätigungsdialog vor jeder Übertragung** (bewusste
Entscheidung, 2026-07-22 — eine frühere Fassung dieses Abschnitts hatte
das versprochen, war aber nie umgesetzt und wurde auf Rückfrage bewusst
verworfen statt nachträglich gebaut): jede der drei Funktionen wird vom
Nutzer selbst und gezielt ausgelöst (Knopfdruck in „Quiz"/„Fächer &
Themen"), das *ist* die Bestätigung. Voraussetzung für jede Übertragung
bleibt ohnehin ein selbst hinterlegter API-Schlüssel — ohne Schlüssel
findet keine einzige Übertragung statt.

Wer das grundsätzlich nicht möchte, hinterlegt einfach keinen API-Schlüssel
(Einstellungen → „KI-Anbindung") — die App bleibt ohne ihn vollständig
nutzbar, nur die drei genannten Funktionen sind dann nicht verfügbar.

---

## Lokale Daten

```
~/Library/Application Support/Lernplaner/
```

Keine Cloud, kein Server, keine Telemetrie, keine Nutzungsdaten.

**Empfehlung:** FileVault aktivieren. Das ist die Schutzschicht, die zählt,
wenn ein MacBook verloren geht — eine App-seitige Verschlüsselung ohne
Festplattenverschlüsselung wäre Theater.

**Kein Backup.** Bewusste Entscheidung der Nutzer. Ein Gerätedefekt bedeutet
Totalverlust. Der Kurs-Export in den Einstellungen ist die einzige Möglichkeit,
Arbeit zu sichern.

**Lesezugriff auf `$HOME/**`** (`src-tauri/capabilities/default.json`,
seit v0.17.0): der Ordner-Import braucht Lesezugriff auf vom Nutzer frei
gewählte Ordner irgendwo im eigenen Home-Verzeichnis (Vorlesungsmaterial
liegt nicht zwingend unter `$APPDATA`). Reiner Lesezugriff
(`fs:allow-read-file`/`-read-dir`/`-exists`), kein Schreibzugriff außerhalb
von `$APPDATA/documents` — Schreiben bleibt dort beschränkt (siehe oben).
Ausgelöst nur durch eine bewusste Nutzeraktion (den nativen Ordner-Dialog
öffnen und einen Ordner bestätigen), kein automatischer Hintergrundzugriff.

---

## Vor jedem Commit

```bash
git status              # nichts Unerwartetes dabei?
git diff --cached       # was geht wirklich raus?
```

Besonders nach dem Import neuer Materialien oder dem Ändern der
Konfiguration. Im Zweifel nachfragen statt committen.
