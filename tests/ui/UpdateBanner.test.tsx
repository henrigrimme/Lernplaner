import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UpdateBanner } from '../../src/ui/UpdateBanner'

describe('UpdateBanner', () => {
  it('zeigt nichts, wenn kein Update verfügbar ist', () => {
    const { container } = render(<UpdateBanner update={{ available: false }} onInstall={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('zeigt nichts, solange noch nicht geprüft wurde (update ist null)', () => {
    const { container } = render(<UpdateBanner update={null} onInstall={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('zeigt den Hinweis mit Versionsnummer, wenn ein Update verfügbar ist', () => {
    render(<UpdateBanner update={{ available: true, version: '0.5.0' }} onInstall={vi.fn()} />)
    expect(screen.getByText(/neues update ist verfügbar/i)).toBeInTheDocument()
    expect(screen.getByText(/0\.5\.0/)).toBeInTheDocument()
  })

  it('ruft onInstall auf, wenn "Neu starten zum Aktualisieren" geklickt wird', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn().mockResolvedValue(undefined)
    render(<UpdateBanner update={{ available: true, version: '0.5.0' }} onInstall={onInstall} />)

    await user.click(screen.getByRole('button', { name: 'Neu starten zum Aktualisieren' }))
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('blendet den Hinweis für die Sitzung aus, wenn "Schließen" geklickt wird', async () => {
    const user = userEvent.setup()
    render(<UpdateBanner update={{ available: true, version: '0.5.0' }} onInstall={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Update-Hinweis schließen' }))
    expect(screen.queryByText(/neues update ist verfügbar/i)).not.toBeInTheDocument()
  })
})
