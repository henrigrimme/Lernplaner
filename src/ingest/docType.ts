import type { DocumentType } from '../data/schema'

/** Anzeigetexte für `DocumentType` — geteilt zwischen Import-Auswahl (`App.tsx`) und Korrektur-Liste (`ui/DocumentList.tsx`). */
export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'folien', label: 'Vorlesungsfolien' },
  { value: 'skript', label: 'Skript' },
  { value: 'uebung', label: 'Übungsblatt' },
  { value: 'altklausur', label: 'Altklausur' },
  { value: 'musterloesung', label: 'Musterlösung' },
  { value: 'zusammenfassung', label: 'Zusammenfassung' },
  { value: 'sonstiges', label: 'Sonstiges (eigene Bezeichnung)' },
]

/**
 * Schlägt einen Dokumenttyp aus dem Dateinamen vor (Nutzerwunsch
 * 2026-07-22, siehe CONTEXT.md „Analyse: Beispiel-PDFs"). Reine Funktion,
 * kein DB-/UI-/KI-Zugriff — bewusst kein KI-Aufruf: der Dateiname allein
 * reicht bei den analysierten echten Materialien fast immer aus, eine
 * Klassifikation per KI wäre langsamer und würde Kosten verursachen, ohne
 * spürbar treffsicherer zu sein.
 *
 * **Nur ein Vorschlag** — `App.tsx` übernimmt ihn nur, solange der Nutzer
 * die Dropdown-Auswahl noch nicht selbst geändert hat (`'folien'` gilt
 * als „noch nicht entschieden", siehe dortigen Kommentar); eine bewusste
 * Auswahl wird nie überschrieben.
 *
 * Reihenfolge der Muster ist bewusst: spezifischere Signale zuerst, damit
 * z. B. „…_exercise_solutions.pdf" als Musterlösung erkannt wird, nicht
 * als Übung (das Wort „exercise" kommt in beiden vor). An echtem Material
 * geprüft (WHU-Kurse: Microeconomics, Money Banking and Financial
 * Markets, Data & Information Management, Entrepreneurial Transformation,
 * Nurturing Customer Relationships).
 */
function classify(text: string): DocumentType | null {
  const t = text.toLowerCase()
  if (/altklausur|old exam|past exam|final exam|exam review|mock exam/.test(t)) return 'altklausur'
  if (/l[oö]sung|solution|answer key/.test(t)) return 'musterloesung'
  if (/zusammenfassung|summary|cheat sheet|revision|key questions/.test(t)) return 'zusammenfassung'
  if (/[uü]bung|exercise|problem set|tutorial|workshop|task/.test(t)) return 'uebung'
  if (/skript|script|lecture notes|handout/.test(t)) return 'skript'
  if (/slide|folie/.test(t)) return 'folien'
  return null
}

/**
 * `folderPath` ist optional (Dateiauswahl-Dialoge liefern meist nur den
 * Dateinamen, keinen Ordnerpfad) — wird geprüft, falls der Dateiname
 * allein nichts ergibt. Ohne jeden Treffer bleibt `'folien'` der
 * Rückfallwert, weil das an echtem Material der häufigste Fall ohne
 * erkennbares Signal im Namen ist (z. B. „02 Consumer Theory 01.pdf").
 */
export function inferDocType(filename: string, folderPath: string[] = []): DocumentType {
  return classify(filename) ?? classify(folderPath.join(' ')) ?? 'folien'
}
