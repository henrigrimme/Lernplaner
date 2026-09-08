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
 * 2.1.50) plus `media` (JSON-Map Nummer→Dateiname) und den nummerierten
 * Mediendateien. Gelesen wird die erste vorhandene in der Reihenfolge
 * b → 21 → 2. Zstd via `fzstd` (nur Dekompression), SQLite via `sql.js`
 * (WASM). Beide werden **dynamisch** importiert — sie zählen nicht zum
 * Haupt-Bundle, das die tägliche Nutzung trägt (analog zu
 * `documentImport.ts`).
 *
 * **Bewusst kein vollständiger Anki-Template-Renderer.** Anki-Karten
 * entstehen aus Notiztyp-Vorlagen (`{{FrontSide}}`, `{{#Feld}}`,
 * `{{hint:}}` …) — das originalgetreu nachzubauen wäre ein eigenes
 * Projekt. Stattdessen eine Heuristik, die praktisch alle geteilten Decks
 * abdeckt: Basis-Notizen → Feld 1 = Vorderseite, Rest = Rückseite
 * (bei „…and reversed" wird für die zweite Karte getauscht);
 * Lückentext-Notizen (`{{c1::…}}`) werden je Kartenordinal aufgelöst.
 * HTML wird zu lesbarem Text reduziert, Bilder werden als
 * `[Bild: name]` markiert (echtes Medien-Rendering ist ein Folgeschritt,
 * siehe CONTEXT.md).
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
  /** Vorderseite, bereits zu reinem Text reduziert. */
  front: string
  /** Rückseite, bereits zu reinem Text reduziert. */
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
  /** Anzahl im Archiv gefundener Mediendateien (aktuell nur informativ). */
  mediaCount: number
}

export interface ExtractApkgOptions {
  /** Test-Hook: liefert den Pfad zur `sql-wasm.wasm`. Im Browser/Tauri kommt sie aus `public/`. */
  locateFile?: (file: string) => string
}

const FIELD_SEP = '\x1f'
const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

// ----------------------------- HTML → Text -----------------------------

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

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z0-9]+);/gi, (match, name) => NAMED_ENTITIES[String(name).toLowerCase()] ?? match)
}

