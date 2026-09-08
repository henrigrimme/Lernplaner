import { describe, expect, it } from 'vitest'
import { renderMarkdownToHtml } from '../../src/ui/renderMarkdown'

describe('renderMarkdownToHtml', () => {
  it('rendert fett, kursiv und Inline-Code', () => {
    expect(renderMarkdownToHtml('Das ist **fett**, das _kursiv_ und `code`.')).toBe(
      '<p>Das ist <strong>fett</strong>, das <em>kursiv</em> und <code>code</code>.</p>',
    )
  })

  it('rendert eine Aufzählung', () => {
    const html = renderMarkdownToHtml('Plan:\n- Montag Micro\n- Dienstag Macro')
    expect(html).toBe('<p>Plan:</p>\n<ul>\n<li>Montag Micro</li>\n<li>Dienstag Macro</li>\n</ul>')
  })

  it('rendert eine nummerierte Liste', () => {
    expect(renderMarkdownToHtml('1. eins\n2. zwei')).toBe('<ol>\n<li>eins</li>\n<li>zwei</li>\n</ol>')
  })

  it('macht aus Überschriften fett gesetzte Absätze', () => {
    expect(renderMarkdownToHtml('## Zusammenfassung')).toBe('<p><strong>Zusammenfassung</strong></p>')
  })

  it('trennt Absätze an Leerzeilen, einfache Umbrüche werden <br>', () => {
    expect(renderMarkdownToHtml('Zeile eins\nZeile zwei\n\nNeuer Absatz')).toBe(
      '<p>Zeile eins<br>Zeile zwei</p>\n<p>Neuer Absatz</p>',
    )
  })

  it('zeigt bei Links nur den Linktext', () => {
    expect(renderMarkdownToHtml('Siehe [die Doku](https://example.com/x).')).toBe('<p>Siehe die Doku.</p>')
  })

  it('escaped HTML aus der KI-Antwort und lässt kein Script durch', () => {
    const html = renderMarkdownToHtml('Vorsicht <script>alert(1)</script> und <b>roh</b>.')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('lässt normalen Text mit Zahlen/Sternchen in Ruhe', () => {
    expect(renderMarkdownToHtml('In 3 Tagen, ca. 2 * 4 = 8.')).toBe('<p>In 3 Tagen, ca. 2 * 4 = 8.</p>')
  })
})
