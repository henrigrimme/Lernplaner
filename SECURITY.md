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

Die App nutzt eine externe KI-API zur Themenerkennung.

**Übertragen wird:** extrahierter Text aus euren Foliensätzen — Titel,
Kapitelzeilen, Fließtext.

**Nicht übertragen wird:** die PDF-Dateien selbst, euer Lernfortschritt, eure
Notizen, eure Prüfungsergebnisse.

**Bedingung:** Vor der ersten Übertragung eines Dokuments fragt die App nach.
Ohne Bestätigung verlässt nichts den Rechner. Für Dokumente, die als
Altklausur erkannt wurden, wird gesondert gefragt.

Wer das nicht möchte, kann die KI-Verfeinerung abschalten — die Kapitelstruktur
wird ohnehin ohne KI aus den Folien selbst gewonnen. Der Themenbaum wird dann
gröber, die App bleibt nutzbar.

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

---

## Vor jedem Commit

```bash
git status              # nichts Unerwartetes dabei?
git diff --cached       # was geht wirklich raus?
```

Besonders nach dem Import neuer Materialien oder dem Ändern der
Konfiguration. Im Zweifel nachfragen statt committen.
