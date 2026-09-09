import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvailabilityAssistant } from '../../src/ui/AvailabilityAssistant'
import type { AvailabilityProposal } from '../../src/ai/types'

const PROPOSAL: AvailabilityProposal = {
  weekdayMinutes: [
    { weekday: 1, minutes: 120 },
    { weekday: 6, minutes: 0 },
  ],
  exceptions: [{ date: '2026-10-20', minutes: 0, note: 'Urlaub' }],
  recurringBlockers: [{ weekday: 2, startsAt: '18:00', endsAt: '19:30', label: 'Gym' }],
  summary: 'Mo 2h, Sa nichts, 20.10. weg, Di Gym.',
}

describe('AvailabilityAssistant', () => {
  it('zeigt den Vorschlag als Vorschau und übernimmt ihn erst auf Klick', async () => {
    const user = userEvent.setup()
    const onParse = vi.fn().mockResolvedValue(PROPOSAL)
    const onApply = vi.fn()
    render(<AvailabilityAssistant onParse={onParse} onApply={onApply} />)

    await user.type(screen.getByLabelText('Deine Verfügbarkeit'), 'Mo 2h, Sa nichts')
    await user.click(screen.getByRole('button', { name: 'Vorschlag von Sven' }))

    expect(onParse).toHaveBeenCalledWith('Mo 2h, Sa nichts')
    expect(await screen.findByText(/Mo 2h, Sa nichts, 20.10. weg/)).toBeInTheDocument()
    expect(screen.getByText('Montag: 120 Min.')).toBeInTheDocument()
    expect(screen.getByText('Blocker Dienstag 18:00–19:30: Gym')).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(onApply).toHaveBeenCalledWith(PROPOSAL)
    expect(screen.getByRole('status')).toHaveTextContent('4 Eintrag/Einträge übernommen')
  })

  it('verwirft den Vorschlag ohne zu übernehmen', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<AvailabilityAssistant onParse={vi.fn().mockResolvedValue(PROPOSAL)} onApply={onApply} />)

    await user.type(screen.getByLabelText('Deine Verfügbarkeit'), 'irgendwas')
    await user.click(screen.getByRole('button', { name: 'Vorschlag von Sven' }))
    await screen.findByRole('button', { name: 'Übernehmen' })
    await user.click(screen.getByRole('button', { name: 'Verwerfen' }))

    expect(screen.queryByRole('button', { name: 'Übernehmen' })).not.toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('meldet, wenn die KI nichts Anwendbares erkennt', async () => {
    const user = userEvent.setup()
    const empty: AvailabilityProposal = { weekdayMinutes: [], exceptions: [], recurringBlockers: [], summary: '' }
    render(<AvailabilityAssistant onParse={vi.fn().mockResolvedValue(empty)} onApply={vi.fn()} />)

    await user.type(screen.getByLabelText('Deine Verfügbarkeit'), 'bla')
    await user.click(screen.getByRole('button', { name: 'Vorschlag von Sven' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/keine Verfügbarkeit ableiten/)
  })

  it('zeigt einen KI-Fehler als Hinweis', async () => {
    const user = userEvent.setup()
    render(
      <AvailabilityAssistant
        onParse={vi.fn().mockRejectedValue(new Error('Kein KI-Anbieter konfiguriert'))}
        onApply={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Deine Verfügbarkeit'), 'bla')
    await user.click(screen.getByRole('button', { name: 'Vorschlag von Sven' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kein KI-Anbieter konfiguriert')
  })

  it('sendet keinen leeren Text', async () => {
    const user = userEvent.setup()
    const onParse = vi.fn()
    render(<AvailabilityAssistant onParse={onParse} onApply={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Vorschlag von Sven' })).toBeDisabled()
    await user.type(screen.getByLabelText('Deine Verfügbarkeit'), '   ')
    expect(screen.getByRole('button', { name: 'Vorschlag von Sven' })).toBeDisabled()
    expect(onParse).not.toHaveBeenCalled()
  })
})
