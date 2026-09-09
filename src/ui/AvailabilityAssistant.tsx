import { useState } from 'react'
import type { AvailabilityProposal } from '../ai/types'
import { describeAvailabilityProposal, isEmptyAvailabilityProposal } from '../domain/availabilityProposal'

/**
 * „Sven"-Verfügbarkeits-Assistent (Nutzerwunsch 2026-09-08: „einfacher als
 * die ganzen Tage anzuklicken"). Freitext rein → strukturierter Vorschlag
 * raus → Vorschau → „Übernehmen". Nach ADR-005 wird nichts direkt
 * geschrieben; erst „Übernehmen" ruft `onApply`.
 *
 * Reine Präsentation: `onParse` (KI-Aufruf) und `onApply` (schreiben über
 * die bestehenden Verfügbarkeits-Callbacks) kommen von `App.tsx`.
 */

export interface AvailabilityAssistantProps {
  onParse: (text: string) => Promise<AvailabilityProposal>
  onApply: (proposal: AvailabilityProposal) => void
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; proposal: AvailabilityProposal }
  | { phase: 'applied'; count: number }
  | { phase: 'error'; message: string }

export function AvailabilityAssistant({ onParse, onApply }: AvailabilityAssistantProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState<State>({ phase: 'idle' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    setState({ phase: 'loading' })
    try {
      const proposal = await onParse(trimmed)
      if (isEmptyAvailabilityProposal(proposal)) {
        setState({ phase: 'error', message: 'Daraus konnte Sven keine Verfügbarkeit ableiten — versuch es konkreter.' })
        return
      }
      setState({ phase: 'ready', proposal })
    } catch (error) {
      setState({ phase: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const apply = () => {
    if (state.phase !== 'ready') return
    onApply(state.proposal)
    const count =
      state.proposal.weekdayMinutes.length + state.proposal.exceptions.length + state.proposal.recurringBlockers.length
    setState({ phase: 'applied', count })
    setText('')
  }

  return (
    <section className="assistant-box" aria-label="Verfügbarkeit per Text">
      <h3>Mit Sven ausfüllen</h3>
      <p className="empty-state-inline">
        Beschreib deine Woche in eigenen Worten — z. B. „Mo bis Fr abends etwa 2 Stunden, Wochenende nichts,
        Mittagspause 12–13 Uhr, am 20.10. bin ich weg". Sven macht daraus einen Vorschlag, den du prüfen kannst.
      </p>
      <form onSubmit={submit}>
        <label>
          Deine Verfügbarkeit
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Mo–Fr abends 2h, Wochenende frei …"
          />
        </label>
        <button type="submit" disabled={text.trim().length === 0 || state.phase === 'loading'}>
          {state.phase === 'loading' ? 'Sven denkt nach …' : 'Vorschlag von Sven'}
        </button>
      </form>

      {state.phase === 'error' && <p role="alert">{state.message}</p>}

      {state.phase === 'applied' && (
        <p role="status">{state.count} Eintrag/Einträge übernommen — unten in den Reitern anpassbar.</p>
      )}

      {state.phase === 'ready' && (
        <div className="assistant-proposal">
          {state.proposal.summary && <p><strong>Sven:</strong> {state.proposal.summary}</p>}
          <ul>
            {describeAvailabilityProposal(state.proposal).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="empty-state-inline">
            „Übernehmen" setzt diese Werte (bestehende Wochentage/Tage mit gleichem Datum werden überschrieben).
          </p>
          <div className="assistant-proposal-actions">
            <button type="button" className="button-primary" onClick={apply}>
              Übernehmen
            </button>
            <button type="button" onClick={() => setState({ phase: 'idle' })}>
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
