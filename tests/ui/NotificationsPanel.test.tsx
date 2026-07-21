import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NotificationsPanel } from '../../src/ui/NotificationsPanel'
import type { NotificationContent } from '../../src/domain/notifications'

describe('NotificationsPanel', () => {
  it('zeigt "keine neuen Benachrichtigungen", wenn onCheckNow ein leeres Array liefert', async () => {
    const user = userEvent.setup()
    render(<NotificationsPanel onCheckNow={async () => []} />)
    await user.click(screen.getByRole('button', { name: 'Jetzt prüfen' }))
    expect(await screen.findByText(/keine neuen benachrichtigungen/i)).toBeInTheDocument()
  })

  it('listet die gezeigten Benachrichtigungen', async () => {
    const user = userEvent.setup()
    const notifications: NotificationContent[] = [
      { kind: 'tagesuebersicht', title: 'Heute im Lernplan', body: '2 Lernblöcke, 90 Minuten geplant: X' },
    ]
    render(<NotificationsPanel onCheckNow={async () => notifications} />)
    await user.click(screen.getByRole('button', { name: 'Jetzt prüfen' }))
    expect(await screen.findByText(/Heute im Lernplan: 2 Lernblöcke/)).toBeInTheDocument()
  })

  it('zeigt eine Fehlermeldung, wenn onCheckNow wirft (z. B. außerhalb der echten App)', async () => {
    const user = userEvent.setup()
    render(
      <NotificationsPanel
        onCheckNow={async () => {
          throw new Error('keine Tauri-IPC-Bridge')
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Jetzt prüfen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nur in der echten app verfügbar/i)
  })
})
