import mammoth from 'mammoth'
import { chaptersFromHeadingSections, genericDiagnostics } from './headingStructure'
import { uniqueCharCount } from './slides'
import type { HeadingSection } from './headingStructure'
import type { ExtractedDocument } from './types'

/**
 * Word-Import (Nutzerwunsch 2026-07-22: „mehr Spielraum bei akzeptierten
 * Dokumenten"). `mammoth` (npm, keine eigenen Laufzeit-Abhängigkeiten
 * außer sich selbst — `npm ls mammoth` zeigt keine Kindpakete, wie schon
 * bei `ts-fsrs`, siehe ADR zur Spaced Repetition) wandelt die docx-Struktur
 * in HTML um, wobei echte Word-„Überschrift"-Formatvorlagen zu `<h1>`–`<h6>`
 * werden — dieselbe Erkennung, die Word selbst für ein Inhaltsverzeichnis
 * nutzt. `convertToHtml` statt des offiziell als veraltet markierten
 * `convertToMarkdown`: die Überschriftstags lassen sich per einfachem
 * Regex genauso zuverlässig herausziehen, ohne auf eine Deprecated-API zu
 * setzen.
 *
 * **Bekannte Grenze:** Word-Dokumente ohne echte Formatvorlagen (nur fett/
 * groß formatierter Text ohne „Überschrift 1" o. Ä.) liefern keine
 * `<h#>`-Tags — `chaptersFromHeadingSections` fällt dann auf den
 * Dateinamen zurück (ein Kapitel, kein Absturz), analog zu einem PDF ohne
 * erkennbares Struktursignal.
 */

const HEADING_TAG_SOURCE = '<h([1-6])[^>]*>(.*?)</h\\1>'

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Grobe HTML→Text-Umwandlung: Block-Enden werden zu Zeilenumbrüchen, alle übrigen Tags fallen weg. */
function htmlToLines(html: string): string[] {
  const withBreaks = html.replace(/<\/(p|li|tr|div|h[1-6])>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return decodeHtmlEntities(stripped)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Zerlegt Mammoth-HTML in Überschriftsabschnitte, analog `markdown.ts`s
 * `parseMarkdownSections`. Reiner Regex-Ansatz statt eines echten
 * HTML-Parsers — `DOMParser` gibt es unter Vitests Node-Testumgebung für
 * `ingest/` nicht (siehe `vitest.config.ts` `environmentMatchGlobs`), ein
 * volles HTML-Parser-Paket wäre für die hier nötige, einfache Aufgabe
 * (Überschriften finden, Rest als Text lesen) unverhältnismäßig.
 */
export function parseHtmlSections(html: string): HeadingSection[] {
  interface RawSection {
    level: number
    title: string
    bodyHtml: string[]
  }

  const preambleHtml: string[] = []
  const raw: RawSection[] = []
  let current: RawSection | null = null
  let cursor = 0

  const pattern = new RegExp(HEADING_TAG_SOURCE, 'gis')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    const between = html.slice(cursor, match.index)
    ;(current ? current.bodyHtml : preambleHtml).push(between)
    current = { level: Number(match[1]), title: htmlToLines(match[2]!).join(' ').trim(), bodyHtml: [] }
    raw.push(current)
    cursor = pattern.lastIndex
  }
  ;(current ? current.bodyHtml : preambleHtml).push(html.slice(cursor))

  const sections: HeadingSection[] = [{ level: 0, title: '', bodyLines: htmlToLines(preambleHtml.join('')) }]
  for (const r of raw) sections.push({ level: r.level, title: r.title, bodyLines: htmlToLines(r.bodyHtml.join('')) })
  return sections
}

/**
 * mammoths Node-Paket (`lib/index.js`, was `import mammoth from 'mammoth'`
 * unter Vitest/`tsx`-Skripten aus Node-Sicht auflöst) kennt nur `{path}`/
 * `{buffer}` — `{arrayBuffer}` wirft dort „Could not find file in
 * options" (`lib/unzip.js` `openZip`, geprüft am eigenen Quelltext).
 * `{arrayBuffer}` ist ausschließlich der Browser-Eingang (`browser/
 * unzip.js`), auf den Vite/Bundler über das `browser`-Feld in mammoths
 * `package.json` automatisch umschalten — dieselbe zwei-Pfade-Situation
 * wie beim pdf.js-Worker in `ingest/pdf.ts` (`typeof window`-Guard dort),
 * nur umgekehrt: hier ist `arrayBuffer` der Browser-, `buffer` der
 * Node-Weg.
 */
async function convertDocxToHtml(data: Uint8Array): Promise<string> {
  const input = typeof window === 'undefined' ? { buffer: Buffer.from(data) } : { arrayBuffer: data.slice().buffer as ArrayBuffer }
  const { value: html } = await mammoth.convertToHtml(input)
  return html
}

export async function extractDocxDocument(data: Uint8Array, filename: string): Promise<ExtractedDocument> {
  const html = await convertDocxToHtml(data)

  const sections = parseHtmlSections(html)
  const { chapters, slides } = chaptersFromHeadingSections(sections, filename)

  return {
    filename,
    pdfPages: slides.length,
    slideCount: slides.filter((s) => !s.isDivider).length,
    uniqueChars: uniqueCharCount(slides),
    chapters,
    slides,
    diagnostics: genericDiagnostics(slides),
  }
}