/** Reduziert Anki-Feld-HTML auf lesbaren Text (kein DOM — läuft auch im Node-Testlauf). */
export function htmlToText(html: string): string {
  let s = html
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/\[sound:[^\]]*\]/gi, '')
  s = s.replace(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']*)["'][^>]*>/gi, (_, src) => {
    const name = decodeURIComponent(String(src).split(/[\\/]/).pop() || 'Bild')
    return ` [Bild: ${name}] `
  })
  s = s.replace(/<img\b[^>]*>/gi, ' [Bild] ')
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  s = s.replace(/<\/\s*(p|div|li|tr|h[1-6]|blockquote)\s*>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = decodeEntities(s)
  s = s.replace(/\u00a0/g, ' ')
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

// ----------------------------- Cloze -----------------------------

/** Vorderseite einer Lückentext-Karte: die Ziel-Lücke `n` wird zur Lücke, alle anderen aufgedeckt. */
export function renderClozeFront(text: string, n: number): string {
  return text.replace(CLOZE_RE, (_, num, answer, hint) =>
    Number(num) === n ? `[${(hint && String(hint).trim()) || '…'}]` : String(answer),
  )
}

/** Rückseite: alle Lücken aufgedeckt, die Ziel-Lücke `n` in eckigen Klammern hervorgehoben. */
export function renderClozeBack(text: string, n: number): string {
  return text.replace(CLOZE_RE, (_, num, answer) => (Number(num) === n ? `[${String(answer)}]` : String(answer)))
}

function clozeNumbersIn(text: string): number[] {
  const nums = new Set<number>()
  for (const match of text.matchAll(CLOZE_RE)) nums.add(Number(match[1]))
  return [...nums].sort((a, b) => a - b)
}

// ----------------------------- SQLite (sql.js) -----------------------------

interface MiniDb {
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  close(): void
}

async function createSqlDatabase(bytes: Uint8Array, opts?: ExtractApkgOptions): Promise<MiniDb> {
  const mod = (await import('sql.js')) as unknown as { default: (config?: unknown) => Promise<{ Database: new (d: Uint8Array) => MiniDb }> }
  const initSqlJs = mod.default
  let config: unknown
  if (opts?.locateFile) {
    config = { locateFile: opts.locateFile }
  } else if (typeof window !== 'undefined') {
    const base = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '/'
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

interface AnkiModel {
  fields: string[]
  isCloze: boolean
}

function readDecks(db: MiniDb): Map<string, string> {
  const map = new Map<string, string>()
  // Schema ≥ 18: echte `decks`-Tabelle.
  const tableRows = rows(db, 'SELECT id, name FROM decks')
  if (tableRows.length > 0) {
    for (const r of tableRows) map.set(String(r.id), String(r.name))
    return map
  }
  // Schema 11: `col.decks` als JSON.
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
  // Schema 11: `col.models` als JSON.
  const colRows = rows(db, 'SELECT models FROM col LIMIT 1')
  const json = colRows[0]?.models
  if (typeof json === 'string' && json.length > 2) {
    try {
      const parsed = JSON.parse(json) as Record<string, { flds?: { name: string; ord: number }[]; type?: number }>
      for (const [id, model] of Object.entries(parsed)) {
        map.set(String(id), {
          fields: (model.flds ?? []).slice().sort((a, b) => a.ord - b.ord).map((f) => f.name),
          isCloze: model.type === 1,
        })
      }
      if (map.size > 0) return map
    } catch {
      /* fällt auf die Tabellen-Variante zurück */
    }
  }
  // Schema ≥ 18: `fields`-Tabelle (Cloze wird ohnehin pro Notiz erkannt).
  const fieldRows = rows(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')
  const byNt = new Map<string, string[]>()
  for (const r of fieldRows) {
    const key = String(r.ntid)
    if (!byNt.has(key)) byNt.set(key, [])
    byNt.get(key)!.push(String(r.name))
  }
  for (const [ntid, fields] of byNt) map.set(ntid, { fields, isCloze: false })
  return map
}

function readCreatedSeconds(db: MiniDb): number {
  const colRows = rows(db, 'SELECT crt FROM col LIMIT 1')
  const crt = Number(colRows[0]?.crt)
  return Number.isFinite(crt) && crt > 0 ? crt : 0
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

  let mediaCount = 0
  const mediaFile = zip.file('media')
  if (mediaFile) {
    try {
      const parsed = JSON.parse(await mediaFile.async('string')) as Record<string, string>
      mediaCount = Object.keys(parsed).length
    } catch {
      /* neues Protobuf-Medienformat — für den reinen Text-Import ohne Belang */
    }
  }

  const db = await createSqlDatabase(sqliteBytes, opts)
  try {
    const decks = readDecks(db)
    const models = readModels(db)
    const createdSeconds = readCreatedSeconds(db)
    const nowMs = Date.now()

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
      const fields = flds.split(FIELD_SEP)
      const model = models.get(String(r.mid))
      const tags = String(r.tags ?? '').trim().split(/\s+/).filter(Boolean)
      const deckName = decks.get(String(r.did)) ?? 'Anki-Import'

      let frontRaw: string
      let backRaw: string

      const isCloze = (model?.isCloze ?? false) || /\{\{c\d+::/.test(flds)
      if (isCloze) {
        const textFieldIndex = fields.findIndex((f) => /\{\{c\d+::/.test(f))
        const text = fields[textFieldIndex] ?? fields[0] ?? ''
        const extra = fields.filter((_, i) => i !== textFieldIndex).filter((f) => f && f.trim()).join('\n\n')
        const numbers = clozeNumbersIn(text)
        const clozeNumber = numbers.includes(ord + 1) ? ord + 1 : numbers[0] ?? 1
        frontRaw = renderClozeFront(text, clozeNumber)
        backRaw = renderClozeBack(text, clozeNumber) + (extra ? `\n\n${extra}` : '')
      } else {
        const nonEmptyRest = fields.slice(1).filter((f) => f && f.trim())
        if (ord === 1 && fields.length === 2) {
          frontRaw = fields[1] ?? ''
          backRaw = fields[0] ?? ''
        } else {
          frontRaw = fields[0] ?? ''
          backRaw = nonEmptyRest.join('\n\n')
        }
      }

      const front = htmlToText(frontRaw)
      const back = htmlToText(backRaw)
      if (front.length === 0) {
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

    return { cards, skipped, mediaCount }
  } finally {
    db.close()
  }
}
