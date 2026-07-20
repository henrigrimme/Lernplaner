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
