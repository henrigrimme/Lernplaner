# Architekturentscheidungen

Chronologisch. Jede Entscheidung mit Datum, Begründung und Alternativen.
Wird nie umgeschrieben — überholte Entscheidungen werden als *überholt*
markiert und durch eine neue ersetzt.

---

## ADR-001 — Tauri 2 statt Electron oder nativem Swift
**2026-07-20 · angenommen**

**Kontext:** Desktop-App für zwei MacBooks (Apple Silicon). Cross-Platform ist
laut Nutzern akzeptabel, native App keine Pflicht.

**Entscheidung:** Tauri 2 mit TypeScript/React im Frontend und SQLite lokal.

**Begründung:**
- Ein einziger Stack deckt PDF-Extraktion *und* PDF-Anzeige ab (`pdf.js`)
- Deutlich kleineres Bundle und geringerer Speicherverbrauch als Electron
- Native macOS-Benachrichtigungen über Plugin
- Kaum Rust nötig — Plugins decken Dateisystem, SQL und Notifications ab
- Hält die Tür für eine spätere iOS-Version offen

**Alternativen:**
- *Swift/SwiftUI* — beste macOS-Integration, aber deutlich höherer Aufwand und
  keine Wiederverwendung bei einer möglichen Web-Variante. Bei 6 Wochen bis zum
  Zieltermin nicht vertretbar.
- *Electron* — vertrauter, aber ~150 MB Bundle und höherer Speicherverbrauch
  ohne Gegenwert.

---

## ADR-002 — Externe KI-API statt lokalem Modell
**2026-07-20 · angenommen**

**Kontext:** Budget 10–15 €/Monat. Nutzer haben ChatGPT-Edu- und
Claude-Pro/Max-Abos, die aber keinen API-Zugang gewähren.

**Entscheidung:** Externe API, zunächst Gemini Flash-Lite, hinter einer
austauschbaren Schnittstelle.

**Begründung:**
- Kosten für den Planungsbetrieb liegen unter 1 €/Monat — lokale Modelle lösen
  ein Problem, das nicht existiert
- Consumer-Abos sind technisch kein API-Ersatz (getrennte Produkte)
- Der Umweg über Claude Code wäre ein Nutzungsbedingungs-Graubereich, an
  Rate Limits gebunden und fragil
- Flash-Lite reicht für Themenextraktion; Qualität ist hier nicht der Engpass

**Folge:** Anbieter ist Konfiguration, kein Umbau. Ein Wechsel zu einem
stärkeren Modell für die spätere Quizgenerierung ist vorgesehen.

---

## ADR-003 — Keine Synchronisierung, keine Backups
**2026-07-20 · angenommen**

**Kontext:** Zwei Nutzer, zwei MacBooks. Ausdrücklicher Wunsch: rein lokale
Daten, keine Cloud, keine Backups.

**Entscheidung:** Kein Sync-Mechanismus, kein Backend, kein automatisches
Backup. Stattdessen ein Kurs-Export als Datei (Themenbaum und Gewichtungen,
ohne PDFs) für den Austausch untereinander.

**Begründung:** Entfernt Backend, Konfliktbehandlung und Kontenverwaltung
vollständig — die größte Einzelvereinfachung des Projekts. Der Kurs-Export
deckt den eigentlichen Nutzen (geteilte Kurse) mit minimalem Aufwand ab.

**Bekanntes Risiko:** Ein Gerätedefekt bedeutet Totalverlust. Von den Nutzern
akzeptiert, in SECURITY.md dokumentiert.

---

## ADR-004 — Aufwandsschätzung über eindeutige Zeichen, nicht Seitenzahl
**2026-07-20 · angenommen**

**Kontext:** Die ursprüngliche Formel `Seiten × Minuten/Seite` wurde an echtem
Material aus drei Fächern getestet und **widerlegt**.

Vorlesungsfolien enthalten Animationsschritte — jede Einblendung ist eine eigene
PDF-Seite. Die Aufblähung ist pro Fach völlig verschieden:

| Fach | PDF-Seiten | echte Folien | Faktor |
|---|---|---|---|
| Microeconomics | 32 | 29 | 1,10× |
| Entrepreneurial Transformation | 53 | 43 | 1,23× |
| Money & Banking (Bonds) | 64 | 29 | 2,21× |

Eine seitenbasierte Schätzung hätte „Bonds" um mehr als das Doppelte
überschätzt. Ein pauschaler Korrekturfaktor hilft nicht, weil der Wert pro Fach
schwankt.

**Entscheidung:**

```
minuten = (eindeutige_zeichen / 1000) × 4,5     ← Textumfang
        + (echte_folien × 0,5)                   ← Diagramme, Orientierung
        × fach_schwierigkeit
        × themen_gewicht
        × prüfungsart
        × kalibrierung
```

„Eindeutige Zeichen" = Textzeilen nach Entfernung von Wiederholungen über
Animationsschritte hinweg.

**Begründung:** Der eindeutige Textumfang ist über alle drei getesteten Fächer
stabil, die Seitenzahl nicht. Der Zuschlag pro Folie fängt Inhalte ab, die keinen
Text haben (Diagramme, Grafiken).

**Offen:** Die genaue Erkennung von Animationsschritten braucht in Phase 1 noch
Feinabstimmung. Reiner Titelvergleich führt zu Übergruppierung, strikte
Textenthaltung zu Untergruppierung. Kombination aus beidem, validiert an
echtem Material.

---

## ADR-005 — Umplanung als Vorschlag, nie automatisch
**2026-07-20 · angenommen**

**Kontext:** Recherche zu gescheiterten Lernplanern zeigt: starre Pläne und
bevormundende Werkzeuge werden nach wenigen Tagen nicht mehr geöffnet.

**Entscheidung:** Die App berechnet bei Verzug automatisch neu, **wendet aber
nichts ohne Bestätigung an**. Änderungen werden als Diff angezeigt. Die vorige
Fassung bleibt in `plan_versions` erhalten.

**Begründung:** Ein Plan, der sich über Nacht unangekündigt ändert, zerstört das
Vertrauen in die App. Der Mittelweg zwischen vollautomatischer Umplanung und
rein manueller Pflege.

---

## ADR-006 — Einseitiger Kalenderexport
**2026-07-20 · angenommen**

**Entscheidung:** Lernblöcke werden in einen eigenen Kalender exportiert. Kein
Rückkanal.

**Begründung:** Zwei-Wege-Synchronisierung mit Kalendern ist eine bekannte
Fehlerquelle (Duplikate, Löschkonflikte, Zeitzonen) und bringt hier wenig — die
App bleibt die Wahrheit über den Plan.

---

## ADR-007 — KI-Budget: Benachrichtigung statt Sperre, nutzerdefiniertes Limit
**2026-07-20 · angenommen**

**Kontext:** ADR-002 geht von Kosten unter 1 €/Monat aus, das bestätigte
Budget liegt bei 10–15 €/Monat. Trotzdem soll die App den Nutzer nicht
unbemerkt Kosten verursachen lassen — aber auch nicht mitten in der
Prüfungsvorbereitung blockieren, nur weil ein selbstgesetztes Limit
erreicht ist.

