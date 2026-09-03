import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBanner } from '../../src/ui/ErrorBanner'

describe('ErrorBanner', () => {
  it('zeigt nichts ohne Fehlermeldung', () => {
    const { container } = render(<ErrorBanner message={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('zeigt die Meldung mit dringlicher role="alert"', () => {
    render(<ErrorBanner message="Fach konnte nicht gespeichert werden" onDismiss={vi.fn()} />)

    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent('Nicht gespeichert.')
    expect(banner).toHaveTextContent('Fach konnte nicht gespeichert werden')
    expect(banner).toHaveTextContent('Bitte den Vorgang erneut versuchen.')
  })

  it('ruft onDismiss beim Schließen auf', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Prüfung konnte nicht gelöscht werden" onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Fehlermeldung schließen' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
