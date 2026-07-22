import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NotificationBanner } from '../../src/ui/NotificationBanner'
import type { NotificationContent } from '../../src/domain/notifications'

describe('NotificationBanner', () => {
  it('zeigt nichts ohne fällige Benachrichtigungen', () => {
    const { container } = render(<NotificationBanner notifications={[]} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('zeigt Titel und Text jeder fälligen Benachrichtigung', () => {
    const notifications: NotificationContent[] = [
      { kind: 'tagesuebersicht', title: 'Heute im Lernplan', body: '2 Lernblöcke, 90 Minuten geplant' },
      { kind: 'faelligkeit', title: 'Prüfung bald fällig', body: 'Microeconomics (2026-08-01)' },
    ]
    render(<NotificationBanner notifications={notifications} onDismiss={vi.fn()} />)

    expect(screen.getByText('Heute im Lernplan')).toBeInTheDocument()
    expect(screen.getByText(/90 Minuten geplant/)).toBeInTheDocument()
    expect(screen.getByText('Prüfung bald fällig')).toBeInTheDocument()
    expect(screen.getByText(/Microeconomics/)).toBeInTheDocument()
  })

  it('ruft onDismiss auf und blendet nur die geschlossene Benachrichtigung aus', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    const notifications: NotificationContent[] = [
      { kind: 'tagesuebersicht', title: 'Heute im Lernplan', body: 'x' },
      { kind: 'faelligkeit', title: 'Prüfung bald fällig', body: 'y' },
    ]
    render(<NotificationBanner notifications={notifications} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Heute im Lernplan schließen' }))

    expect(onDismiss).toHaveBeenCalledWith('tagesuebersicht')
    expect(screen.queryByText('Heute im Lernplan')).not.toBeInTheDocument()
    expect(screen.getByText('Prüfung bald fällig')).toBeInTheDocument()
  })
})
