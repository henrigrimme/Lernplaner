import { sanitizeCardHtml } from './htmlSanitize'
import { isZstd, parseAnkiMediaManifest } from './ankiMediaManifest'

/**
 * Anki-`.apkg`/`.colpkg`-Import (Nutzerwunsch 2026-09-08: „genau die Anki-
 * Funktion im Lernplaner, Anki-Dateien direkt importieren"). Ergänzt die
 * bereits vorhandene Anki-äquivalente Lernschleife (FSRS in
 * `domain/spacedRepetition.ts` — derselbe Algorithmus wie modernes Anki —,
 * Karteikarten, 1–4-Bewertung, Fälligkeits-Queue) um den fehlenden
 * Baustein: bestehende Decks einlesen.
 *
 * **Format.** Eine `.apkg` ist ein ZIP mit einer SQLite-Datenbank
 * (`collection.anki2` = Legacy/unkomprimiert, `collection.anki21` =
 * neuere Variante, `collection.anki21b` = Zstd-komprimiert seit Anki
 * 2.1.50) plus `media` und den nummerierten Mediendateien. Gelesen wird
 * die erste vorhandene Sammlung in der Reihenfolge b → 21 → 2. `media` ist
 * je nach Alter eine JSON-Map (`{ "0": "bild.png" }`) oder ein Protobuf
 * `MediaEntries` (neues Format, evtl. Zstd-komprimiert — siehe
 * `ankiMediaManifest.ts`); die nummerierten Mediendateien sind im neuen
 * Format ebenfalls Zstd-komprimiert (`isZstd`-Prüfung). Zstd via `fzstd`
 * (nur Dekompression), SQLite via `sql.js` (WASM). Beide werden
 * **dynamisch** importiert — sie zählen nicht zum Haupt-Bundle, das die
 * tägliche Nutzung trägt (analog zu `documentImport.ts`).
 *
 * **Karten-Rendering.**
 * - Hat der Notiztyp (Schema 11, `col.models`) Vorlagen mit `qfmt`/`afmt`,
 *   wird ein **minimaler** Mustache-Renderer angewandt: `{{Feld}}`,
 *   `{{FrontSide}}`, `{{#Feld}}…{{/Feld}}` / `{{^Feld}}…{{/Feld}}`,
 *   `{{hint:Feld}}` u. ä. Das deckt „Basic (and reversed)", optionale
 *   Felder und die meisten Community-Notiztypen ab.
 * - Lückentext-Notizen (`{{c1::…}}`, Hinweis-Syntax `::hint`) werden je
 *   Kartenordinal aufgelöst — dedizierte Logik statt Vorlagen.
 * - Ohne `qfmt` (neueres Schema ≥ 18, Vorlagen liegen als Protobuf vor):
 *   Heuristik — Feld 1 = Vorderseite, restliche nicht-leere Felder =
 *   Rückseite (bei zwei Feldern für Ordinal 1 getauscht).
 *
 * Ergebnis ist **sanitisiertes HTML** (`htmlSanitize.ts`, enges Tag-Set);
 * Bilder werden aus dem `media`-Archiv als `data:`-URIs eingebettet
 * (Größenobergrenzen, siehe `inlineImages`) oder sonst als
 * `[Bild: name]` markiert.
 *
 * **FSRS-Startzustand.** Anki speichert SM-2-Zustand (`ivl` Tage,
 * `factor` Ease) — nicht direkt FSRS-Parameter. „Wo möglich" wird daraus
 * ein grober Startwert geschätzt (`stability ≈ ivl`, `difficulty` aus dem
 * Ease abgeleitet), damit lange bekannte Karten nicht sofort wieder
 * täglich abgefragt werden. Neue/ungelernte Karten starten frisch.
 */

export interface AnkiImportedCard {
  /** Anki-Deckname, `::` trennt Unterdecks (wird beim Persistieren zu verschachtelten Themen). */
  deckName: string
  /** Vorderseite als sanitisiertes HTML. */
  front: string
  /** Rückseite als sanitisiertes HTML. */
  back: string
  tags: string[]
  /**
   * Grober FSRS-Startzustand aus Ankis SM-2-Daten, oder `null` für
   * neue/ungelernte Karten (die frisch starten).
   */
  schedule: { stabilityDays: number; difficulty: number; dueInDays: number } | null
}

