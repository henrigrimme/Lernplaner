import { extractMarkdownDocument } from './markdown'
import type { ExtractedDocument } from './types'

/**
 * Unterstützte Import-Formate (Nutzerwunsch 2026-07-22: „mehr Spielraum
 * bei akzeptierten Dokumenten" — löst die bisherige, bestätigte
 * Einschränkung „nur PDF", CONTEXT.md Abschnitt 3). Einziger Ort, der die
 * Dateiendungen kennt, damit `App.tsx`/`platform/folderImport.ts` nicht
 * selbst zwischen Formaten unterscheiden müssen — neue Formate kommen nur
 * hier und in der jeweiligen `ingest/*.ts`-Datei dazu.
 *
 * Bewusst **nicht** dabei: CSV/HTML (reine Datendateien, kein
 * Lernmaterial im bisher beobachteten Material, siehe CONTEXT.md
 * „Nachtsitzung") und gescannte/bildbasierte Formate (kein OCR, Abschnitt
 * 9 „Bekannte Einschränkungen").
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.markdown'] as const

export function isSupportedDocument(filename: string): boolean {
  const lower = filename.toLowerCase()
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Wählt anhand der Dateiendung die passende, deterministische
 * Extraktionspipeline (`ingest/pdf.ts`/`docx.ts`/`pptx.ts`/`xlsx.ts`/
 * `markdown.ts` — siehe dort für die jeweilige Kapitelerkennung). Alle
 * fünf liefern dieselbe `ExtractedDocument`-Form, `data/importTopics.ts`
 * `persistExtractedDocument` bleibt dadurch formatunabhängig.
 *
 * **Dynamischer Import statt Top-Level-Import** (Performance-Verbesserung
 * 2026-07-24): `pdfjs-dist`/`mammoth`/`jszip`/`fast-xml-parser` sind
 * zusammen ein erheblicher Teil des Haupt-Bundles, wurden aber bisher bei
 * *jedem* App-Start geladen, obwohl Import nur eine von vielen, eher
 * seltenen Aktionen ist (die tägliche Nutzung laut PRODUCT.md — Heute,
 * Wiederholen, Quiz — braucht keinen davon). Jedes Format lädt jetzt nur
 * noch, wenn tatsächlich eine Datei dieses Typs importiert wird.
 */
export async function extractAnyDocument(data: Uint8Array, filename: string): Promise<ExtractedDocument> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return (await import('./pdf')).extractDocument(data, filename)
  if (lower.endsWith('.docx')) return (await import('./docx')).extractDocxDocument(data, filename)
  if (lower.endsWith('.pptx')) return (await import('./pptx')).extractPptxDocument(data, filename)
  if (lower.endsWith('.xlsx')) return (await import('./xlsx')).extractXlsxDocument(data, filename)
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return extractMarkdownDocument(new TextDecoder('utf-8').decode(data), filename)
  }
  throw new Error(`Nicht unterstütztes Dateiformat: „${filename}"`)
}
