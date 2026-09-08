import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import JSZip from 'jszip'
import { extractApkg, renderClozeBack, renderClozeFront, renderTemplate } from '../../src/ingest/anki'

const US = '\x1f' // Anki-Feldtrenner

// sql.js findet seine WASM-Datei im Node-Testlauf nicht selbst — direkt auf
// die Datei in node_modules zeigen.
const locateFile = (file: string) => join(process.cwd(), 'node_modules/sql.js/dist', file)

// 1×1 PNG (transparent), gültige Bytes für den data:-URI-Test.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
  'base64',
)

const MODELS = JSON.stringify({
  '1000': {
    id: 1000,
    name: 'Basic',
    type: 0,
    flds: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr>{{Back}}' }],
  },
  '1500': {
    id: 1500,
    name: 'Optional Hint',
    type: 0,
    flds: [
      { name: 'Q', ord: 0 },
      { name: 'A', ord: 1 },
      { name: 'Hint', ord: 2 },
    ],
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '{{Q}}{{#Hint}}<div class="hint">{{Hint}}</div>{{/Hint}}',
        afmt: '{{FrontSide}}<hr>{{A}}',
      },
    ],
  },
  '2000': {
    id: 2000,
    name: 'Cloze',
    type: 1,
    flds: [
      { name: 'Text', ord: 0 },
      { name: 'Extra', ord: 1 },
    ],
    tmpls: [{ name: 'Cloze', ord: 0, qfmt: '{{cloze:Text}}', afmt: '{{cloze:Text}}<br>{{Extra}}' }],
  },
})

const DECKS = JSON.stringify({
  '1': { id: 1, name: 'Default' },
  '55': { id: 55, name: 'Spanisch::Verben' },
})

