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

// Seit v0.29.0 sind die drei Bereiche in Reiter aufgeteilt (Impeccable-P1).
// "Wochenmuster" ist der Standardreiter; für die anderen beiden muss der
// Test den Reiter erst öffnen, sonst liegt sein Inhalt in einem `hidden`
// Panel und `getByRole` findet die Bedienelemente nicht.
async function openTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('tab', { name }))
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

  it('listet bestehende Ausnahmen', async () => {
    const user = userEvent.setup()
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: 'Zahnarzt' }]
    render(<AvailabilitySetup pattern={[]} exceptions={exceptions} {...noop()} />)

    await openTab(user, 'Abweichende Tage')

    expect(screen.getByText(/2026-08-03/)).toBeVisible()
    expect(screen.getByText(/Zahnarzt/)).toBeVisible()
  })

  it('fügt eine neue Ausnahme hinzu', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await openTab(user, 'Abweichende Tage')
    await user.type(screen.getByLabelText('Datum'), '2026-08-03')
    await user.type(screen.getByLabelText('Minuten'), '30')
    await user.type(screen.getByLabelText('Notiz'), 'Zahnarzt')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).toHaveBeenCalledWith('2026-08-03', 30, 'Zahnarzt')
  })

  it('fügt im Zeitraum-Modus für jeden Tag von–bis eine Ausnahme hinzu (ganzes Wochenende)', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await openTab(user, 'Abweichende Tage')
    await user.click(screen.getByRole('radio', { name: 'Zeitraum' }))
    await user.type(screen.getByLabelText('Von (erster Tag)'), '2026-08-01')
    await user.type(screen.getByLabelText('Bis (letzter Tag)'), '2026-08-03')
    await user.type(screen.getByLabelText('Minuten'), '0')
    await user.type(screen.getByLabelText('Notiz'), 'Wochenende')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).toHaveBeenCalledTimes(3)
    expect(onAddException).toHaveBeenCalledWith('2026-08-01', 0, 'Wochenende')
    expect(onAddException).toHaveBeenCalledWith('2026-08-02', 0, 'Wochenende')
    expect(onAddException).toHaveBeenCalledWith('2026-08-03', 0, 'Wochenende')
  })

  it('lehnt einen Zeitraum ab, dessen Ende vor dem Anfang liegt', async () => {
    const user = userEvent.setup()
    const onAddException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddException={onAddException} />)

    await openTab(user, 'Abweichende Tage')
    await user.click(screen.getByRole('radio', { name: 'Zeitraum' }))
    await user.type(screen.getByLabelText('Von (erster Tag)'), '2026-08-10')
    await user.type(screen.getByLabelText('Bis (letzter Tag)'), '2026-08-03')
    await user.click(screen.getByRole('button', { name: 'Ausnahme hinzufügen' }))

    expect(onAddException).not.toHaveBeenCalled()
    expect(screen.getByText('„Bis" muss auf oder nach „Von" liegen.')).toBeInTheDocument()
  })

  it('setzt per Regel alle Wochentage von–bis auf denselben Minutenwert', async () => {
    const user = userEvent.setup()
    const onSetPatternMinutes = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onSetPatternMinutes={onSetPatternMinutes} />)

    // Standard ist bereits Montag–Freitag.
    await user.type(screen.getByLabelText('Regel Minuten'), '120')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onSetPatternMinutes).toHaveBeenCalledTimes(5)
    for (const weekday of [1, 2, 3, 4, 5]) {
      expect(onSetPatternMinutes).toHaveBeenCalledWith(weekday, 120)
    }
  })

  it('deaktiviert die Regel, wenn „bis" vor „von" liegt', async () => {
    const user = userEvent.setup()
    const onSetPatternMinutes = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onSetPatternMinutes={onSetPatternMinutes} />)

    await user.selectOptions(screen.getByLabelText('Regel von Wochentag'), 'Freitag')
    await user.selectOptions(screen.getByLabelText('Regel bis Wochentag'), 'Montag')

    expect(screen.getByRole('button', { name: 'Anwenden' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))
    expect(onSetPatternMinutes).not.toHaveBeenCalled()
  })

  it('entfernt eine Ausnahme', async () => {
    const user = userEvent.setup()
    const exceptions: AvailabilityException[] = [{ date: '2026-08-03', minutes: 30, note: null }]
    const onRemoveException = vi.fn()
    render(<AvailabilitySetup pattern={[]} exceptions={exceptions} {...noop()} onRemoveException={onRemoveException} />)

    await openTab(user, 'Abweichende Tage')
    await user.click(screen.getByRole('button', { name: 'Ausnahme am 2026-08-03 entfernen' }))
    expect(onRemoveException).toHaveBeenCalledWith('2026-08-03')
  })

  it('teilt die Bereiche in Reiter auf und wechselt beim Klick', async () => {
    const user = userEvent.setup()
    render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} />)

    expect(screen.getByRole('tab', { name: 'Wochenmuster' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/Montag/)).toBeVisible()

    await openTab(user, 'Wiederkehrende Blocker')

    expect(screen.getByRole('tab', { name: 'Wiederkehrende Blocker' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Bezeichnung')).toBeVisible()
    expect(screen.getByLabelText(/Montag/)).not.toBeVisible()
  })

  describe('Wiederkehrende Blocker', () => {
    it('listet bestehende wiederkehrende Blocker mit Wochentag, Uhrzeit und Bezeichnung', async () => {
      const user = userEvent.setup()
      const recurringBlockers: RecurringBlocker[] = [
        { id: 1, weekday: 1, starts_at: '12:00', ends_at: '13:00', label: 'Mittagspause' },
      ]
      render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} recurringBlockers={recurringBlockers} />)

      await openTab(user, 'Wiederkehrende Blocker')
      expect(screen.getByText(/Montag, 12:00–13:00: Mittagspause/)).toBeVisible()
    })

    it('fügt einen neuen wiederkehrenden Blocker mit den Formularwerten hinzu', async () => {
      const user = userEvent.setup()
      const onAddRecurringBlocker = vi.fn()
      render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />)

      await openTab(user, 'Wiederkehrende Blocker')
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
      render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />)

      await openTab(user, 'Wiederkehrende Blocker')
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
      render(<AvailabilitySetup pattern={[]} exceptions={[]} {...noop()} onAddRecurringBlocker={onAddRecurringBlocker} />)

      await openTab(user, 'Wiederkehrende Blocker')
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

      await openTab(user, 'Wiederkehrende Blocker')
      await user.click(screen.getByRole('button', { name: 'Blocker "Abendessen" entfernen' }))
      expect(onRemoveRecurringBlocker).toHaveBeenCalledWith(5)
    })
  })
})
