import { describe, expect, it } from 'vitest'
import { htmlToPlainText, looksLikeHtml, sanitizeCardHtml } from '../../src/ingest/htmlSanitize'

describe('sanitizeCardHtml', () => {
  it('behält erlaubte Formatierungs-Tags, wirft ihre Attribute weg', () => {
    expect(sanitizeCardHtml('<p class="x" style="color:red">a <b>b</b></p>')).toBe('<p>a <b>b</b></p>')
  })

  it('entfernt nicht erlaubte Tags, behält aber ihren Textinhalt', () => {
    expect(sanitizeCardHtml('<a href="http://x">Link</a> Text')).toBe('Link Text')
  })

  it('entfernt <script> samt Inhalt und Event-Handler', () => {
    expect(sanitizeCardHtml('<div onclick="evil()">hi</div><script>steal()</script>')).toBe('<div>hi</div>')
  })

  it('lässt nur data:image-Quellen an <img> durch', () => {
    expect(sanitizeCardHtml('<img src="https://example.com/x.png">')).toBe('')
    const ok = sanitizeCardHtml('<img src="data:image/png;base64,AAAA" alt="Bild">')
    expect(ok).toBe('<img src="data:image/png;base64,AAAA" alt="Bild">')
  })

  it('entfernt javascript:-URIs auch als data-URI-Trick', () => {
    expect(sanitizeCardHtml('<img src="javascript:alert(1)">')).toBe('')
  })
})

describe('looksLikeHtml', () => {
  it('erkennt Tags und Entities', () => {
    expect(looksLikeHtml('<b>x</b>')).toBe(true)
    expect(looksLikeHtml('a &amp; b')).toBe(true)
  })

  it('behandelt reinen Text (auch mit < als Vergleichszeichen) als kein HTML', () => {
    expect(looksLikeHtml('x < y und y > 0')).toBe(false)
    expect(looksLikeHtml('einfacher Kartentext')).toBe(false)
  })
})

describe('htmlToPlainText', () => {
  it('reduziert Tags, <br> → Zeilenumbruch, Entities dekodiert', () => {
    expect(htmlToPlainText('a<br>b&nbsp;c <b>d</b>')).toBe('a\nb c d')
  })

  it('markiert eingebettete Bilder als [Bild]', () => {
    expect(htmlToPlainText('<img src="data:image/png;base64,AAAA"> Ende')).toContain('[Bild]')
  })
})
