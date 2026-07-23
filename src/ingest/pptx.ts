import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { detectChaptersFromSlides } from './chapters'
import { genericDiagnostics } from './headingStructure'
import { uniqueCharCount } from './slides'
import type { BodyLine, ExtractedDocument, Slide } from './types'

/**
 * PowerPoint-Import (Nutzerwunsch 2026-07-22: „mehr Spielraum bei
 * akzeptierten Dokumenten"). Anders als bei einer exportierten PDF-Folie
 * (ADR-004) hat eine echte `.pptx`-Datei **keine** Animationsschritt-
 * Aufblähung — jede `<p:sld>` ist bereits eine vollständige, inhaltliche
 * Folie, PowerPoint speichert Animationen als Metadaten, nicht als
 * wiederholte Folienkopien. `groupIntoSlides`/`isBuildStep`
 * (`ingest/slides.ts`) werden hier deshalb nicht gebraucht.
 *
 * `.pptx` ist wie `.docx`/`.xlsx` ein ZIP aus XML-Teilen (OOXML) — `jszip`
 * entpackt, `fast-xml-parser` liest die Folien-XML. Bewusst **kein**
 * `DOMParser`: der läuft unter Vitests Node-Testumgebung für `ingest/`
 * nicht (siehe `vitest.config.ts`), `fast-xml-parser` funktioniert
 * identisch unter Node und im Browser.
 *
 * **Titelerkennung ist hier zuverlässiger als bei PDF:** eine echte
 * PowerPoint-Folie markiert ihre Titel-Platzhalter explizit
 * (`<p:ph type="title"/>`/`type="ctrTitle"`) — kein Schriftgrößen-/
 * Positionsvergleich wie bei PDF nötig (`ingest/extract.ts`
 * `detectTitle`), das Format sagt es direkt.
 *
 * **Bekannte Grenze:** Text aus Tabellen (`p:graphicFrame`) und
 * eingebetteten Bildern/Diagrammen wird nicht gelesen, nur aus
 * Textplatzhaltern/-boxen (`p:sp`) — deckt den weit überwiegenden Teil
 * echter Vorlesungsfolien ab, wie schon bei PDF ist Formelextraktion aus
 * Diagrammen kein Ziel dieses Imports.
 */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/** Sammelt jeden Textknoten (`<a:t>`) unterhalb von `node`, unabhängig von der Verschachtelungstiefe. */
function collectText(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  if (typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('@_'))
      .map(([, value]) => collectText(value))
      .join('')
  }
  return ''
}

/** Ein `p:txBody` in einzelne Absatzzeilen zerlegt (ein `a:p` = eine Zeile). */
function paragraphLines(txBody: unknown): string[] {
  if (!txBody || typeof txBody !== 'object') return []
  return asArray((txBody as Record<string, unknown>)['a:p'])
    .map((p) => collectText(p).trim())
    .filter((line) => line.length > 0)
}

/** Platzhaltertyp einer Form, falls es ein Textplatzhalter ist (Titel, Fußzeile, Foliennummer, …). */
function placeholderType(shape: Record<string, any>): string | undefined {
  return shape['p:nvSpPr']?.['p:nvPr']?.['p:ph']?.['@_type']
}

const TITLE_TYPES = new Set(['title', 'ctrTitle'])
/** Administrative Platzhalter, kein inhaltlicher Folientext. */
const NON_CONTENT_TYPES = new Set(['sldNum', 'ftr', 'dt'])

interface SlideText {
  title: string
  bodyLines: string[]
}

function extractSlideText(slideXml: any): SlideText {
  const shapes = asArray(slideXml?.['p:sld']?.['p:cSld']?.['p:spTree']?.['p:sp'])

  let title = ''
  const bodyLines: string[] = []
  for (const shape of shapes) {
    const type = placeholderType(shape)
    const lines = paragraphLines(shape['p:txBody'])
    if (type && TITLE_TYPES.has(type)) {
      title = lines.join(' ')
    } else if (!type || !NON_CONTENT_TYPES.has(type)) {
      bodyLines.push(...lines)
    }
  }
  return { title, bodyLines }
}

/**
 * Kürzere Folien mit Titel wirken wie eine Trennfolie — dieselbe Idee wie
 * `ingest/slides.ts` `isDividerPage`, aber ohne dessen
 * Kopf-/Fußzeilen-Bereinigung (die gilt nur für wiederkehrende PDF-
 * Textfragmente, hier bereits durch `NON_CONTENT_TYPES` oben abgedeckt).
 */
const DIVIDER_MAX_CHARS = 60

function toSlide(text: SlideText, index: number): Slide {
  const bodyLines: BodyLine[] = text.bodyLines.map((line) => ({ text: line, x: 0, y: 0, size: 0 }))
  const chars = bodyLines.map((l) => l.text).join(' ').length
  return {
    pageNumbers: [index + 1],
    title: text.title,
    bodyLines,
    isDivider: chars <= DIVIDER_MAX_CHARS && text.title.trim().length > 0,
    chars,
  }
}

/**
 * Liest die Folien-XML-Teile in tatsächlicher Präsentationsreihenfolge —
 * nicht nach Dateiname sortiert (`slide1.xml`, `slide2.xml`, …, was in der
 * Praxis fast immer stimmt, aber laut OOXML-Spezifikation nicht garantiert
 * ist), sondern über `ppt/presentation.xml`s `<p:sldIdLst>` und die
 * zugehörigen Beziehungen in `ppt/_rels/presentation.xml.rels` — „Fix statt
 * Workaround", derselbe Grundsatz wie beim PDF-/Ordner-Import (ADR-016).
 */
async function readSlideXmlsInOrder(zip: JSZip): Promise<unknown[]> {
  const presentationEntry = zip.file('ppt/presentation.xml')
  const relsEntry = zip.file('ppt/_rels/presentation.xml.rels')
  if (!presentationEntry || !relsEntry) {
    throw new Error('Keine gültige PowerPoint-Datei (ppt/presentation.xml fehlt).')
  }

  const presentation = parser.parse(await presentationEntry.async('text'))
  const rels = parser.parse(await relsEntry.async('text'))

  const relTargetById = new Map<string, string>()
  for (const rel of asArray(rels?.Relationships?.Relationship)) {
    relTargetById.set(rel['@_Id'], rel['@_Target'])
  }

  const slideIds = asArray(presentation?.['p:presentation']?.['p:sldIdLst']?.['p:sldId'])
  const slideXmls: unknown[] = []
  for (const slideId of slideIds) {
    const target = relTargetById.get(slideId['@_r:id'])
    if (!target) continue
    const entry = zip.file(`ppt/${target.replace(/^\.?\//, '')}`)
    if (!entry) continue
    slideXmls.push(parser.parse(await entry.async('text')))
  }
  return slideXmls
}

export async function extractPptxDocument(data: Uint8Array, filename: string): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(data)
  const slideXmls = await readSlideXmlsInOrder(zip)
  const slides = slideXmls.map((xml, index) => toSlide(extractSlideText(xml), index))
  const chapters = detectChaptersFromSlides(slides, filename)

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
