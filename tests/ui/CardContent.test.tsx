import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardContent } from '../../src/ui/CardContent'

describe('CardContent', () => {
  it('rendert reinen Text mit erhaltenen Zeilenumbrüchen', () => {
    const { container } = render(<CardContent html={'Zeile 1\nZeile 2'} side="front" />)
    const el = container.querySelector('.card-content')!
    expect(el.className).toContain('card-content-plain')
    expect(el.textContent).toBe('Zeile 1\nZeile 2')
  })

  it('rendert erlaubtes HTML importierter Karten', () => {
    const { container } = render(<CardContent html={'<b>fett</b> und Liste'} side="back" />)
    expect(container.querySelector('b')!.textContent).toBe('fett')
  })

  it('filtert gefährliches Markup importierter Karten heraus', () => {
    const { container } = render(
      <CardContent html={'<img src="x.png"><div onclick="x()">ok</div><script>bad()</script>'} side="front" />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull() // kein data:-URI
    expect(container.querySelector('div[onclick]')).toBeNull()
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('zeigt eingebettete data:-Bilder importierter Karten', () => {
    const { container } = render(
      <CardContent html={'<img src="data:image/png;base64,AAAA" alt="Diagramm">'} side="back" />,
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA')
  })
})
