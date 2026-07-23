import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvailabilitySetup } from '../../src/ui/AvailabilitySetup'
import type { AvailabilityException, RecurringBlocker } from '../../src/data/schema'

function noop() {
  return {
    onSetPatternMinutes: vi.fn(),
    onAddException: vi.fn(),
    onRemoveException: vi.fn(),
    recurringBlockers: [] as RecurringBlocker[],
    onAddRecurringBlocker: vi.fn(),
    onRemoveRecurringBlocker: vi.fn(),
  }
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

  it('fügt eine Ausnahme für mehrere zur Auswahl hinzugefügte Tage gleichzeitig hinzu', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await user.type(screen.getByLabelText('Datum'), '2026-08-03')
    await user.click(screen.getByRole('button', { name: 'Tag zur Auswahl hinzufügen' }))
    await user.type(screen.getByLabelText('Datum'), '2026-08-05')
    await user.click(screen.getByRole('button', { name: 'Tag zur Auswahl hinzufügen' }))

    expect(screen.getByText('2026-08-03')).toBeInTheDocument()
    expect(screen.getByText('2026-08-05')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Minuten'), '45')
    await user.type(screen.getByLabelText('Notiz'), 'Ferien')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).toHaveBeenCalledTimes(2)
    expect(onAddException).toHaveBeenCalledWith('2026-08-03', 45, 'Ferien')
    expect(onAddException).toHaveBeenCalledWith('2026-08-05', 45, 'Ferien')
  })

  it('entfernt einen Tag wieder aus der Auswahl, bevor gespeichert wird', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await user.type(screen.getByLabelText('Datum'), '2026-08-03')
    await user.click(screen.getByRole('button', { name: 'Tag zur Auswahl hinzufügen' }))
    await user.type(screen.getByLabelText('Datum'), '2026-08-05')
    await user.click(screen.getByRole('button', { name: 'Tag zur Auswahl hinzufügen' }))

    await user.click(screen.getByRole('button', { name: '2026-08-03 aus Auswahl entfernen' }))
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).toHaveBeenCalledTimes(1)
    expect(onAddException).toHaveBeenCalledWith('2026-08-05', 0, null)
  })

  it('entfernt eine Ausnahme', async () => {
    const user = userEvent.setup()
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: null }]
    const onRemoveException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={exceptions} {...noop()} onRemoveException={onRemoveException} />)

    await user.click(screen.getByRole('button', { name: 'Entfernen' }))
    expect(onRemoveException).toHaveBeenCalledWith('2026-08-03')
  })

  describe('Wiederkehrende Blocker', () => {
    it('listet bestehende wiederkehrende Blocker mit Wochentag, Uhrzeit und Bezeichnung', () => {
      const recurringBlockers: RecurringBlocker[] = [
        { id: 1, weekday: 1, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' },
      ]
      render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} recurringBlockers={recurringBlockers} />)
      expect(screen.getByText(/Montag, 12:00–13:00: Mittagspause/)).toBeInTheDocument()
    })

    it('fügt einen neuen wiederkehrenden Blocker mit den Formularwerten hinzu', async () => {
      const user = userEvent.setup()
      const onAddRecurringBlocker = vi.fn()
      render(
        <AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />,
      )

      await user.selectOptions(screen.getByLabelText('Wochentag'), 'Dienstag')
      fireEvent.change(screen.getByLabelText('Von'), { target: { value: '18:00' } })
      fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '19:30' } })
      await user.type(screen.getByLabelText('Bezeichnung'), 'Gym')
      await user.click(screen.getByRole('button', { name: 'Blocker hinzufügen' }))

      expect(onAddRecurringBlocker).toHaveBeenCalledWith({ weekday: 2, starts_at: '18:00', ends_at: '19:30', label: 'Gym' })
    })

    it('verweigert das Hinzufügen, wenn "Bis" nicht nach "Von" liegt', async () => {
      const user = userEvent.setup()
      const onAddRecurringBlocker = vi.fn()
      render(
        <AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />,
      )

      fireEvent.change(screen.getByLabelText('Von'), { target: { value: '13:00' } })
      fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '12:00' } })
      await user.type(screen.getByLabelText('Bezeichnung'), 'Ungültig')

      expect(screen.getByRole('button', { name: 'Blocker hinzufügen' })).toBeDisabled()
      expect(screen.getByText('„Bis" muss nach „Von" liegen.')).toBeInTheDocument()
      expect(onAddRecurringBlocker).not.toHaveBeenCalled()
    })

    it('verweigert das Hinzufügen ohne Bezeichnung', async () => {
      const user = userEvent.setup()
      const onAddRecurringBlocker = vi.fn()
      render(
        <AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />,
      )

      await user.click(screen.getByRole('button', { name: 'Blocker hinzufügen' }))
      expect(onAddRecurringBlocker).not.toHaveBeenCalled()
    })

    it('entfernt einen wiederkehrenden Blocker', async () => {
      const user = userEvent.setup()
      const recurringBlockers: RecurringBlocker[] = [
        { id: 5, weekday: 3, starts_at: '19:00', ends_at: '20:00', label: 'Abendessen' },
      ]
      const onRemoveRecurringBlocker = vi.fn()
      render(
        <AvailabilitySetup
          pattern={[]}
          exceptions={[]}
          {...noop()}
          recurringBlockers={recurringBlockers}
          onRemoveRecurringBlocker={onRemoveRecurringBlocker}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Entfernen' }))
      expect(onRemoveRecurringBlocker).toHaveBeenCalledWith(5)
    })
  })
})
