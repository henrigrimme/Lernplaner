import { useEffect, useRef, useState } from 'react'

/**
 * Session-Timer für die Heute-Ansicht (ROADMAP.md Phase 3). Presets nach
 * der in CONTEXT.md „Recherche: Pomodoro/Session-Timing" dokumentierten
 * Empfehlung: kein einzelner Standardwert passt für alle, deshalb 25/5,
 * 35/10, 50/10 zur Auswahl **plus** frei einstellbare eigene Werte (vom
 * Nutzer ausdrücklich gewünscht: „dass man sich die Timer selbst im
 * Voraus einstellen kann").
 *
 * Reine Präsentationskomponente (ARCHITECTURE.md „ui/ … keine
 * Geschäftslogik") — hält nur den Ablauf des Timers selbst; was mit der
 * gemessenen Arbeitszeit passiert (z. B. als Vorschlag für
 * `actual_minutes` in `TodayView`), entscheidet der Aufrufer über
 * `onElapsedWorkMinutesChange`.
 */

export interface TimerPreset {
  label: string
  workMinutes: number
  breakMinutes: number
}

export const TIMER_PRESETS: TimerPreset[] = [
  { label: '25 / 5', workMinutes: 25, breakMinutes: 5 },
  { label: '35 / 10', workMinutes: 35, breakMinutes: 10 },
  { label: '50 / 10 (Deep Work)', workMinutes: 50, breakMinutes: 10 },
]

export interface TimerProps {
  /** Wird bei jeder Änderung der bisher gearbeiteten Minuten aufgerufen (aufgerundet auf ganze Minuten). */
  onElapsedWorkMinutesChange?: (minutes: number) => void
}

type Phase = 'arbeit' | 'pause'

interface TimerState {
  phase: Phase
  remainingSeconds: number
  elapsedWorkSeconds: number
  running: boolean
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Timer({ onElapsedWorkMinutesChange }: TimerProps) {
  const [presetIndex, setPresetIndex] = useState(0)
  const [useCustom, setUseCustom] = useState(false)
  const [customWorkMinutes, setCustomWorkMinutes] = useState(25)
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5)

  const workMinutes = useCustom ? customWorkMinutes : TIMER_PRESETS[presetIndex]!.workMinutes
  const breakMinutes = useCustom ? customBreakMinutes : TIMER_PRESETS[presetIndex]!.breakMinutes

  const workMinutesRef = useRef(workMinutes)
  const breakMinutesRef = useRef(breakMinutes)
  workMinutesRef.current = workMinutes
  breakMinutesRef.current = breakMinutes

  const [state, setState] = useState<TimerState>({
    phase: 'arbeit',
    remainingSeconds: workMinutes * 60,
    elapsedWorkSeconds: 0,
    running: false,
  })

  // Solange der Timer noch nicht lief (frischer Zustand), folgt die
  // Anzeige einer geänderten Dauer — nach dem Start/Zurücksetzen nicht mehr,
  // um eine laufende Sitzung nicht rückwirkend zu verändern.
  useEffect(() => {
    if (!state.running && state.elapsedWorkSeconds === 0 && state.phase === 'arbeit') {
      setState((s) => ({ ...s, remainingSeconds: workMinutes * 60 }))
    }
  }, [workMinutes])

  useEffect(() => {
    if (!state.running) return
    const id = setInterval(() => {
      setState((s) => {
        const elapsedWorkSeconds = s.phase === 'arbeit' ? s.elapsedWorkSeconds + 1 : s.elapsedWorkSeconds
        if (s.remainingSeconds <= 1) {
          const nextPhase: Phase = s.phase === 'arbeit' ? 'pause' : 'arbeit'
          const nextRemaining = (nextPhase === 'arbeit' ? workMinutesRef.current : breakMinutesRef.current) * 60
          return { phase: nextPhase, remainingSeconds: nextRemaining, elapsedWorkSeconds, running: true }
        }
        return { ...s, remainingSeconds: s.remainingSeconds - 1, elapsedWorkSeconds }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.running])

  useEffect(() => {
    onElapsedWorkMinutesChange?.(Math.round(state.elapsedWorkSeconds / 60))
  }, [state.elapsedWorkSeconds])

  const start = () => setState((s) => ({ ...s, running: true }))
  const pause = () => setState((s) => ({ ...s, running: false }))
  const reset = () =>
    setState({ phase: 'arbeit', remainingSeconds: workMinutesRef.current * 60, elapsedWorkSeconds: 0, running: false })

  const controlsDisabled = state.running || state.elapsedWorkSeconds > 0

  return (
    <div aria-label="Timer">
      <fieldset disabled={controlsDisabled}>
        <legend>Dauer</legend>
        {TIMER_PRESETS.map((preset, i) => (
          <label key={preset.label}>
            <input
              type="radio"
              name="timer-preset"
              checked={!useCustom && presetIndex === i}
              onChange={() => {
                setUseCustom(false)
                setPresetIndex(i)
              }}
            />
            {preset.label}
          </label>
        ))}
        <label>
          <input type="radio" name="timer-preset" checked={useCustom} onChange={() => setUseCustom(true)} />
          Eigene Werte
        </label>
        {useCustom && (
          <span>
            <label>
              Arbeit (Min.)
              <input
                type="number"
                min={1}
                value={customWorkMinutes}
                onChange={(e) => setCustomWorkMinutes(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label>
              Pause (Min.)
              <input
                type="number"
                min={1}
                value={customBreakMinutes}
                onChange={(e) => setCustomBreakMinutes(Math.max(1, Number(e.target.value)))}
              />
            </label>
          </span>
        )}
      </fieldset>

      <p>
        {state.phase === 'arbeit' ? 'Arbeit' : 'Pause'}: <strong>{formatTime(state.remainingSeconds)}</strong>
      </p>

      {state.running ? (
        <button type="button" onClick={pause}>
          Pause
        </button>
      ) : (
        <button type="button" onClick={start}>
          Start
        </button>
      )}
      <button type="button" onClick={reset}>
        Zurücksetzen
      </button>
    </div>
  )
}