export interface AnkiDeck {
  cards: AnkiImportedCard[]
  /** Anzahl Karten, die nicht sinnvoll gerendert werden konnten (leere Vorderseite o. Ä.). */
  skipped: number
  /** Anzahl im Archiv gefundener Mediendateien. */
  mediaCount: number
  /** Anzahl tatsächlich in Karten eingebetteter Bilder. */
  imagesEmbedded: number
}

export interface ExtractApkgOptions {
  /** Test-Hook: liefert den Pfad zur `sql-wasm.wasm`. Im Browser/Tauri kommt sie aus `public/`. */
  locateFile?: (file: string) => string
}

/** Anki trennt die Felder einer Notiz mit dem ASCII-Unit-Separator (0x1f). */
const FIELD_SEP = '\x1f'
const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

const MAX_IMAGE_BYTES = 1_500_000
const MAX_TOTAL_IMAGE_BYTES = 6_000_000

// ----------------------------- Cloze -----------------------------

/** Vorderseite einer Lückentext-Karte: die Ziel-Lücke `n` wird zur Lücke, alle anderen aufgedeckt. */
export function renderClozeFront(text: string, n: number): string {
  return text.replace(CLOZE_RE, (_, num, answer, hint) =>
    Number(num) === n ? `[${(hint && String(hint).trim()) || '…'}]` : String(answer),
  )
}

/** Rückseite: alle Lücken aufgedeckt, die Ziel-Lücke `n` in eckigen Klammern hervorgehoben. */
export function renderClozeBack(text: string, n: number): string {
  return text.replace(CLOZE_RE, (_, num, answer) => (Number(num) === n ? `<b>[${String(answer)}]</b>` : String(answer)))
}

function clozeNumbersIn(text: string): number[] {
  const nums = new Set<number>()
  for (const match of text.matchAll(CLOZE_RE)) nums.add(Number(match[1]))
  return [...nums].sort((a, b) => a - b)
}

// ----------------------------- Vorlagen-Renderer -----------------------------

/**
 * Minimaler Mustache-Renderer für Anki-`qfmt`/`afmt`. Kein voller Nachbau
 * (keine Custom-Filter, kein `{{tts:}}`), deckt aber Feldeinsetzung,
 * `{{FrontSide}}` und optionale Abschnitte `{{#F}}`/`{{^F}}` ab.
 */
