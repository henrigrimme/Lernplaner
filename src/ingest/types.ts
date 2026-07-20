/**
 * Typen der Import-Pipeline: PDF → Seiten → Folien → Kapitel.
 *
 * Wichtig ist die Unterscheidung zwischen **Seite** und **Folie**:
 * Vorlesungsfolien werden mit Animationsschritten exportiert, sodass eine
 * einzelne Folie über mehrere PDF-Seiten verteilt sein kann. Nur die Folie
 * ist eine inhaltliche Einheit — die Seitenzahl ist als Umfangsmaß
 * unbrauchbar (siehe ADR-004).
 */

/** Ein Textfragment mit Position und Schriftgröße, wie pdf.js es liefert. */
export interface TextItem {
  text: string
  /** Schriftgröße in PDF-Einheiten. */
  size: number
  /** Grundlinie von unten gemessen. */
  y: number
  /** Linke Kante. */
  x: number
}

/** Eine zu einer Zeile zusammengesetzte Folge von Fragmenten. */
export interface Line {
  text: string
  size: number
  y: number
}

/** Eine einzelne PDF-Seite nach der Textextraktion. */
export interface Page {
  /** 1-basiert, wie im PDF. */
  number: number
  /** Größte Schrift im oberen Seitendrittel — der Folientitel. */
  title: string
  /** Alle Zeilen, von oben nach unten. */
  lines: Line[]
  /** Zeilen ohne Titel und ohne wiederkehrende Kopf-/Fußzeilen. */
  bodyLines: string[]
  width: number
  height: number
}

/**
 * Eine inhaltliche Folie: eine oder mehrere PDF-Seiten, die zusammen einen
 * Animationsaufbau bilden. Die letzte Seite zeigt den vollständigen Inhalt.
 */
export interface Slide {
  /** Seitenzahlen im PDF, aufsteigend. Länge > 1 bedeutet Animationsaufbau. */
  pageNumbers: number[]
  title: string
  /** Inhalt der vollständigsten Seite der Gruppe. */
  bodyLines: string[]
  /** true, wenn es sich um eine Kapitel-Trennfolie handelt. */
  isDivider: boolean
  /** Zeichen des vollständigsten Aufbauschritts. */
  chars: number
}

/** Ein erkanntes Kapitel mit den zugehörigen Folien. */
export interface Chapter {
  title: string
  /** Für den Abgleich normalisiert. */
  normalized: string
  slides: Slide[]
  /** Wie das Kapitel erkannt wurde — für Nachvollziehbarkeit in der UI. */
  source: ChapterSource
}

export type ChapterSource =
  /** Kapitelzeile unter dem Folientitel (z. B. Microeconomics). */
  | 'subtitle'
  /** Nummerierte Trennfolie (z. B. Money & Banking). */
  | 'divider'
  /** Aus dem Dateinamen abgeleitet (z. B. "Session 3"). */
  | 'filename'
  /** Kein Signal gefunden — alles in einem Kapitel. */
  | 'fallback'

/** Ergebnis des Imports eines einzelnen Dokuments. */
export interface ExtractedDocument {
  filename: string
  /** Rohe Seitenzahl des PDFs. */
  pdfPages: number
  /** Echte Folien nach Animationsbereinigung — ohne Trennfolien. */
  slideCount: number
  /**
   * Eindeutiger Textumfang in Zeichen. Basis der Aufwandsschätzung,
   * weil er im Gegensatz zur Seitenzahl über Fächer hinweg stabil ist.
   */
  uniqueChars: number
  chapters: Chapter[]
  slides: Slide[]
  /** Diagnose für die Qualitätsanzeige in der UI. */
  diagnostics: Diagnostics
}

export interface Diagnostics {
  /** Anteil der Seiten mit erkanntem Titel (0–1). */
  titleCoverage: number
  /** Wie viele Folien aus mehreren Seiten zusammengesetzt wurden. */
  buildGroups: number
  /** pdfPages / slideCount — Aufblähung durch Animationsschritte. */
  inflation: number
  dividers: number
  /** Seiten fast ohne Text — vermutlich reine Grafik. */
  sparsePages: number
}
