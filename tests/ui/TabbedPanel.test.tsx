import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TabbedPanel } from '../../src/ui/TabbedPanel'

describe('TabbedPanel', () => {
  it('zeigt standardmäßig den ersten Reiter', () => {
    render(
      <TabbedPanel
        tablistLabel="Test-Bereiche"
        tabs={[
          { key: 'a', label: 'A', content: <p>Inhalt A</p> },
          { key: 'b', label: 'B', content: <p>Inhalt B</p> },
        ]}
      />,
    )
    expect(screen.getByText('Inhalt A')).toBeVisible()
    expect(screen.getByText('Inhalt B')).not.toBeVisible()
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true')
  })

  it('wechselt den sichtbaren Inhalt beim Klick auf einen anderen Reiter', async () => {
    const user = userEvent.setup()
    render(
      <TabbedPanel
        tablistLabel="Test-Bereiche"
        tabs={[
          { key: 'a', label: 'A', content: <p>Inhalt A</p> },
          { key: 'b', label: 'B', content: <p>Inhalt B</p> },
        ]}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'B' }))

    expect(screen.getByText('Inhalt B')).toBeVisible()
    expect(screen.getByText('Inhalt A')).not.toBeVisible()
  })

  it('benennt die Reiterleiste über tablistLabel', () => {
    render(<TabbedPanel tablistLabel="Meine Reiter" tabs={[{ key: 'a', label: 'A', content: <p>A</p> }]} />)
    expect(screen.getByRole('tablist', { name: 'Meine Reiter' })).toBeInTheDocument()
  })

  it('behält alle Panels im DOM (nur "hidden", kein bedingtes Unmounten)', async () => {
    const user = userEvent.setup()
    render(
      <TabbedPanel
        tablistLabel="Test-Bereiche"
        tabs={[
          { key: 'a', label: 'A', content: <input placeholder="Entwurf" /> },
          { key: 'b', label: 'B', content: <p>Inhalt B</p> },
        ]}
      />,
    )

    await user.type(screen.getByPlaceholderText('Entwurf'), 'Text')
    await user.click(screen.getByRole('tab', { name: 'B' }))
    await user.click(screen.getByRole('tab', { name: 'A' }))

    expect(screen.getByPlaceholderText('Entwurf')).toHaveValue('Text')
  })
})