export function renderTemplate(fmt: string, fields: Record<string, string>, frontSide = ''): string {
  let s = fmt.replace(/<!--[\s\S]*?-->/g, '')

  const sectionRe = /\{\{([#^])([^}]+?)\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g
  let previous: string
  do {
    previous = s
    s = s.replace(sectionRe, (_, kind: string, name: string, body: string) => {
      const nonEmpty = (fields[name.trim()] ?? '').trim().length > 0
      return (kind === '#') === nonEmpty ? body : ''
    })
  } while (s !== previous)

  s = s.replace(/\{\{FrontSide\}\}/g, frontSide)
  s = s.replace(/\{\{(?:hint|type|text|edit|furigana|kana|kanji|cloze):([^}]+)\}\}/g, (_, name) => fields[name.trim()] ?? '')
  s = s.replace(/\{\{([^}#^/][^}]*)\}\}/g, (_, name) => fields[name.trim()] ?? '')
  s = s.replace(/\{\{[^}]*\}\}/g, '')
  return s
}

// ----------------------------- Bilder einbetten -----------------------------

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Ersetzt `<img src="datei.png">` durch eingebettete `data:`-URIs aus dem Medienarchiv. */
function inlineImages(html: string, media: Map<string, Uint8Array>, budget: { used: number; embedded: number }): string {
  return html.replace(
    /<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))[^>]*>/gi,
    (_whole, _group, dq: string, sq: string, uq: string) => {
      const raw = dq ?? sq ?? uq ?? ''
      const name = decodeURIComponent(raw.split(/[\\/]/).pop() || '')
      const bytes = media.get(name) ?? media.get(raw)
      const label = name || 'Bild'
      if (!bytes) return ` [Bild: ${label}] `
      const ext = (name.split('.').pop() || '').toLowerCase()
      const mime = IMAGE_MIME[ext]
      if (!mime || bytes.length > MAX_IMAGE_BYTES || budget.used + bytes.length > MAX_TOTAL_IMAGE_BYTES) {
        return ` [Bild: ${label}] `
      }
      budget.used += bytes.length
      budget.embedded += 1
      return `<img src="data:${mime};base64,${bytesToBase64(bytes)}" alt="${label.replace(/"/g, '')}">`
    },
  )
}

// ----------------------------- SQLite (sql.js) -----------------------------

interface MiniDb {
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  close(): void
}

async function createSqlDatabase(bytes: Uint8Array, opts?: ExtractApkgOptions): Promise<MiniDb> {
  const mod = (await import('sql.js')) as unknown as {
    default: (config?: unknown) => Promise<{ Database: new (d: Uint8Array) => MiniDb }>
  }
  const initSqlJs = mod.default
  let config: unknown
  if (opts?.locateFile) {
    config = { locateFile: opts.locateFile }
  } else if (typeof window !== 'undefined') {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
    config = { locateFile: (file: string) => `${base}${file}` }
  }
  const SQL = await initSqlJs(config)
  return new SQL.Database(bytes)
}

function rows(db: MiniDb, sql: string): Record<string, unknown>[] {
  let result: { columns: string[]; values: unknown[][] }[]
  try {
    result = db.exec(sql)
  } catch {
    return []
  }
  if (result.length === 0) return []
  const { columns, values } = result[0]!
  return values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
}

// ----------------------------- Schema-Lesen -----------------------------

interface AnkiTemplate {
  qfmt: string
  afmt: string
}

interface AnkiModel {
  fields: string[]
  isCloze: boolean
  templates: AnkiTemplate[]
}

function readDecks(db: MiniDb): Map<string, string> {
  const map = new Map<string, string>()
  const tableRows = rows(db, 'SELECT id, name FROM decks')
  if (tableRows.length > 0) {
    for (const r of tableRows) map.set(String(r.id), String(r.name))
    return map
  }
  const colRows = rows(db, 'SELECT decks FROM col LIMIT 1')
  const json = colRows[0]?.decks
  if (typeof json === 'string' && json.length > 2) {
    try {
      const parsed = JSON.parse(json) as Record<string, { name?: string }>
      for (const [id, deck] of Object.entries(parsed)) map.set(String(id), deck?.name ?? `Deck ${id}`)
    } catch {
      /* ignoriert — Default-Deckname greift */
    }
  }
  return map
}

function readModels(db: MiniDb): Map<string, AnkiModel> {
  const map = new Map<string, AnkiModel>()
  const colRows = rows(db, 'SELECT models FROM col LIMIT 1')
  const json = colRows[0]?.models
  if (typeof json === 'string' && json.length > 2) {
    try {
      const parsed = JSON.parse(json) as Record<
        string,
        { flds?: { name: string; ord: number }[]; tmpls?: { qfmt?: string; afmt?: string; ord: number }[]; type?: number }
      >
      for (const [id, model] of Object.entries(parsed)) {
        map.set(String(id), {
          fields: (model.flds ?? []).slice().sort((a, b) => a.ord - b.ord).map((f) => f.name),
          isCloze: model.type === 1,
          templates: (model.tmpls ?? [])
            .slice()
            .sort((a, b) => a.ord - b.ord)
            .map((t) => ({ qfmt: t.qfmt ?? '', afmt: t.afmt ?? '' })),
        })
      }
      if (map.size > 0) return map
    } catch {
      /* fällt auf die Tabellen-Variante zurück */
    }
  }
  const fieldRows = rows(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')
  const byNt = new Map<string, string[]>()
  for (const r of fieldRows) {
    const key = String(r.ntid)
    if (!byNt.has(key)) byNt.set(key, [])
    byNt.get(key)!.push(String(r.name))
  }
  for (const [ntid, fields] of byNt) map.set(ntid, { fields, isCloze: false, templates: [] })
  return map
}

function readCreatedSeconds(db: MiniDb): number {
  const colRows = rows(db, 'SELECT crt FROM col LIMIT 1')
  const crt = Number(colRows[0]?.crt)
  return Number.isFinite(crt) && crt > 0 ? crt : 0
}

interface ZipEntry {
  async(type: 'uint8array'): Promise<Uint8Array>
}

/** Eine (evtl. Zstd-komprimierte) Archivdatei als Bytes. */
async function mediaFileBytes(entry: ZipEntry): Promise<Uint8Array> {
  const bytes = await entry.async('uint8array')
  if (!isZstd(bytes)) return bytes
  const fzstd = (await import('fzstd')) as unknown as { decompress: (b: Uint8Array) => Uint8Array }
  return fzstd.decompress(bytes)
}

async function readMedia(zip: import('jszip')): Promise<Map<string, Uint8Array>> {
  const map = new Map<string, Uint8Array>()
  const mediaFile = zip.file('media')
  if (!mediaFile) return map

  const rawManifest = await mediaFile.async('uint8array')

  // Altes Format: JSON-Map { "0": "bild.png", … }.
  try {
    const manifest = JSON.parse(new TextDecoder('utf-8').decode(rawManifest)) as Record<string, string>
    for (const [key, name] of Object.entries(manifest)) {
      const entry = zip.file(key)
      if (entry) map.set(name, await mediaFileBytes(entry))
    }
    return map
  } catch {
    /* kein JSON → neues Format */
  }

  // Neues Format (Anki ≥ 2.1.50): `media` ist ein (evtl. Zstd-
  // komprimiertes) Protobuf `MediaEntries`. Reihenfolge = Archiv-Index.
  let manifestBytes = rawManifest
  if (isZstd(manifestBytes)) {
    const fzstd = (await import('fzstd')) as unknown as { decompress: (b: Uint8Array) => Uint8Array }
    manifestBytes = fzstd.decompress(manifestBytes)
  }
  let names: string[]
  try {
    names = parseAnkiMediaManifest(manifestBytes)
  } catch {
    return map
  }
  for (let i = 0; i < names.length; i += 1) {
    if (names[i]!.length === 0) continue
    const entry = zip.file(String(i))
    if (entry) map.set(names[i]!, await mediaFileBytes(entry))
  }
  return map
}

// ----------------------------- FSRS-Startzustand -----------------------------

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value))
}

function seedSchedule(
  card: { ctype: number; ivl: number; factor: number; reps: number; due: number },
  createdSeconds: number,
  nowMs: number,
): AnkiImportedCard['schedule'] {
  if (!card.reps || card.reps <= 0 || !card.ivl || card.ivl < 1) return null
  const stabilityDays = Math.min(card.ivl, 3650)
  // Anki-Ease: 2500 = Standard, kleiner = schwerer. Auf FSRS-difficulty 1–10 abbilden.
  const difficulty = clamp(1, 10, (3100 - (card.factor || 2500)) / 180)
  let dueInDays = card.ivl
  if (createdSeconds > 0 && card.ctype === 2 && Number.isFinite(card.due)) {
    const dueMs = (createdSeconds + card.due * 86400) * 1000
    dueInDays = Math.round((dueMs - nowMs) / 86400000)
  }
  return { stabilityDays, difficulty, dueInDays }
}

// ----------------------------- Hauptfunktion -----------------------------

/** Grobe „hat die Seite überhaupt sichtbaren Inhalt"-Prüfung (Tags/Whitespace weg, Bild zählt als Inhalt). */
function hasVisibleContent(html: string): boolean {
  return (
    html
      .replace(/<img\b[^>]*>/gi, 'x')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, '')
      .trim().length > 0
  )
}

export async function extractApkg(data: Uint8Array, opts?: ExtractApkgOptions): Promise<AnkiDeck> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(data)

  const collectionName = ['collection.anki21b', 'collection.anki21', 'collection.anki2'].find((name) => zip.file(name))
  if (!collectionName) {
    throw new Error('Keine Anki-Sammlung in der Datei gefunden (erwartet collection.anki2 / .anki21 / .anki21b).')
  }

  let sqliteBytes = await zip.file(collectionName)!.async('uint8array')
  if (collectionName.endsWith('b')) {
    const fzstd = (await import('fzstd')) as unknown as { decompress: (b: Uint8Array) => Uint8Array }
    sqliteBytes = fzstd.decompress(sqliteBytes)
  }

  const media = await readMedia(zip)

  const db = await createSqlDatabase(sqliteBytes, opts)
  try {
    const decks = readDecks(db)
    const models = readModels(db)
    const createdSeconds = readCreatedSeconds(db)
    const nowMs = Date.now()
    const imageBudget = { used: 0, embedded: 0 }

    const cardRows = rows(
      db,
      `SELECT c.ord AS ord, c.did AS did, c.type AS ctype, c.ivl AS ivl, c.factor AS factor,
              c.reps AS reps, c.due AS due, n.flds AS flds, n.tags AS tags, n.mid AS mid
       FROM cards c JOIN notes n ON n.id = c.nid`,
    )

    const cards: AnkiImportedCard[] = []
    let skipped = 0

    for (const r of cardRows) {
      const ord = Number(r.ord) || 0
      const flds = String(r.flds ?? '')
      const fieldValues = flds.split(FIELD_SEP)
      const model = models.get(String(r.mid))
      const tags = String(r.tags ?? '').trim().split(/\s+/).filter(Boolean)
      const deckName = decks.get(String(r.did)) ?? 'Anki-Import'

      const fieldNames = model?.fields ?? fieldValues.map((_, i) => `Field ${i + 1}`)
      const fieldMap: Record<string, string> = {}
      fieldNames.forEach((name, i) => {
        fieldMap[name] = fieldValues[i] ?? ''
      })

      let frontRaw: string
      let backRaw: string

      const isCloze = (model?.isCloze ?? false) || /\{\{c\d+::/.test(flds)
      if (isCloze) {
        const textFieldIndex = fieldValues.findIndex((f) => /\{\{c\d+::/.test(f))
        const text = fieldValues[textFieldIndex] ?? fieldValues[0] ?? ''
        const extra = fieldValues.filter((_, i) => i !== textFieldIndex).filter((f) => f && f.trim()).join('<br>')
        const numbers = clozeNumbersIn(text)
        const clozeNumber = numbers.includes(ord + 1) ? ord + 1 : numbers[0] ?? 1
        frontRaw = renderClozeFront(text, clozeNumber)
        backRaw = renderClozeBack(text, clozeNumber) + (extra ? `<hr>${extra}` : '')
      } else {
        const template = model?.templates[ord]
        if (template && (template.qfmt || template.afmt)) {
          frontRaw = renderTemplate(template.qfmt, fieldMap)
          backRaw = renderTemplate(template.afmt, fieldMap, frontRaw)
        } else {
          const nonEmptyRest = fieldValues.slice(1).filter((f) => f && f.trim())
          if (ord === 1 && fieldValues.length === 2) {
            frontRaw = fieldValues[1] ?? ''
            backRaw = fieldValues[0] ?? ''
          } else {
            frontRaw = fieldValues[0] ?? ''
            backRaw = nonEmptyRest.join('<br>')
          }
        }
      }

      const front = sanitizeCardHtml(inlineImages(frontRaw, media, imageBudget))
      const back = sanitizeCardHtml(inlineImages(backRaw, media, imageBudget))
      if (!hasVisibleContent(front)) {
        skipped += 1
        continue
      }

      cards.push({
        deckName,
        front,
        back,
        tags,
        schedule: seedSchedule(
          {
            ctype: Number(r.ctype) || 0,
            ivl: Number(r.ivl) || 0,
            factor: Number(r.factor) || 0,
            reps: Number(r.reps) || 0,
            due: Number(r.due) || 0,
          },
          createdSeconds,
          nowMs,
        ),
      })
    }

    return { cards, skipped, mediaCount: media.size, imagesEmbedded: imageBudget.embedded }
  } finally {
    db.close()
  }
}