**Entscheidung:** Jeder Nutzer legt sein eigenes monatliches KI-Budget in
den Einstellungen fest (lokal, kein Abgleich zwischen den beiden Nutzern —
passt zu ADR-003). Beim Überschreiten wird **benachrichtigt, nicht
gesperrt**: Die App zeigt eine Meldung („Du hast diesen Monat 5 € für
KI-Anfragen ausgegeben"), lässt aber weitere Anfragen zu. Die
Benachrichtigung wiederholt sich bei jedem weiteren erreichten Vielfachen
des Limits (5 €, 10 €, 15 €, …) — nicht nur einmalig — und setzt sich mit
jedem neuen Kalendermonat zurück.

**Begründung:**
- Ein hartes Limit würde die App mitten in der Prüfungsvorbereitung
  funktionsunfähig machen — derselbe bevormundende Mechanismus, den
  ADR-005 für die Umplanung schon ausschließt
- Bei tatsächlichen Kosten unter 1 €/Monat (ADR-002) ist eine Sperre
  ohnehin unverhältnismäßig; eine Benachrichtigung reicht als Kontrolle
- Zwei Nutzer mit unterschiedlichem Kostenbewusstsein — ein festes,
  zentral vorgegebenes Limit würde nicht für beide passen

**Folge für das Datenmodell:** Neue Tabelle `ai_usage` protokolliert jeden
KI-Aufruf mit Kosten (Migration `0002_ai_usage.sql`, siehe DATA_MODEL.md).
Das Limit selbst liegt in `settings` (`ai_budget_limit_eur`), ebenso der
zuletzt benachrichtigte Monat/das zuletzt benachrichtigte Vielfache
(`ai_budget_last_notified_month`, `ai_budget_last_notified_multiple`) —
verhindert wiederholtes Benachrichtigen bei jedem einzelnen Aufruf zwischen
zwei Schwellenwerten. Die Monatssumme wird aus `ai_usage` berechnet, nicht
separat gespeichert (siehe DATA_MODEL.md „Abgeleitete Werte").

**Noch nicht umgesetzt:** Die tatsächliche Benachrichtigung braucht die
`ai/`- und `platform/`-Schicht, die es beide noch nicht gibt (kommt mit der
KI-Anbindung bzw. Phase 3 „Lokale Benachrichtigungen"). Diese Entscheidung
legt nur Verhalten und Datenmodell vorab fest, damit später nichts
nachträglich umgebaut werden muss.

---

## ADR-008 — Repository public, Auto-Updater über GitHub Releases
**2026-07-22 · angenommen**

**Kontext:** Mit dem neuen macOS-Design (Sidebar, Liquid Glass, PR #32)
sollte die App erstmals an beide Nutzer verteilt werden, inkl. eines Wegs,
künftige Änderungen ohne manuelles erneutes Herunterladen zu bekommen.
Tauris `tauri-plugin-updater` prüft dafür automatisch einen Release-Endpunkt
(`https://github.com/henrigrimme/Lernplaner/releases/latest/download/latest.json`).

**Problem:** Der Update-Check der App läuft unauthentifiziert im
Hintergrund — er hat keinen GitHub-Login und kann sich nicht als
Collaborator ausweisen. Bei einem privaten Repository sind Release-Assets
aber nur für eingeloggte Browser-Sessions abrufbar, nicht per einfachem
HTTP-Request. Eine Collaborator-Einladung löst das nicht — sie hilft nur
Menschen, die Datei manuell im Browser herunterzuladen, nicht der App
selbst.

**Entscheidung:** Repository auf public gestellt (auf Rückfrage, mit vollem
Bild der Konsequenz entschieden). Signierschlüsselpaar lokal erzeugt
(`~/.tauri/lernplaner-updater.key`, privat, nicht im Repo), öffentlicher
Schlüssel in `tauri.conf.json` (`plugins.updater.pubkey`) hinterlegt. Jedes
`tauri build` mit gesetztem `TAURI_SIGNING_PRIVATE_KEY` erzeugt signierte
Update-Artefakte (`createUpdaterArtifacts: true`), die per GitHub Release
verteilt werden; die App prüft und installiert Updates selbst
(`platform/updater.ts`, `ui/UpdateChecker.tsx`).

**Begründung:**
- Die Alternative (Token fest in die App einbetten, um sich gegenüber
  einem privaten Repo zu authentifizieren) ist bei einer weiterverteilten
  Binärdatei kein echter Schutz — der Token ließe sich aus der App wieder
  auslesen. Bei zwei Nutzern kein sinnvoller Kompromiss.
- Öffentlich wird nur der **Quellcode und die Dokumentation** — private
  Lerninhalte (PDFs, Klausuren, eigene Notizen) waren laut SECURITY.md
  ohnehin nie im Repository (`.gitignore` schließt sie aus), die
  Sichtbarkeitsänderung betrifft sie nicht.
- Ohne diese Änderung bliebe nur der rein manuelle Weg (Zip-Datei bei jeder
  Änderung erneut direkt teilen) — bei aktiver Design-Arbeit mit mehreren
  Iterationsrunden ein wiederkehrender manueller Aufwand für beide Nutzer.

**Bekannte Einschränkung:** Der Signierschlüssel liegt nur lokal
(`~/.tauri/lernplaner-updater.key`) — ohne ihn (oder ein Backup davon)
lassen sich künftige Releases nicht mehr signieren und von bestehenden
Installationen als vertrauenswürdig akzeptieren. Kein Schlüssel-Backup
außerhalb dieses Rechners (passt zu ADR-003 „keine Backups", gilt hier
zusätzlich für den Signierschlüssel selbst).

**Nachtrag (2026-07-23):** Ohne Apple-Developer-ID/Notarisierung zeigt
macOS beim allerersten Öffnen einer heruntergeladenen Version „kann nicht
geöffnet werden" (Gatekeeper-Quarantäne, echter Nutzerbericht vom
Mitnutzer). Auf Rückfrage entschieden: die 99-$/Jahr-Developer-ID bleibt
zurückgestellt (wie schon in ADR-009 für Benachrichtigungen), stattdessen
`scripts/Install.command` (entfernt die Quarantänemarkierung per
Doppelklick, siehe CONTRIBUTING.md „Releases") — betrifft ohnehin nur den
einmaligen Erstinstall pro Person, der Auto-Updater selbst löst kein
Quarantäne-Flag aus (kein Browser-Downloadpfad).

---

## ADR-009 — In-App-Benachrichtigungsbanner statt native macOS-Benachrichtigung
**2026-07-22 · angenommen**

**Kontext:** ADR-007 (KI-Budget) und die ursprüngliche Phase-3-Umsetzung
gingen davon aus, dass `platform/notifications.ts`
(`@tauri-apps/plugin-notification`) echte macOS-Benachrichtigungen
zeigt, sobald der Nutzer die Berechtigung erteilt. An echter Nutzung
entdeckt: macOS' `UNUserNotificationCenter` registriert Apps ohne
richtige Apple-Entwickler-ID-Signatur beim System nicht — bei unserem
ad-hoc-signierten Build (kein Team-Identifier, siehe ADR-008) erscheint
der Berechtigungsdialog nie, egal wie oft die App neu gestartet wird.
`~/Library/Preferences/com.apple.ncprefs.plist` bestätigte: die App war
dort nie registriert.

**Geprüft und verworfen:** ein selbstsigniertes Zertifikat lokal erzeugen
und für Code-Signierung vertrauen. Verworfen aus zwei Gründen: (1) das
Vertrauenswürdig-Machen eines Zertifikats verändert den systemweiten
Vertrauensspeicher — eine Aktion, die bewusst nicht ohne Weiteres
automatisiert werden soll; (2) selbst wenn durchgeführt, prüft macOS'
Benachrichtigungssystem nicht nur lokales Vertrauen, sondern die
Zertifikatskette zurück zu Apple selbst — ein selbstsigniertes Zertifikat
hat diese Kette nie und hätte das Problem sehr wahrscheinlich nicht
gelöst.

**Entscheidung:** Auf Rückfrage (Alternative: 99 $/Jahr Apple Developer
ID, damit abgelehnt) — `ui/NotificationBanner.tsx` (In-App, unabhängig von
jeder nativen Berechtigung) ist der **primäre** Übertragungsweg für
Tagesübersicht/Fälligkeiten, nicht nur ein Fallback. `showNotification`
bleibt als Best-Effort-Zusatz bestehen (zeigt zusätzlich eine echte
System-Benachrichtigung, falls die App je richtig signiert wird), blockt
aber nicht mehr den In-App-Banner, wenn die Berechtigung fehlt — vorher
brach `checkNotifications` bei fehlender Berechtigung komplett ab
(`return []`), wodurch die Information vollständig verloren ging, auch
für die App selbst.

**Folge:** „Push-Benachrichtigung, auch wenn die App geschlossen ist" (wie
ursprünglich gewünscht) ist damit **nicht** erfüllt — der Banner
erscheint nur, wenn die App tatsächlich geöffnet ist. Für echte
System-Push-Benachrichtigungen bräuchte es eine Apple-Entwickler-ID;
diese Entscheidung bleibt bei Bedarf revidierbar.

---

## ADR-010 — Moodle-Anbindung geprüft und abgelehnt
**2026-07-22 · abgelehnt**

**Kontext:** Beide Nutzer verwenden WHU Moodle für alle Kurse (Deadlines,
Klausurtermine inkl. Raum/Uhrzeit/Klausur-Tool-Link, Materialien). Idee:
diese Termine automatisch über Moodles "Mobile-App"-Web-Service-API
abrufen (WHUs offizielle Moodle-App belegt, dass der Dienst grundsätzlich
aktiv ist) — bewusst nur Termine/Links, **keine PDFs** (Umfang von Anfang
an klein gehalten).

**Vor jeder Code-Zeile geprüft** (`scripts/moodle-spike.ts`, seitdem
wieder entfernt): zwei mögliche Zugangswege durchgetestet, beide
gescheitert.

1. **Direkter Token-Abruf** (`login/token.php` mit Nutzername/Passwort,
   `service=moodle_mobile_app`): schlägt mit "Invalid login" fehl — WHU
   nutzt SSO (Microsoft/Office365-Weiterleitung) für den Moodle-Login.
   Moodle prüft das Passwort dabei selbst gar nicht, dieser Zugangsweg
   funktioniert bei SSO-Konten strukturell nie, unabhängig von korrekten
   Zugangsdaten.
2. **Selbstbedienungs-Token** (Einstellungen → "Sicherheitsschlüssel"/
   "Security keys", von manchen Moodle-Installationen auch für
   SSO-Nutzer angeboten): auf WHUs Moodle nicht vorhanden — die
   Preferences-Seite zeigt nur "User account", keinen
   Sicherheitsschlüssel-Abschnitt. WHU hat die Selbstbedienungs-
   Token-Erzeugung für normale Nutzer nicht freigeschaltet.

**Damit bliebe nur:** ein Browser-basierter SSO-Login-Fluss (App öffnet
System-Browser, Nutzer meldet sich über Microsoft an, Moodle leitet über
eine registrierte App-URL mit Token zurück) — genau der Weg, den die
offizielle Moodle-App vermutlich nutzt. Deutlich größerer Umfang als
geplant (Deep-Link-Handling in Tauri, neue Angriffsfläche, Ausgang bei
WHUs konkreter Konfiguration ungewiss, bräuchte einen weiteren
Verifikations-Test, bevor überhaupt Code entsteht).

**Entscheidung:** Nicht umsetzen. Auf Rückfrage, mit vollem Bild der
Konsequenz — passt zur wiederholt geäußerten Priorität: eine stabil
funktionierende App ist wichtiger als ein riskantes neues Feature mit
ungewissem Ausgang. `scripts/moodle-spike.ts` wieder entfernt (war
bewusst als Wegwerf-Skript markiert). Prüfungstermine bleiben manuell in
"Fächer & Themen" → Prüfungen eingetragen, wie vor diesem Versuch.

**Alternative, nicht verfolgt:** WHU-IT direkt fragen, ob ein
persönlicher Web-Service-Token für den eigenen Account freigeschaltet
werden kann — vom Nutzer bewusst nicht gewählt (hängt von WHU ab, Ausgang
und Dauer ungewiss).

**Falls später erneut aufgegriffen:** zuerst klären, ob WHUs Moodle-
Instanz den Browser-SSO-Launch (`admin/tool/mobile/launch.php`) tatsächlich
unterstützt, bevor wieder Code entsteht — derselbe Verifikations-zuerst-
Ansatz wie dieses Mal.

---

## ADR-011 — Claude-API-Anbindung: Keychain-Speicherung via `keyring`-Crate, HTTP via `tauri-plugin-http`
**2026-07-22 · angenommen**

**Kontext:** ADR-002 wurde auf Nutzerwunsch von „zunächst Gemini
Flash-Lite" auf Anthropic/Claude aktualisiert. Für die erste Anbindung
(`ai/`-Schicht, siehe ARCHITECTURE.md) waren zwei technische Fragen offen:
wie der API-Schlüssel sicher in der macOS-Keychain landet (SECURITY.md
versprach das bereits, ohne dass es Code gab), und wie der HTTP-Aufruf aus
dem Tauri-Webview heraus zuverlässig funktioniert.

**Entscheidung:**
- **Keychain:** die Rust-Crate `keyring` (plattformübergreifend, nutzt auf
  macOS die Security-Framework-Keychain) hinter drei schlanken
  Tauri-Commands (`keychain_set_secret`/`_get_secret`/`_delete_secret`,
  `src-tauri/src/lib.rs`), Service-Name `com.henrigrimme.lernplaner`.
  Alternative *Web-Storage/`localStorage`* verworfen — das wäre eine
  Klartext-Datei, kein Keychain-Zugriff, und widerspräche SECURITY.md
  direkt.
- **HTTP:** `@tauri-apps/plugin-http`/`tauri-plugin-http` statt
  Browser-`fetch`. Der Aufruf läuft dadurch über die Rust-Seite statt durch
  die Webview-Same-Origin-Policy — kein Risiko, dass Anthropics API
  CORS-Header für Direktzugriffe aus einem `tauri://`/`http://localhost`-
  Ursprung verweigert. Netzwerk-Scope auf `https://api.anthropic.com/*`
  begrenzt (`src-tauri/capabilities/default.json`), analog zum bereits
  bestehenden `fs`-Scope auf `$CACHE/*`.
- **Modell:** `claude-haiku-4-5` für `refineTopics`/`estimateDifficulty` —
  beide Aufgaben brauchen kein anspruchsvolles Reasoning, und der günstigste
  Claude-Tarif passt zum in ADR-002/ADR-007 angenommenen Kostenrahmen
  (< 1 €/Monat im Planungsbetrieb). Ein Wechsel zu einem stärkeren Modell
  für die spätere Quiz-Generierung bleibt vorgesehen (ADR-002-Folge).

**Begründung:** Beide Bausteine sind reine Infrastrukturentscheidungen ohne
Nutzer-Tradeoff — sie setzen nur bereits getroffene Entscheidungen
(SECURITY.md, ADR-002) tatsächlich um, statt neue Richtungen zu wählen.

**Folge:** `ai_usage`-Protokollierung (ADR-007) ist über
`data/aiUsageRepo.ts` angebunden, aber die eigentliche
Budget-Benachrichtigung im `NotificationBanner` noch nicht verdrahtet —
das bleibt ein späterer Schritt, sobald echte Nutzungsdaten anfallen.

**Nachtrag (2026-07-22, noch am selben Tag):** Die Zahlungseinrichtung für
den Anthropic-API-Zugang funktionierte zunächst nicht. Auf Nutzerwunsch
zusätzlich `src/ai/openaiProvider.ts` (OpenAI Chat Completions,
`gpt-4o-mini`) als zweite `AIProvider`-Implementierung ergänzt — als
Übergangslösung, bis die Claude-Zahlung klappt, nicht als Ersatz der
Entscheidung oben. `ai/index.ts` verwaltet jetzt eine Anbieter-Auswahl
(`getActiveProvider`/`setActiveProvider`, als weiterer Keychain-Eintrag
`ai_active_provider` neben den beiden getrennten API-Key-Einträgen
`anthropic_api_key`/`openai_api_key`) — beide Schlüssel bleiben unabhängig
gespeichert, ein späterer Rückwechsel zu Claude braucht keinen neu
eingegebenen Schlüssel, sofern der Nutzer ihn nicht zwischenzeitlich
löscht. `AiSettings.tsx` hat dafür eine Anbieter-Auswahl (Radiobuttons)
bekommen. HTTP-Capability-Scope erweitert um `https://api.openai.com/*`.

**Nachtrag 2 (2026-07-22, noch am selben Tag):** Modellwahl auf Nutzerwunsch
präzisiert — `claude-sonnet-5` für Anthropic (vorher testweise
`claude-haiku-4-5`), `gpt-5.6-terra` für OpenAI (vorher testweise
`gpt-4o-mini`, exakte ID vom Nutzer bestätigt, da nicht sicher aus dem
eigenen Wissensstand ableitbar). Beide Provider-Preise entsprechend
angepasst (Schätzwerte, siehe Kommentar in den jeweiligen Dateien).

---

## ADR-012 — Quiz-Generierung/Probeklausur-Simulation/Altklausur-Analyse: Belegpflicht, Selbsteinschätzung bei Freitext, Gewichtung als Vorschlag
**2026-07-22 · angenommen**

**Kontext:** Mit einem funktionierenden KI-Zugang (ADR-011) ließen sich die
drei zuvor auf einen KI-Anbieter wartenden Phase-4-Punkte umsetzen:
Quiz-Generierung, Probeklausur-Simulation, Altklausur-Analyse →
automatische Gewichtung (ROADMAP.md). Jeder Punkt brauchte eine
Design-Entscheidung, die nicht aus dem bestehenden Schema/den ADRs
automatisch folgte.

**Entscheidungen:**

1. **Fragen brauchen echten Belegtext, nie freie KI-Erfindung.** `questions.
   source_document_id`/`source_page` sind laut DATA_MODEL.md Pflichtfelder
   („eine generierte Frage ohne Quellenangabe wird verworfen"). Da PDF-
   Rohbytes bewusst nicht persistiert werden (SECURITY.md, `App.tsx`
   „documentBytes"-Kommentar), kann ein Quiz nur aus Themenabschnitten
   erzeugt werden, deren Dokument noch in der laufenden Sitzung im Speicher
   liegt — `ingest/pdf.ts` bekam dafür `extractPageRangeText`, das echten
   Fließtext einer Seitenspanne liefert, der als Kontext an die KI geht.
   Ohne geladenes PDF zeigt `ui/QuizSetup.tsx` den betroffenen
   Themenabschnitt gar nicht erst als wählbar an.
2. **Multiple-Choice wird automatisch bewertet, Freitext durch
   Selbsteinschätzung.** Ein automatischer Textvergleich für freie
   Antworten wäre unzuverlässig (unterschiedliche Formulierung, Abkürzungen
   etc.) — Freitext-Fragen zeigen die Musterantwort und lassen den Nutzer
   selbst „richtig"/„falsch" markieren, exakt wie die bestehenden
   Karteikarten (`ui/FlashcardReview.tsx`). MC-Fragen kodieren die
   Antwortoptionen als Text im `prompt`-Feld (kein eigenes Schema für
   Optionen nötig), `answer` ist der Buchstabe der richtigen Option
   (`domain/quiz.ts` `isMcAnswerCorrect`).
3. **Probeklausur ist kein eigenes Datenmodell, nur ein `quizzes.
   config_json`-Modus.** Der einzige inhaltliche Unterschied zu einem
   normalen Quiz ist eine optionale Prüfungs-Zuordnung, aus der
   `assessment.duration_minutes` einen Countdown in `ui/QuizSession.tsx`
   speist — läuft er ab, wird nur gewarnt, nichts automatisch beendet
   (passt zu ADR-005 „nie automatisch").
4. **Gewichtungsvorschläge aus der Altklausur-Analyse werden nie
   automatisch angewendet und rühren nie ein `manual_override`-Thema an**
   — dieselbe „Vorschlag, nie automatisch"-Leitlinie wie ADR-005, hier
   erstmals auf Themengewichte statt Planänderungen übertragen
   (`domain/examWeighting.ts`, `ui/AltklausurAnalysis.tsx` zeigt einen
   Diff wie `ui/ReplanView.tsx`). Schwelle bewusst konservativ (mindestens
   drei erkannte Fragen zu einem Thema, bevor eine Anhebung vorgeschlagen
   wird) — eine einzelne KI-Fehlklassifikation soll kein Gewicht ändern.
   Ein Thema ohne Treffer wird nie abgewertet: Abwesenheit in den
   analysierten Altklausuren ist kein Beleg für Unwichtigkeit, es könnte
   in noch nicht importierten Altklausuren vorkommen.
5. **Dokumenttyp jetzt beim Import wählbar.** Vorher hart auf `'folien'`
   codiert (`App.tsx` `importPdfs`) — ohne eine Möglichkeit, ein Dokument
   als `altklausur` zu kennzeichnen, hätte die Altklausur-Analyse nie
   Material gefunden. Einfaches `<select>` vor dem Datei-Upload, Default
   bleibt `folien` (der häufigste Fall).

**Begründung:** Alle fünf Punkte vermeiden, dass eine KI-Ausgabe unbelegt
oder unwiderruflich in die Datenbank fließt — konsistent mit der
bestehenden Linie des Projekts (ADR-005 für Pläne, `manual_override` für
Themen, `source_document_id`/`source_page`-Pflicht für Fragen).

**Neue Dateien:** `domain/quiz.ts`, `domain/examWeighting.ts` (beide mit
Tests, `tests/domain/quiz.test.ts`/`examWeighting.test.ts`),
`data/quizzesRepo.ts`/`questionsRepo.ts`/`answersRepo.ts`,
`ui/QuizSetup.tsx`/`QuizSession.tsx`/`AltklausurAnalysis.tsx`. Neuer
Navigationspunkt „Quiz" in `App.tsx`.

---

## ADR-013 — Keychain-Fix (`apple-native`-Feature), Materialien überstehen jetzt einen Neustart, eigene Dokumentkategorien
**2026-07-22 · angenommen**

**Kontext:** Drei vom Nutzer gemeldete Probleme/Wünsche nach dem Testen von
v0.10.0.

**1. Bugfix: gespeicherte API-Schlüssel verschwanden beim Verlassen der
Einstellungen.** Ursache gefunden: `keyring = "3"` in `Cargo.toml` (ADR-011)
wurde ohne Feature-Flag eingebunden. Ohne ein Plattform-Feature (`apple-
native`, `windows-native`, …) fällt die `keyring`-Crate auf ihren **Mock**-
Speicher zurück (`keyring::mock`) — und dieser Mock hält Daten nur *im
jeweiligen `Entry`-Objekt selbst*, nicht in einem geteilten Speicher. Jeder
Tauri-Command (`keychain_set_secret`/`keychain_get_secret`) erzeugt aber
über `Entry::new(...)` ein neues, unabhängiges `Entry` — der Mock hat
deshalb nie tatsächlich etwas gespeichert, unabhängig davon, ob derselbe
App-Prozess weiterlief. `Cargo.lock` bestätigte das: `keyring`s einzige
Abhängigkeiten waren `log`/`zeroize`, kein `security-framework`. Bereits
eingegebene Schlüssel vor diesem Fix sind dadurch nie echt gespeichert
worden und müssen einmalig neu eingegeben werden. **Entscheidung:**
`keyring = { version = "3", features = ["apple-native"] }` — zieht
`security-framework` als echten macOS-Keychain-Backend ein (in `Cargo.lock`
verifiziert).

**2. Materialien überstehen jetzt Neustart/Rechner-Aus** (Nutzerwunsch,
korrigiert eine frühere Annahme aus `App.tsx`/`ui/SourceViewer.tsx`: „PDF-
Bytes bleiben bewusst nicht persistiert" war **kein** SECURITY.md-Verbot,
sondern schlicht noch nicht gebaut — SECURITY.md verbietet nur, PDFs ins
Git-Repository zu committen, nicht, sie lokal auf der eigenen Festplatte
abzulegen). `platform/documentStorage.ts` schreibt importierte PDFs jetzt
unter `$APPDATA/documents/<sha256>.pdf` (`@tauri-apps/plugin-fs`,
`documents.stored_path` trägt ab jetzt diesen echten Pfad statt des
`in-memory://`-Platzhalters). Beim Start lädt `App.tsx` die Bytes aller
bekannten Dokumente von der Festplatte nach — `documentBytes` bleibt
dieselbe In-Memory-Struktur wie zuvor, nur ihre Befüllung kommt jetzt auch
von der Festplatte, nicht nur vom gerade laufenden Import. **Bekannte
Lücke:** vor diesem Fix importierte Dokumente tragen weiterhin den
`in-memory://`-Platzhalter — deren PDF-Bytes wurden nie geschrieben und
sind nicht rückwirkend wiederherstellbar; betroffene Materialien müssen
einmalig neu importiert werden, danach bleiben sie dauerhaft erhalten.

**3. Eigene Dokumentkategorien.** Der Nutzer wollte mehr als die
vordefinierten Kategorien (die es mit `uebung`/`musterloesung`/
`zusammenfassung` bereits gab, ihm aber nicht bewusst war) — konkret eine
frei betextbare Kategorie, die die KI selbst einordnen soll. `documents.
doc_type` bleibt auf die sieben Werte beschränkt (CHECK-Constraint aus
0001_init.sql absichtlich **nicht** angetastet — eine Tabellen-Neuanlage
zur CHECK-Änderung hätte das Risiko getragen, die `topic_sections`/
`questions`-Fremdschlüssel auf `documents` durcheinanderzubringen, siehe
SQLite-Falle bei `ALTER TABLE RENAME` und automatisch mit-umgeschriebenen
Fremdschlüsseldefinitionen in anderen Tabellen). Stattdessen rein additiv:
Migration `0003_document_type_label.sql` fügt `doc_type_label TEXT`
hinzu, gesetzt nur bei `doc_type = 'sonstiges'`. Der Import-Dialog zeigt
bei „Sonstiges" ein Freitextfeld plus `<datalist>` mit bereits verwendeten
eigenen Bezeichnungen (fühlt sich wie ein selbst hinzugefügter Reiter an,
ohne dass jede neue Bezeichnung eine Schema-Änderung bräuchte).

**Begründung:** Alle drei Punkte vermeiden riskante Eingriffe (Tabellen-
Neuanlage, Migration bestehender Binärdaten) zugunsten additiver,
risikoarmer Lösungen — konsistent mit der Projektlinie „Ab 1. September
nur noch additive Änderungen" (CONTRIBUTING.md), hier schon vor diesem
Datum freiwillig angewendet.

---

## ADR-014 — Automatische Dokumenttyp-Erkennung aus dem Dateinamen (kein KI-Aufruf), nachträglich korrigierbar
**2026-07-22 · angenommen**

**Kontext:** Analyse einer echten Materialsammlung (siehe CONTEXT.md
„Analyse: Beispiel-PDFs") zeigte, dass Dateinamen/Ordnernamen bei WHU-
Kursmaterial fast immer eindeutige Signale für den Dokumenttyp enthalten
(„Alte Klausuren", „…_solutions.pdf", „Zusammenfassung …", „Mock Exam").
Der Nutzer wollte eine automatische Erkennung, aber ausdrücklich mit
Korrekturmöglichkeit, falls sie danebenliegt.

**Entscheidung:**
- `ingest/docType.ts` (`inferDocType`) errät den Typ **aus dem Dateinamen
  per Muster-Suche, ohne KI-Aufruf** — bei den gesichteten echten
  Namen reicht das fast immer, ein KI-Aufruf wäre langsamer und würde
  Kosten verursachen (ADR-007), ohne spürbar treffsicherer zu sein.
  Reihenfolge der Muster ist Absicht: Altklausur/Musterlösung/
  Zusammenfassung vor Übung, damit z. B. „…_exercise_solutions.pdf"
  richtig als Musterlösung erkannt wird (enthält auch „exercise").
- Die Vermutung überschreibt die Dropdown-Auswahl in `App.tsx` **nur**,
  solange sie noch auf dem Default `folien` steht — eine bewusst
  getroffene Auswahl geht nie verloren.
- **Nachträglich korrigierbar:** `ui/DocumentList.tsx` (neu) zeigt
  importierte Dokumente je Fach mit editierbarem Typ,
  `documentsRepo.updateDocumentType` (neu) — bewusste Ausnahme von der
  bisherigen „`documents` nur Insert/Select"-Regel, weil eine falsche
  automatische Vermutung sonst nur per Neu-Import zu beheben wäre.

**Begründung:** Passt zum Grundsatz, KI nur einzusetzen, wo sie einen
echten Mehrwert über einfachere Mittel bringt (hier: Mustererkennung im
Dateinamen reicht) — und zur wiederkehrenden Projektlinie, automatisierte
Vorschläge korrigierbar/widerrufbar zu halten (ADR-005, ADR-012).

**Nebenbei gefixt:** OpenAI-Aufrufe mit `gpt-5.6-terra` schlugen mit
„Unsupported parameter: 'max_tokens'" fehl — `max_completion_tokens`
ist der von neueren OpenAI-Modellen verlangte Nachfolgeparameter
(`src/ai/openaiProvider.ts`).

---

## ADR-015 — Zusammenfassungen: KI liest Volltext statt Folien-Kapitelerkennung; kein Bestätigungsdialog vor KI-Übertragung
**2026-07-22 · angenommen**

**Kontext:** Vertiefte Prüfung mehrerer echter „Zusammenfassung"-Dokumente
(handschriftliche Notizen, eine reine Frage-Antwort-Liste ganz ohne
Überschriften, mehrseitige Dokumente mit farbigen Abschnittsbalken) ergab:
Zusammenfassungen sind von Studierenden selbst geschrieben, jede anders
aufgebaut. Eine Erkennung über Formatierung (Schriftgröße, Farbe,
wiederkehrende Kopfzeilen — wie bei Folien in `ingest/chapters.ts`) reicht
nicht: manche Dokumente haben gar keine visuelle Gliederung, die
Zugehörigkeit einer Frage zu einem Thema ergibt sich rein inhaltlich.

**Entscheidung:**
- **Zweiter Einlesepfad statt Erweiterung der bestehenden Kapitelerkennung.**
  Bei `doc_type = 'zusammenfassung'` wird nicht `ingest/chapters.ts`
  aufgerufen, sondern der komplette Seitentext (`ingest/pdf.ts`
  `readPages`) mit Seitenzahl-Markern an die KI geschickt
  (`AIProvider.detectTopicsFromText`, `data/importTopics.ts`
  `persistAiDetectedDocument`). Der Prompt weist die KI ausdrücklich an,
  sich **nicht auf Formatierung zu verlassen**, sondern inhaltlich zu
  gruppieren — genau der Punkt, den der Nutzer nach eigener Durchsicht
  des Materials einbrachte.
- **Themen ohne Hierarchie**, wie bei der Folien-Kapitelerkennung auch
  (`persistExtractedDocument`) — keine neue Einschränkung.
  `topic_sections.slide_count` ist immer 0: der Folien-Zuschlag in der
  Aufwandsschätzung (ADR-004) gilt Diagrammen/Grafiken auf Folien, nicht
  Fließtext-Seiten.
- **Kein gesonderter Bestätigungsdialog vor der KI-Übertragung**
  (Rückfrage, siehe auch die Korrektur in SECURITY.md „Was an externe
  Dienste übertragen wird"): der Nutzer löst die Übertragung durch die
  eigene Auswahl des Dokuments beim Import ohnehin bewusst aus, ein
  zusätzlicher Dialog wäre reine Reibung ohne echten Zugewinn.

**Bekannte Grenze, nicht behoben:** handschriftliche/gescannte Notizen
(z. B. per Tablet-App exportierte Mitschriften) enthalten zwar oft eine
Text-Ebene, diese ist aber häufig grob fehlerhaft und in falscher
Lesereihenfolge (Handschrift-OCR der Notiz-App, nicht linear angeordnet)
— an echtem Material geprüft (`pdftotext` lieferte sinnentstellte,
durcheinandergewürfelte Wortfetzen). Für solches Material bräuchte es
echte Bilderkennung/OCR, was ROADMAP.md „Später / offen" bereits als
eigenen, noch nicht terminierten Punkt führt („OCR, Handschrift") — hier
bewusst nicht mitgelöst.

---

## ADR-016 — Drei Ursachen für „PDF-/Ordner-Import funktioniert nicht" (Worker, ArrayBuffer, `webkitdirectory`)
**2026-07-22 · angenommen**

**Kontext:** Erster echter Nutzerbericht zum Import, nachdem die Funktion
seit Phase 1 nie im tatsächlich gebauten `.app` (nur im Dev-Server bzw. via
Node-Skripten) end-to-end getestet worden war. Drei unabhängige, sich
gegenseitig verdeckende Ursachen, jede erst sichtbar, nachdem die vorige
behoben war:

1. **pdf.js-Worker lädt in Tauri-Produktionsbuilds auf macOS manchmal
   nicht** (bekannter, bei Tauri selbst noch offener Bug,
   `tauri-apps/tauri#9975`) — der verschachtelte Modul-Import des Workers
   bekommt über Tauris Asset-Protokoll gelegentlich `index.html` statt der
   echten Datei zurück, `getDocument()` hängt lautlos. **Entscheidung:**
   Worker-Skript per `fetch` laden (funktioniert zuverlässig, derselbe Weg
   wie das Haupt-Bundle) und über eine `Blob`-URL bereitstellen
   (`ingest/pdf.ts` `configureWorker`), statt pdf.js den betroffenen Pfad
   selbst auflösen zu lassen.
2. **ArrayBuffer wird nach der Worker-Übergabe „detached"** — pdf.js
   überträgt den Buffer als `Transferable`, jeder weitere Lesezugriff auf
   das Original (Prüfsumme, Speichern, spätere Seiten beim Anzeigen)
   scheitert danach. **Entscheidung:** `data.slice()` statt `data` an
   `pdfjs.getDocument()` übergeben — eine unabhängige Kopie, die pdf.js
   „verbrauchen" darf.
3. **`<input type="file" webkitdirectory">` ist in WKWebView (Tauris
   macOS-Webview) unzuverlässig** — der „Auswählen"-Button im
   Systemdialog kann beim Navigieren in einen Ordner deaktiviert bleiben,
   unabhängig von den ersten beiden Ursachen. **Entscheidung:** Ordner-
   Import komplett auf native Mechanismen umgestellt
   (`@tauri-apps/plugin-dialog`s `open({directory: true})` +
   `@tauri-apps/plugin-fs`s `readDir`/`readFile`, selbst geschriebene
   Rekursion, `platform/folderImport.ts`) statt einen Workaround für die
   Browser-API zu suchen. Neue Berechtigung `fs:allow-read-file`/
   `-read-dir`/`-exists` auf `$HOME/**` (SECURITY.md dokumentiert, reiner
   Lesezugriff, nur nach bewusster Nutzeraktion).

**Begründung für „Fix statt Workaround" bei Punkt 3:** ein Workaround für
die Browser-API (z. B. wiederholtes Öffnen des Dialogs, Nutzerhinweise)
hätte das eigentliche Problem nicht gelöst und wäre bei jeder zukünftigen
WKWebView-Version erneut ein Risiko gewesen. Der native Weg ist außerdem
konsistent mit `platform/documentStorage.ts`, das bereits echte
Tauri-Dateisystem-APIs für `$APPDATA/documents` nutzt.

**Zusätzlich, unabhängig von den drei Ursachen:** Import-Fehler landen
jetzt sichtbar in der App (`App.tsx` `importError`/`importInfo`-States,
`role="alert"`/`role="status"`) statt nur in `console.error` — in einem
Release-Build ohnehin unsichtbar, da `tauri_plugin_log` nur im
Debug-Build aktiv ist. Macht künftige Import-Fehler sofort
diagnostizierbar, unabhängig vom Grund. Der Ordner-Import meldet außerdem
sichtbar, welche Dateien mangels PDF-Unterstützung übersprungen wurden
(direkt aus einem Nutzerbericht mit `.docx`/`.xlsx`/`.pptx`-Dateien
entstanden, siehe CONTEXT.md „Nachtsitzung").

**Lehre für künftige Sitzungen:** jede Funktion, die sich zwischen „Node-
Skript", „Vite-Dev-Server" und „das tatsächlich gebaute Tauri-Fenster"
unterschiedlich verhält, hat genau diesen blinden Fleck — weder die
Vitest-Suite noch die Dev-Server-Playwright-Checks dieses Projekts können
Fehler in Asset-Protokoll-Auflösung, IPC-Eigenheiten oder Worker-/Modul-
Laden im Produktionsbuild fangen. Bei „funktioniert bei mir nicht"-
Berichten diese Kategorie zuerst prüfen, nicht nur die Fachlogik.

**Noch nicht vom Nutzer im echten Fenster bestätigt** — siehe CONTEXT.md
„Braucht Nutzer-Bestätigung".

---

## ADR-017 — Prüfungsformat-Mehrfachauswahl ohne Schema-Umbau; Kurssprache; wählbare Farbpaletten
**2026-07-22 · angenommen**

**Prüfungsformat-Mehrfachauswahl:** `assessments.format` bleibt eine
einzelne Spalte (`AssessmentFormat`-Enum unverändert). `AssessmentSetup.tsx`
zeigt Checkboxen statt eines Einzel-Dropdowns; bei genau einer Auswahl wird
sie direkt gespeichert, bei mehreren `'mixed'` — ein bereits bestehender
Wert, dessen Multiplikator (`EXAM_FORMAT_MULTIPLIER.mixed`,
`domain/estimation.ts`) den Fall „mehrere Formate" schon abdeckt.
**Begründung:** ein echtes Array (neue Spalte oder Join-Tabelle) hätte auch
`domain/estimation.ts`s Kalibrierung anfassen müssen, ohne dass eine
feinere Unterscheidung („nur Rechnen + Essay" vs. „nur MC + Freitext") für
die grobe Aufwandsschätzung tatsächlich etwas gebracht hätte.
**Konsequenz:** eine `'mixed'`-Prüfung lässt sich beim Bearbeiten nicht in
ihre ursprünglichen Einzelformate zurückübersetzen (Checkboxen starten
leer) — kein Datenverlust, nur keine Rekonstruktion, im Code dokumentiert.

**Kurssprache:** neue Spalte `courses.language` (`'de'`/`'en'`, Migration
0004, Default `'de'`) steuert ausschließlich die Sprache KI-generierter
Inhalte für dieses Fach (Quiz, Zusammenfassungs-Erkennung,
Altklausur-Analyse) — die App-Oberfläche selbst (Menüs, Planung, Kalender)
bleibt unabhängig davon immer Deutsch. Kein allgemeines
Internationalisierungs-Feature, sondern ein reiner Prompt-Parameter.

**Wählbare Farbpaletten:** Terrakotta bleibt Standard, dazu vier
kuratierte Alternativen (British Racing Green, NATO Olive, Petrol,
Bordeaux) über `data-palette` auf `<html>`. **Bewusst überschreiben die
Paletten nur `--color-primary`/`-hover`/`-ink`**, nicht die warmen
Papier-/Sand-Neutralfarben oder den sekundären Petrol-Akzent — die sind
laut DESIGN.md „One Accent Rule" die eigentliche Markenidentität der App,
nicht die Akzentfarbe selbst. Ebenfalls bewusst: keine separaten
Palettenwerte für Hell/Dunkel (anders als `data-theme`) — der
Pflegeaufwand einer zweiten Wertetabelle pro Palette stand in keinem
Verhältnis zum Nutzen; im Test (Dunkel + NATO Olive) blieb die Lesbarkeit
gut.

---

## ADR-018 — Word/PowerPoint/Excel/Markdown-Import: deterministische Struktur statt KI, `mammoth`/`jszip`/`fast-xml-parser`
**2026-07-23 · angenommen**

**Kontext:** Nutzerwunsch, mehr Dateiformate als PDF importieren zu
können — löst die bisher bestätigte Einschränkung „nur PDF" (Abschnitt 3).
In der Nachtsitzung 22.→23.07. war das bewusst zurückgestellt worden, mit
zwei offenen Fragen: reicht „Text lesbar machen" oder wird eine echte
Themenerkennung wie bei PDF erwartet, und zählen CSV/HTML als
Lernmaterial? Auf Rückfrage: **echte, aber deterministische
Themenerkennung** (keine KI) — jedes Format hat tatsächlich ein eigenes,
zuverlässiges Struktursignal, das keinen KI-Aufruf braucht.

**Entscheidung, je Format:**
- **Word (.docx):** `mammoth` wandelt die docx-Struktur in HTML, echte
  Word-„Überschrift"-Formatvorlagen werden zu `<h1>`–`<h6>` — dieselbe
  Erkennung, die Word selbst fürs Inhaltsverzeichnis nutzt
  (`ingest/docx.ts`). Überschriften ohne echte Formatvorlage (nur fett/
  groß) werden nicht erkannt — bekannte, dokumentierte Grenze, kein
  Absturz (Rückfall auf Dateiname wie bei PDF ohne Struktursignal).
- **PowerPoint (.pptx):** eine echte Folie markiert ihren Titel-
  Platzhalter explizit (`<p:ph type="title"/>`) — zuverlässiger als PDFs
  Schriftgrößen-/Positionsvergleich, das Format sagt es direkt
  (`ingest/pptx.ts`). Trennfolien-Erkennung wiederverwendet
  `ingest/chapters.ts`s bereits validierte Logik (`detectChaptersFromSlides`,
  neu exportiert) — dieselbe Money-&-Banking-Konvention, nur ohne den
  PDF-exklusiven Untertitel-Weg (braucht Positionsdaten, die es bei
  PowerPoint-Text-Extraktion so nicht gibt). **Keine
  Animationsschritt-Aufblähung** (ADR-004) — eine `.pptx`-Datei speichert
  Animationen als Metadaten, nicht als wiederholte Folienkopien, jede
  `<p:sld>` ist bereits eine vollständige Folie.
- **Excel (.xlsx):** jedes Tabellenblatt wird zu einem eigenen Kapitel,
  benannt nach dem Blattnamen (`ingest/xlsx.ts`) — die deutlichste
  denkbare Struktur, keine eigene Heuristik nötig.
- **Markdown (.md/.markdown):** `#`/`##`/… sind ein ebenso explizites
  Signal wie Word-Überschriften, nur ohne den Umweg über HTML
  (`ingest/markdown.ts`).
- **Word und Markdown teilen sich eine Kapitel-Konstruktion**
  (`ingest/headingStructure.ts` `chaptersFromHeadingSections`): die
  flachste im Dokument vorkommende Überschriftsebene markiert eine
  Kapitelgrenze, tiefere Ebenen werden zu Folien innerhalb des Kapitels —
  Text vor der ersten Kapitel-Ebene-Überschrift fällt auf den Dateinamen
  zurück, dieselbe Konvention wie bei PDF ohne erkennbares Signal.
- **Bewusst NICHT dabei: CSV/HTML.** Reine Datendateien im gesichteten
  Material (z. B. eine SQL-Workshop-CSV, siehe CONTEXT.md
  „Nachtsitzung"), kein Lernmaterial im bisher beobachteten Sinn.

**Warum keine KI (Alternative, verworfen):** Der ADR-015-Weg
(„Zusammenfassungen": KI liest Volltext, gruppiert inhaltlich) hätte für
jedes importierte Word-/PowerPoint-/Excel-/Markdown-Dokument einen
KI-Aufruf gebraucht (Kosten, Sprachwahl, ADR-007) und einen konfigurierten
Anbieter vorausgesetzt — der PDF-Import ist dagegen komplett kostenlos
und funktioniert ohne API-Schlüssel. Da jedes der vier Formate ein
mindestens so explizites Struktursignal trägt wie eine PDF-Folie (echte
Formatvorlagen, echte Titel-Platzhalter, echte Tabellenblätter, echte
Überschriften), bringt eine KI-Klassifikation hier keinen Mehrwert, der
den Aufwand/die Kosten rechtfertigen würde — dieselbe Abwägung wie bei
ADR-014 (Dokumenttyp-Erkennung ohne KI).

**Neue Abhängigkeiten** (nach der am 23.07.2026 pauschal erweiterten
Freigabe, siehe CONTEXT.md „Freigaben"): `mammoth` (keine eigenen
Laufzeit-Abhängigkeiten, wie schon `ts-fsrs`), `jszip` + `fast-xml-parser`
für `.pptx`/`.xlsx` (beide ZIP-Archive aus XML-Teilen, OOXML). **Bewusst
NICHT** das npm-Paket `xlsx` (SheetJS) — die auf npm veröffentlichte
Version (0.18.5) trägt zwei unbehobene, hoch eingestufte CVEs
(Prototype Pollution, ReDoS); SheetJS pflegt seit Version 0.20 nur noch
über die eigene CDN weiter, nicht mehr über npm. Auch `exceljs` (Alternative,
kurz geprüft) verworfen — 69 transitive Pakete für eine reine
Text-Extraktionsaufgabe, plus eine moderate CVE über eine veraltete
`uuid`-Abhängigkeit. Stattdessen `.xlsx` wie `.pptx` selbst über
`jszip`/`fast-xml-parser` gelesen — dieselbe Technik, ein Format weniger
zu pflegen als eine dritte, dedizierte Bibliothek. `npm audit` bestätigt:
keine neue Schwachstelle durch `mammoth`/`jszip`/`fast-xml-parser`, nur
die bereits vorbestehenden (vite/vitest-Toolchain, siehe CONTEXT.md
Abschnitt 8).

**Browser- vs. Node-Eingang bei `mammoth` — Bugfix während der
Entwicklung:** `mammoth`s Node-Paket (was `import mammoth from
'mammoth'` unter Vitest/`tsx`-Skripten auflöst) akzeptiert nur `{path}`/
`{buffer}` als Eingang, wirft mit `{arrayBuffer}` „Could not find file in
options" — `{arrayBuffer}` ist ausschließlich der Browser-Eingang, auf den
Vite über `mammoth`s `package.json`-„browser"-Feld automatisch umschaltet
(bestätigt: `npm run build` bündelt keine `fs`/`Buffer`-Referenzen aus
`mammoth` ins Browser-Bundle). `ingest/docx.ts` `convertDocxToHtml`
verzweigt deshalb über denselben `typeof window`-Guard wie der
pdf.js-Worker in `ingest/pdf.ts`, nur umgekehrt (dort ist `arrayBuffer`
der browserfreie Node-Fallback, hier der Browser-Weg).

**Wiederverwendung statt Neuerfindung:** `ingest/chapters.ts`s
„Trennfolie → Dateiname → kein Signal"-Fallback wurde als
`detectChaptersFromSlides` exportiert (vorher nur intern in
`detectChapters` verkettet) — `ingest/pptx.ts` nutzt exakt dieselbe,
bereits an echtem PDF-Material validierte Logik, statt sie für
PowerPoint-Trennfolien zu duplizieren. `chapterNameFromFilename`s
Endungsliste wurde um `.docx`/`.pptx`/`.md`/`.markdown` erweitert
(vorher nur `.pdf`).

**Nicht Teil dieser Entscheidung:** ein PDF-Viewer-Äquivalent für die
neuen Formate (`ui/SourceViewer.tsx` zeigt für Nicht-PDF-Dokumente einen
Hinweis statt eines Absturzversuchs in `ui/PdfViewer.tsx`, das weiterhin
nur echte PDF-Bytes versteht) — „Markieren im Dokument → Karteikarte"
(ROADMAP.md Phase 4) bleibt für diese vier Formate vorerst nicht
verfügbar, kein Rückschritt, nur (noch) nicht gebaut.

**Bekannte Lücke:** kein Plausibilitätscheck an echtem, in Word/
PowerPoint/Excel erzeugtem Material (anders als bei PDF, `Beispiel
pdfs/`) — die Tests bauen minimale, gültige OOXML-Dateien selbst
(`tests/ingest/docx.test.ts`/`pptx.test.ts`/`xlsx.test.ts`, `jszip`
direkt im Test). Sollte der Nutzer echtes Material dieser Formate
importieren, ist eine erste echte Rückmeldung besonders wertvoll —
nächste Sitzung danach fragen.

---

## ADR-019 — Wiederkehrende Tages-Blocker: eigene Tabelle, Vereinigungsmenge statt Summe
**2026-07-23 · angenommen**

**Kontext:** Nutzerwunsch vom 22.07.2026 (damals zugunsten des Import-Bugs
zurückgestellt, siehe ROADMAP.md „Später/offen"): feste, an einen
Wochentag gebundene Zeitfenster (Mittagspause, Abendessen, Gym) sollen
automatisch von der verfügbaren Lernzeit abgezogen werden, ohne dass der
Nutzer sie für jede einzelne Woche der Vorbereitungszeit (bis zu 4
Wochen, CONTEXT.md „Nutzer") von Hand als `blockers`-Eintrag anlegen
muss.

**Entscheidung:**
1. **Neue Tabelle `recurring_blockers`** (`weekday`, `starts_at`/`ends_at`
   als reine "HH:MM"-Uhrzeiten, `label`), nicht `blockers` erweitert — die
   Wiederkehr-Semantik (Wochentag + Uhrzeit statt absolutem Datum) ist ein
   grundlegend anderes Datenmodell. CHECK-Constraints über
   `substr`/`CAST` statt eines einfachen GLOB-Musters — ein GLOB wie
   `[0-2][0-9]:[0-5][0-9]` würde ungültige Stunden wie „25" durchlassen
   (jede Ziffer 0-2 gefolgt von jeder Ziffer 0-9 passt formal), erst am
   eigenen Test aufgefallen.
2. **`domain/capacity.ts` rechnet Blocker und wiederkehrende Blocker als
   eine gemeinsame Vereinigungsmenge**, nicht als zwei separate Summen
   (neue Funktion `mergedOverlapMinutes`) — deckt einen latenten Fehler
   in der bestehenden `blockers`-Logik mit auf: zwei sich überschneidende
   Blocker (z. B. eine Vorlesung, die zufällig mit der Mittagspause
   zusammenfällt) hätten ihre gemeinsame Zeit sonst doppelt abgezogen und
   die verfügbare Zeit unterschätzt. Test dafür ergänzt (auch für den
   bereits bestehenden reinen `blockers`-Fall, unabhängig von
   `recurring_blockers`).
3. **Neue Parameter ans Ende gestellt, nicht an ihre „natürliche" Position
   vor bestehenden optionalen Parametern** (`scheduleStudyBlocks`,
   `replan`: `recurringBlockers` nach `options`, nicht davor) — mehrere
   bestehende Aufrufer/Tests übergeben `options` positional als letztes
   Argument; ein dazwischengeschobener Parameter hätte diese Aufrufe
   stillschweigend falsch verdrahtet, statt eines Typfehlers.
   `domain/planBuilder.ts`s `BuildScheduleInput` ist dagegen ein Objekt —
   dort ist `recurringBlockers` ein normales optionales Feld, Reihenfolge
   spielt keine Rolle.
4. **UI in `ui/AvailabilitySetup.tsx` integriert**, nicht als eigene
   Komponente — dieselbe Seite („Verfügbarkeit") behandelt bereits
   Wochenmuster und Ausnahme-Tage, ein dritter eng verwandter Abschnitt
   („Wiederkehrende Blocker") passt inhaltlich dazu.

**Begründung:** Löst das Problem an der Wurzel (Zeitrechnung in
`domain/capacity.ts`), nicht nur oberflächlich in der Terminierung —
sowohl die reine Kapazitätsanzeige (`checkCapacity`) als auch die
tatsächliche Planung (`scheduleStudyBlocks`) und die Neuberechnung
(`replan`) berücksichtigen wiederkehrende Blocker jetzt konsistent.

**Neue Dateien:** `src/data/migrations/0006_recurring_blockers.sql`,
`data/recurringBlockers.ts`/`-Repo.ts`. Geändert: `domain/capacity.ts`
(Vereinigungsmenge, neue Parameter), `domain/scheduling.ts`/
`replanning.ts`/`planBuilder.ts` (Parameter durchgereicht),
`ui/AvailabilitySetup.tsx`/`PlanView.tsx`/`ReplanView.tsx`.

---

## ADR-020 — Quiz-Konfiguration als Schritt-für-Schritt-Assistent, neuer Fragenschwerpunkt-Parameter
**2026-07-23 · angenommen**

**Kontext:** Nutzerwunsch aus der Nachtsitzung (ROADMAP.md „Später/offen"):
„tieferer Quiz-Konfigurationsdialog mit echten Rückfragen, wie bei
Claude" — statt eines einzigen Formulars mit allen Feldern gleichzeitig
sollte die App gezielt nacheinander nachfragen. Zwei konkrete Beispiele
waren schon genannt: „nur Rechenfragen?", „ungefähre Zieldauer?".

**Entscheidung:**
1. **`ui/QuizSetup.tsx` als Fünf-Schritt-Assistent** (Material → Fragen-
   Fokus → Umfang → Art/Schwierigkeit → Zusammenfassung), reiner
   `step`-Zustand in der Komponente — keine neue Geschäftslogik,
   `onGenerate` wird unverändert erst im letzten Schritt aufgerufen.
   „Weiter" bleibt gesperrt, bis ein Schritt sinnvoll abgeschlossen ist
   (Material: mindestens ein Abschnitt gewählt; Art: bei Probeklausur
   eine Prüfung gewählt) — dieselbe „nichts Unfertiges weiterreichen"-
   Haltung wie andere Formulare in der App.
2. **Neuer Parameter `QuestionFocus`** (`gemischt`/`rechnen`/`konzept`,
   `ai/types.ts`) beantwortet die erste im Nachtsitzungs-Wunsch genannte
   Rückfrage direkt — an beide `AIProvider`-Implementierungen
   (`anthropicProvider.ts`/`openaiProvider.ts`) durchgereicht, verändert
   dort die Prompt-Anweisung (`FOCUS_INSTRUCTION`, analog zu bereits
   bestehendem `DIFFICULTY_INSTRUCTION`/`LANGUAGE_INSTRUCTION`). Ans Ende
   der Parameterliste gestellt (nicht dazwischen), der einzige bestehende
   Aufrufer (`App.tsx` `handleGenerateQuiz`) musste dadurch keine anderen
   Argumente umsortieren.
3. **Umfang als Zeit-Voreinstellungen statt einer rohen „Fragen je
   Abschnitt"-Zahl** — beantwortet die zweite genannte Rückfrage
   („ungefähre Zieldauer?"). Drei Presets (Kurz/Mittel/Lang, je mit einer
   Gesamtfragenzahl über alle gewählten Abschnitte) plus „Eigene Anzahl"
   für den bisherigen direkten Zahleneingabe-Fall. Die grobe Umrechnung
   Minuten→Fragen (bewusst grob, erfunden wie andere Konstanten in diesem
   Projekt: `EXAM_FORMAT_MULTIPLIER`, `FEEDBACK_MASTERY_WEIGHT`) steht
   benannt und auffindbar in `SCOPE_PRESETS`, nicht versteckt.

**Begründung:** Löst genau die im Nachtsitzungs-Wunsch benannte Lücke
(„eine echte mehrstufige Rückfrage-Erfahrung … statt eines einzigen
Formulars"), ohne ein neues, KI-getriebenes Konversationsmuster
einzuführen — die eigentliche Frage-Antwort-Sammlung bleibt eine
gewöhnliche React-Zustandsmaschine, kein zusätzlicher KI-Aufruf nur für
die Konfiguration selbst (hätte Kosten/Latenz ohne echten Mehrwert
gebracht, ADR-007).

**Nicht Teil dieser Entscheidung:** die Reihenfolge/Anzahl der Schritte
ist eine erste, plausible Aufteilung, keine an Nutzerverhalten validierte
UX — bei Bedarf in einer künftigen Sitzung nachjustierbar, ohne dass die
zugrundeliegenden Daten (`GenerateQuizInput`) sich ändern müssten.

**Neue/geänderte Dateien:** `ai/types.ts` (`QuestionFocus`),
`ai/anthropicProvider.ts`/`openaiProvider.ts` (`FOCUS_INSTRUCTION`,
Parameter), `ui/QuizSetup.tsx` (vollständig zum Assistenten umgebaut),
`App.tsx` (`handleGenerateQuiz` reicht `input.focus` durch).
