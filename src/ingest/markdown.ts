import { chaptersFromHeadingSections, genericDiagnostics } from './headingStructure'
import { uniqueCharCount } from './slides'
import type { HeadingSection } from './headingStructure'
import type { ExtractedDocument } from './types'

/**
 * Markdown-Import (Nutzerwunsch 2026-07-22: „mehr Spielraum bei
 * akzeptierten Dokumenten"). Deterministisch wie der PDF-Import, keine
 * KI nötig — `#`/`##`/… sind ein ebenso explizites Struktursignal wie
 * Word-Überschriften (siehe `docx.ts`), nur ohne den Umweg über HTML.
 */
const HEADING_LINE = /^(#{1,6})\s+(.+?)$/

/**
 * Zerlegt Markdown-Text in Überschriftsabschnitte. Text vor der ersten
 * Überschrift (falls vorhanden) bekommt `level: 0` — siehe
 * `headingStructure.ts` `chaptersFromHeadingSections` für die
 * Kapitelzuordnung dieses Sonderfalls.
 */
export function parseMarkdownSections(text: string): HeadingSection[] {
  const lines = text.split(/\r?\n/)
  const sections: HeadingSection[] = [{ level: 0, title: '', bodyLines: [] }]

  for (const line of lines) {
    const match = HEADING_LINE.exec(line)
    if (match) {
      // Optionale schließende "##" am Ende einer ATX-Überschrift entfernen
      // ("## Titel ##" -> "Titel") — CommonMark erlaubt diese Schreibweise.
      const title = match[2]!.replace(/\s+#+\s*$/, '').trim()
      sections.push({ level: match[1]!.length, title, bodyLines: [] })
    } else {
      sections[sections.length - 1]!.bodyLines.push(line)
    }
  }

  return sections
}

export async function extractMarkdownDocument(text: string, filename: string): Promise<ExtractedDocument> {
  const sections = parseMarkdownSections(text)
  const { chapters, slides } = chaptersFromHeadingSections(sections, filename)

  return {
    filename,
    // Kein PDF, keine echten "Seiten" — Anzahl erkannter Abschnitte als
    // grobes Größenmaß, konsistent mit `docx.ts`/`pptx.ts`.
    pdfPages: slides.length,
    slideCount: slides.filter((s) => !s.isDivider).length,
    uniqueChars: uniqueCharCount(slides),
    chapters,
    slides,
    diagnostics: genericDiagnostics(slides),
  }
}
