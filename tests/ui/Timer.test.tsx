import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timer } from '../../src/ui/Timer'

// fireEvent statt userEvent: userEvent hängt sich in Kombination mit
// vi.useFakeTimers() auf (bekannte Inkompatibilität), fireEvent ist
// synchron und kollidiert nicht mit den gefakten Timern.

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt die Standarddauer des ersten Presets (25 Min.) an', () => {
    render(<Timer />)
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByText(/Arbeit/)).toBeInTheDocument()
  })

  it('wechselt bei Auswahl eines anderen Presets die angezeigte Dauer', () => {
    render(<Timer />)
    fireEvent.click(screen.getByLabelText('35 / 10'))
    expect(screen.getByText('35:00')).toBeInTheDocument()
  })

  it('zählt beim Start jede Sekunde herunter', () => {
    render(<Timer />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('24:57')).toBeInTheDocument()
  })

  it('meldet die bisher gearbeiteten Minuten über onElapsedWorkMinutesChange', () => {
    const onElapsedWorkMinutesChange = vi.fn()
    render(<Timer onElapsedWorkMinutesChange={onElapsedWorkMinutesChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(onElapsedWorkMinutesChange).toHaveBeenCalledWith(1)
  })

  it('wechselt nach Ablauf der Arbeitszeit automatisch in die Pause', () => {
    render(<Timer />)
    fireEvent.click(screen.getByLabelText('Eigene Werte'))
    fireEvent.change(screen.getByLabelText('Arbeit (Min.)'), { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByText(/^Pause:/)).toBeInTheDocument()
  })

  it('setzt Zeit und Fortschritt beim Zurücksetzen zurück', () => {
    render(<Timer />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })
})
