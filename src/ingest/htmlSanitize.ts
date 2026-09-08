/**
 * Kleiner, DOM-freier HTML-Filter für **importierte Karteikarten-Inhalte**
 * (aktuell nur der Anki-Import, `ingest/anki.ts`). Läuft auch im
 * Node-Testlauf, deshalb reine String-/Regex-Verarbeitung statt
 * `DOMParser`.
 *
 * Ziel ist **kein** allgemeiner XSS-Schutz für beliebiges Web-HTML,
 * sondern: der Nutzer importiert seine eigenen Anki-Decks in eine lokale
 * Tauri-App (kein fremder Origin, keine Cookies), und die Karten sollen
 * mit Fett/Kursiv/Listen/Bildern lesbar bleiben, ohne dass Skripte,
 * Styles, iframes, Event-Handler oder externe Ressourcen durchkommen.
 * Bilder nur als eingebettete `data:`-URIs (das Einbetten macht
 * `ingest/anki.ts`).
 */

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'hr',
  'sub', 'sup', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'img', 'dl', 'dt', 'dd',
])

const STRIP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|form|svg|math|head|title)\b[\s\S]*?<\/\1\s*>/gi
const STRIP_VOID = /<\/?(script|style|iframe|object|embed|noscript|template|form|svg|math|link|meta|base|input|button|select|textarea|audio|video|source|track)\b[^>]*\/?>/gi

/** Sieht der Text nach HTML aus (Tag oder Entity)? Sonst wird er als reiner Text behandelt. */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][a-z0-9]*(\s[^>]*)?\/?>/i.test(value) || /<\/[a-z][a-z0-9]*\s*>/i.test(value) || /&[a-z#0-9]+;/i.test(value)
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Reduziert `input` auf ein enges, sicheres Tag-Set. Nicht erlaubte Tags
 * werden entfernt (ihr Textinhalt bleibt erhalten), alle Attribute außer
 * `src`/`alt` an `<img>` fallen weg. `<img>` bleibt nur mit
 * `data:image/*`-Quelle.
 */
export function sanitizeCardHtml(input: string): string {
  let s = input
  s = s.replace(STRIP_WITH_CONTENT, '')
  s = s.replace(STRIP_VOID, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')

  s = s.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (_whole, slash: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (slash) return `</${tag}>`

    if (tag === 'img') {
      const srcMatch = /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs)
      const src = srcMatch ? (srcMatch[2] ?? srcMatch[3] ?? srcMatch[4] ?? '') : ''
      if (!/^data:image\//i.test(src)) return ''
      const altMatch = /\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
      const alt = altMatch ? (altMatch[2] ?? altMatch[3] ?? '') : ''
      return `<img src="${escapeAttr(src)}"${alt ? ` alt="${escapeAttr(alt)}"` : ''}>`
    }

    // Alle Attribute an erlaubten Tags verwerfen — Kartenvorder-/-rückseiten
    // brauchen weder class/style noch href/on*.
    return `<${tag}>`
  })

  return s.trim()
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', deg: '°', times: '×',
}

function safeCodePoint(cp: number): string {
  try {
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ''
  } catch {
    return ''
  }
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z0-9]+);/gi, (match, name) => NAMED_ENTITIES[String(name).toLowerCase()] ?? match)
}

/** Reduziert HTML auf reinen Text (für kurze Listen-Labels, z. B. `ErrorHistory`). */
export function htmlToPlainText(html: string): string {
  let s = html
  s = s.replace(STRIP_WITH_CONTENT, '')
  s = s.replace(/\[sound:[^\]]*\]/gi, '')
  s = s.replace(/<img\b[^>]*?\balt\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi, (_, __, a1, a2) => ` [Bild: ${a1 ?? a2}] `)
  s = s.replace(/<img\b[^>]*?\bsrc\s*=\s*("([^"']*)"|'([^']*)'|([^\s">]+))[^>]*>/gi, (_, __, s1, s2, s3) => {
    const src = s1 ?? s2 ?? s3 ?? ''
    if (/^data:/i.test(src)) return ' [Bild] '
    const name = decodeURIComponent(String(src).split(/[\\/]/).pop() || 'Bild')
    return ` [Bild: ${name}] `
  })
  s = s.replace(/<img\b[^>]*>/gi, ' [Bild] ')
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  s = s.replace(/<\/\s*(p|div|li|tr|h[1-6]|blockquote|dd|dt)\s*>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = decodeEntities(s)
  s = s.replace(/\u00a0/g, " ")
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n')
  return s.trim()
}
