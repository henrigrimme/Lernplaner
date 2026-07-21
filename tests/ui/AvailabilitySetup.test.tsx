import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvailabilitySetup } from '../../src/ui/AvailabilitySetup'
import type { AvailabilityException } from '../../src/data/schema'

function noop() {
  return { onSetPatternMinutes: vi.fn(), onAddException: vi.fn(), onRemoveException: vi.fn() }
}

describe('AvailabilitySetup', () => {
  it('zeigt 0 Minuten für einen Wochentag ohne Eintrag', () => {
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} />)
    expect(screen.getByLabelText(/Montag/)).toHaveValue(0)
  })

  it('meldet eine geänderte Wochentag-Minutenzahl', () => {
    // Kontrollierte Zahlen-Inputs: der Anzeigewert kommt aus der `pattern`-Prop,
    // die dieser Test (bewusst, wie eine reine Präsentationskomponente es
    // erwarten lässt) nicht zwischen Tastendrücken aktualisiert — deshalb ein
    // einzelnes fireEvent.change mit dem vollständigen Zielwert statt user.type.
    const onSetPatternMinutes = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onSetPatternMinutes={onSetPatternMinutes} />)

    fireEvent.change(screen.getByLabelText(/Montag/), { target: { value: '120' } })

    expect(onSetPatternMinutes).toHaveBeenCalledWith(1, 120)
  })

  it('listet bestehende Ausnahmen', () => {
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: 'Zahnarzt' }]
    render(<AvailabilitySetup pattern={[]} exceptions={exceptions} {...noop()} />)
    expect(screen.getByText(/2026-08-03/)).toBeInTheDocument()
    expect(screen.getByText(/Zahnarzt/)).toBeInTheDocument()
  })

  it('fügt eine neue Ausnahme hinzu', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await user.type(screen.getByLabelText('Datum'), '2026-08-03')
    await user.type(screen.getByLabelText('Minuten'), '30')
    await user.type(screen.getByLabelText('Notiz'), 'Zahnarzt')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).toHaveBeenCalledWith('2026-08-03', 30, 'Zahnarzt')
  })

  it('entfernt eine Ausnahme', async () => {
    const user = userEvent.setup()
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: null }]
    const onRemoveException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={exceptions} {...noop()} onRemoveException={onRemoveException} />)

    await user.click(screen.getByRole('button', { name: 'Entfernen' }))
    expect(onRemoveException).toHaveBeenCalledWith('2026-08-03')
  })
})
