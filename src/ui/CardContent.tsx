import { looksLikeHtml, sanitizeCardHtml } from '../ingest/htmlSanitize'

/**
 * Zeigt Vorder-/Rückseite einer Karteikarte. Selbst erstellte Karten
 * (aus PDF-Textmarkierungen) sind reiner Text und werden mit erhaltenen
 * Zeilenumbrüchen (`white-space: pre-wrap`) dargestellt. **Importierte**
 * Anki-Karten können HTML (Fett/Kursiv/Listen/Bilder) enthalten — nur
 * diese werden als HTML gerendert, und dann durch `sanitizeCardHtml`
 * nochmals auf ein enges, sicheres Tag-Set eingegrenzt (der Anki-Import
 * sanitisiert bereits, das hier ist die zweite Schicht).
 *
 * Die Unterscheidung „Text oder HTML" per `looksLikeHtml` (Tag/Entity
 * vorhanden) — ein PDF-Zitat wie „x < y" enthält kein Tag und bleibt
 * damit reiner Text.
 */

export interface CardContentProps {
  html: string
  /** Semantische Rolle für Styling (Vorderseite größer, Rückseite normal). */
  side: 'front' | 'back'
}

export function CardContent({ html, side }: CardContentProps) {
  const className = `card-content card-content-${side}`
  if (looksLikeHtml(html)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(html) }} />
  }
  return <div className={`${className} card-content-plain`}>{html}</div>
}
