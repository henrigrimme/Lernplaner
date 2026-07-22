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
