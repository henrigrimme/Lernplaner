import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import JSZip from 'jszip'
import { extractApkg, htmlToText, renderClozeBack, renderClozeFront } from '../../src/ingest/anki'

const US = '\x1f' // Anki-Feldtrenner

// sql.js findet seine WASM-Datei im Node-Testlauf nicht selbst — direkt auf
// die Datei in node_modules zeigen.
const locateFile = (file: string) => join(process.cwd(), 'node_modules/sql.js/dist', file)

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
  // crt: Sammlung vor 100 Tagen angelegt.
  const crt = Math.floor(Date.now() / 1000) - 100 * 86400
  db.prepare('INSERT INTO col VALUES (1,?,0,0,11,0,0,0,?,?,?,?,?)').run(crt, '{}', MODELS, DECKS, '{}', '{}')

  const notes = db.prepare('INSERT INTO notes VALUES (?,?,?,0,0,?,?,?,0,0,?)')
  notes.run(10, 'g10', 1000, ' vokabel ', `Bonjour${US}Hallo <b>fett</b>`, 'Bonjour', '')
  notes.run(20, 'g20', 2000, '', `Die Hauptstadt von {{c1::Frankreich}} ist {{c2::Paris}}${US}nur zur Info`, 'x', '')
  notes.run(30, 'g30', 1000, '', `Mit Bild${US}<img src="pic.png"> die Antwort`, 'Mit Bild', '')
  notes.run(40, 'g40', 1000, '', `${US}nur Rückseite`, '', '')

  const cards = db.prepare('INSERT INTO cards VALUES (?,?,?,?,0,0,?,?,?,?,?,?,0,0,0,0,0,?)')
  // gelernte Review-Karte: ivl 30, ease 2500, reps 5, fällig heute (due = crt-relativer Tag)
  const dueDay = Math.floor((Date.now() / 1000 - crt) / 86400)
  cards.run(100, 10, 55, 0, 2, 2, dueDay, 30, 2500, 5, '')
  cards.run(200, 20, 1, 0, 0, 0, 0, 0, 0, 0, '') // Cloze c1
  cards.run(201, 20, 1, 1, 0, 0, 0, 0, 0, 0, '') // Cloze c2
  cards.run(300, 30, 1, 0, 0, 0, 0, 0, 0, 0, '')
  cards.run(400, 40, 1, 0, 0, 0, 0, 0, 0, 0, '')

  const bytes = db.serialize()
  db.close()

  const zip = new JSZip()
  zip.file('collection.anki2', bytes)
  zip.file('media', '{}')
  return zip.generateAsync({ type: 'uint8array' })
}

describe('htmlToText', () => {
  it('entfernt Tags, wandelt <br> in Zeilenumbrüche, dekodiert Entities', () => {
    expect(htmlToText('a<br>b&nbsp;c <b>d</b>')).toBe('a\nb c d')
  })

  it('markiert Bilder mit Dateinamen', () => {
    expect(htmlToText('Text <img src="folder/pic.png"> Ende')).toContain('[Bild: pic.png]')
  })

  it('entfernt [sound:...]-Verweise', () => {
    expect(htmlToText('Wort [sound:audio.mp3]')).toBe('Wort')
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
    expect(renderClozeBack('{{c1::A}} und {{c2::B}}', 1)).toBe('[A] und B')
  })
})

describe('extractApkg', () => {
  it('liest Basis-, Cloze- und Bild-Karten aus einer .apkg', async () => {
    const apkg = await buildApkg()
    const deck = await extractApkg(apkg, { locateFile })

    // Note 40 (leere Vorderseite) wird übersprungen.
    expect(deck.skipped).toBe(1)

    const basic = deck.cards.find((c) => c.front === 'Bonjour')
    expect(basic).toBeDefined()
    expect(basic!.back).toBe('Hallo fett')
    expect(basic!.deckName).toBe('Spanisch::Verben')
    expect(basic!.tags).toEqual(['vokabel'])
    // gelernte Karte: FSRS-Startwert aus ivl/ease geschätzt
    expect(basic!.schedule).not.toBeNull()
    expect(basic!.schedule!.stabilityDays).toBe(30)
    expect(basic!.schedule!.difficulty).toBeGreaterThan(1)
    expect(basic!.schedule!.difficulty).toBeLessThanOrEqual(10)

    const clozeCards = deck.cards.filter((c) => c.front.includes('Hauptstadt von'))
    expect(clozeCards).toHaveLength(2)
    expect(clozeCards.some((c) => c.front.includes('[…] ist Paris'))).toBe(true)
    expect(clozeCards.some((c) => c.front.includes('Frankreich ist […]'))).toBe(true)
    expect(clozeCards.every((c) => c.back.includes('nur zur Info'))).toBe(true)
    expect(clozeCards.every((c) => c.schedule === null)).toBe(true)

    const withImage = deck.cards.find((c) => c.front === 'Mit Bild')
    expect(withImage!.back).toContain('[Bild: pic.png]')
  })

  it('wirft einen klaren Fehler, wenn keine Anki-Sammlung im ZIP liegt', async () => {
    const zip = new JSZip()
    zip.file('irgendwas.txt', 'kein anki')
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    await expect(extractApkg(bytes, { locateFile })).rejects.toThrow(/Anki-Sammlung/)
  })
})
