import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvailabilitySetup } from '../../src/ui/AvailabilitySetup'
import type { AvailabilityException, AvailabilityPattern } from '../../src/data/schema'

describe('AvailabilitySetup', () => {
  it('zeigt 0 Minuten für einen Wochentag ohne Eintrag', () => {
    render(
      <AvailabilitySetup
        pattern={[]}
        exceptions={[]}
        onChangePattern={vi.fn()}
        onChangeExceptions={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/Montag/)).toHaveValue(0)
  })

  it('aktualisiert das Wochenmuster beim Ändern eines Wertes', () => {
    // Kontrollierte Zahlen-Inputs: der Anzeigewert kommt aus der `pattern`-Prop,
    // die dieser Test (bewusst, wie eine reine Präsentationskomponente es
    // erwarten lässt) nicht zwischen Tastendrücken aktualisiert — deshalb ein
    // einzelnes fireEvent.change mit dem vollständigen Zielwert statt user.type.
    const onChangePattern = vi.fn()
    render(
      <AvailabilitySetup
        pattern={[]}
        exceptions={[]}
        onChangePattern={onChangePattern}
        onChangeExceptions={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Montag/), { target: { value: '120' } })

    const lastCall = onChangePattern.mock.calls.at(-1)![0] as AvailabilityPattern[]
    expect(lastCall).toContainEqual({ weekday: 1, minutes: 120 })
  })

  it('listet bestehende Ausnahmen', () => {
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: 'Zahnarzt' }]
    render(
      <AvailabilitySetup pattern={[]} exceptions={exceptions} onChangePattern={vi.fn()} onChangeExceptions={vi.fn()} />,
    )
    expect(screen.getByText(/2026-08-03/)).toBeInTheDocument()
    expect(screen.getByText(/Zahnarzt/)).toBeInTheDocument()
  })

  it('fügt eine neue Ausnahme hinzu', async () => {
    const user = userEvent.setup()
    const onChangeExceptions = vi.fn()
    render(
      <AvailabilitySetup pattern={[]} exceptions={[]} onChangePattern={vi.fn()} onChangeExceptions={onChangeExceptions} />,
    )

    await user.type(screen.getByLabelText('Datum'), '2026-08-03')
    await user.type(screen.getByLabelText('Minuten'), '30')
    await user.type(screen.getByLabelText('Notiz'), 'Zahnarzt')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onChangeExceptions).toHaveBeenCalledWith([{ date: '2026-08-03', minutes: 30, note: 'Zahnarzt' }])
  })

  it('entfernt eine Ausnahme', async () => {
    const user = userEvent.setup()
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: null }]
    const onChangeExceptions = vi.fn()
    render(
      <AvailabilitySetup
        pattern={[]}
        exceptions={exceptions}
        onChangePattern={vi.fn()}
        onChangeExceptions={onChangeExceptions}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Entfernen' }))
    expect(onChangeExceptions).toHaveBeenCalledWith([])
  })
})