/** Baut eine minimale Anki-Sammlung (Schema 11) und packt sie als .apkg-ZIP. */
async function buildApkg(): Promise<Uint8Array> {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer,
      dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);
    CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer, usn integer,
      tags text, flds text, sfld text, csum integer, flags integer, data text);
    CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, mod integer,
      usn integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer,
      lapses integer, left integer, odue integer, odid integer, flags integer, data text);
    CREATE TABLE revlog (id integer primary key, cid integer, usn integer, ease integer, ivl integer,
      lastIvl integer, factor integer, time integer, type integer);
  `)
  const crt = Math.floor(Date.now() / 1000) - 100 * 86400
  db.prepare('INSERT INTO col VALUES (1,?,0,0,11,0,0,0,?,?,?,?,?)').run(crt, '{}', MODELS, DECKS, '{}', '{}')

  const notes = db.prepare('INSERT INTO notes VALUES (?,?,?,0,0,?,?,?,0,0,?)')
  notes.run(10, 'g10', 1000, ' vokabel ', `Bonjour${US}Hallo <b>fett</b>`, 'Bonjour', '')
  notes.run(20, 'g20', 2000, '', `Die Hauptstadt von {{c1::Frankreich}} ist {{c2::Paris}}${US}nur zur Info`, 'x', '')
  notes.run(30, 'g30', 1000, '', `Mit Bild${US}<img src="pic.png"> die Antwort`, 'Mit Bild', '')
  notes.run(40, 'g40', 1000, '', `${US}nur Rückseite`, '', '')
  notes.run(50, 'g50', 1500, '', `Frage ohne Hinweis${US}Antwort${US}`, 'Frage ohne Hinweis', '')
  notes.run(51, 'g51', 1500, '', `Frage mit Hinweis${US}Antwort${US}der Tipp`, 'Frage mit Hinweis', '')

  const cards = db.prepare('INSERT INTO cards VALUES (?,?,?,?,0,0,?,?,?,?,?,?,0,0,0,0,0,?)')
  const dueDay = Math.floor((Date.now() / 1000 - crt) / 86400)
  cards.run(100, 10, 55, 0, 2, 2, dueDay, 30, 2500, 5, '') // gelernte Review-Karte
  cards.run(200, 20, 1, 0, 0, 0, 0, 0, 0, 0, '') // Cloze c1
  cards.run(201, 20, 1, 1, 0, 0, 0, 0, 0, 0, '') // Cloze c2
  cards.run(300, 30, 1, 0, 0, 0, 0, 0, 0, 0, '')
  cards.run(400, 40, 1, 0, 0, 0, 0, 0, 0, 0, '')
  cards.run(500, 50, 1, 0, 0, 0, 0, 0, 0, 0, '')
  cards.run(510, 51, 1, 0, 0, 0, 0, 0, 0, 0, '')

  const bytes = db.serialize()
  db.close()

  const zip = new JSZip()
  zip.file('collection.anki2', bytes)
  // media-Manifest: Schlüssel "0" -> pic.png, Datei "0" = die PNG-Bytes
  zip.file('media', JSON.stringify({ '0': 'pic.png' }))
  zip.file('0', PNG_1PX)
  return zip.generateAsync({ type: 'uint8array' })
}

describe('renderTemplate', () => {
  it('setzt Felder ein und ersetzt {{FrontSide}}', () => {
    const out = renderTemplate('{{FrontSide}}<hr>{{Back}}', { Front: 'F', Back: 'B' }, 'F')
    expect(out).toBe('F<hr>B')
  })

  it('zeigt {{#Feld}}…{{/Feld}} nur bei nicht-leerem Feld', () => {
    const fmt = '{{Q}}{{#Hint}} ({{Hint}}){{/Hint}}'
    expect(renderTemplate(fmt, { Q: 'Frage', Hint: '' })).toBe('Frage')
    expect(renderTemplate(fmt, { Q: 'Frage', Hint: 'Tipp' })).toBe('Frage (Tipp)')
  })

  it('zeigt {{^Feld}}…{{/Feld}} nur bei leerem Feld', () => {
    const fmt = '{{^Extra}}kein Extra{{/Extra}}'
    expect(renderTemplate(fmt, { Extra: '' })).toBe('kein Extra')
    expect(renderTemplate(fmt, { Extra: 'da' })).toBe('')
  })
})

describe('Cloze-Rendering', () => {
  it('macht die Ziel-Lücke auf der Vorderseite unkenntlich, deckt andere auf', () => {
    const text = '{{c1::A}} und {{c2::B}}'
    expect(renderClozeFront(text, 1)).toBe('[…] und B')
    expect(renderClozeFront(text, 2)).toBe('A und […]')
  })

  it('zeigt den Hinweis statt der Auslassung, wenn vorhanden', () => {
    expect(renderClozeFront('{{c1::Paris::Hauptstadt}}', 1)).toBe('[Hauptstadt]')
  })

  it('deckt auf der Rückseite alle Lücken auf, hebt die Ziel-Lücke hervor', () => {
    expect(renderClozeBack('{{c1::A}} und {{c2::B}}', 1)).toBe('<b>[A]</b> und B')
  })
})

describe('extractApkg', () => {
  it('liest Basis-, Cloze-, Vorlagen- und Bild-Karten aus einer .apkg', async () => {
    const apkg = await buildApkg()
    const deck = await extractApkg(apkg, { locateFile })

    // Note 40 (leere Vorderseite) wird übersprungen.
    expect(deck.skipped).toBe(1)

    const basic = deck.cards.find((c) => c.front === 'Bonjour')
    expect(basic).toBeDefined()
    // afmt = {{FrontSide}}<hr>{{Back}}  ->  Bonjour<hr>Hallo <b>fett</b>
    expect(basic!.back).toBe('Bonjour<hr>Hallo <b>fett</b>')
    expect(basic!.deckName).toBe('Spanisch::Verben')
    expect(basic!.tags).toEqual(['vokabel'])
    expect(basic!.schedule).not.toBeNull()
    expect(basic!.schedule!.stabilityDays).toBe(30)
    expect(basic!.schedule!.difficulty).toBeGreaterThan(1)
    expect(basic!.schedule!.difficulty).toBeLessThanOrEqual(10)

    const clozeCards = deck.cards.filter((c) => c.front.includes('Hauptstadt von'))
    expect(clozeCards).toHaveLength(2)
    expect(clozeCards.some((c) => c.front.includes('[…] ist Paris'))).toBe(true)
    expect(clozeCards.some((c) => c.front.includes('Frankreich ist […]'))).toBe(true)
    expect(clozeCards.every((c) => c.back.includes('nur zur Info'))).toBe(true)
    expect(clozeCards.some((c) => c.back.includes('<b>[Frankreich]</b>'))).toBe(true)
    expect(clozeCards.every((c) => c.schedule === null)).toBe(true)

    // Optionaler Hinweis: {{#Hint}} greift nur bei gefülltem Feld.
    const noHint = deck.cards.find((c) => c.front.startsWith('Frage ohne Hinweis'))
    expect(noHint!.front).toBe('Frage ohne Hinweis')
    const withHint = deck.cards.find((c) => c.front.startsWith('Frage mit Hinweis'))
    expect(withHint!.front).toContain('der Tipp')
    // class="hint" wird vom Sanitizer entfernt, der <div> bleibt.
    expect(withHint!.front).not.toContain('class=')

    // Bild wird als data:-URI eingebettet.
    const withImage = deck.cards.find((c) => c.front === 'Mit Bild')
    expect(withImage!.back).toContain('<img src="data:image/png;base64,')
    expect(deck.imagesEmbedded).toBe(1)
    expect(deck.mediaCount).toBe(1)
  })

  it('markiert ein Bild als [Bild: name], wenn die Mediendatei fehlt', async () => {
    const db = new Database(':memory:')
    db.exec(`CREATE TABLE col (id integer primary key, crt integer, models text, decks text);
      CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text);
      CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, type integer,
        ivl integer, factor integer, reps integer, due integer);`)
    db.prepare('INSERT INTO col VALUES (1,?,?,?)').run(0, MODELS, DECKS)
    db.prepare('INSERT INTO notes VALUES (10,1000,?,?)').run(`Ohne Medien${US}<img src="weg.png">`, '')
    db.prepare('INSERT INTO cards VALUES (100,10,1,0,0,0,0,0,0)').run()
    const bytes = db.serialize()
    db.close()
    const zip = new JSZip()
    zip.file('collection.anki2', bytes)
    const apkg = await zip.generateAsync({ type: 'uint8array' })

    const deck = await extractApkg(apkg, { locateFile })
    const card = deck.cards.find((c) => c.front === 'Ohne Medien')
    expect(card!.back).toContain('[Bild: weg.png]')
  })

  it('wirft einen klaren Fehler, wenn keine Anki-Sammlung im ZIP liegt', async () => {
    const zip = new JSZip()
    zip.file('irgendwas.txt', 'kein anki')
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    await expect(extractApkg(bytes, { locateFile })).rejects.toThrow(/Anki-Sammlung/)
  })
})
