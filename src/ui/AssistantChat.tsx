import { useRef, useState } from 'react'
import type { AvailabilityProposal, ChatMessage, ChatProposal, ChatReply } from '../ai/types'
import { describeAvailabilityProposal } from '../domain/availabilityProposal'

/**
 * „Sven" — freies Lern-Gespräch (Nutzerwunsch 2026-09-08). Sven sieht
 * über den von `App.tsx` gebauten Kontext die aktuelle Lage (Fächer,
 * Fortschritt, Verfügbarkeit) und kann darüber sprechen. Er kann
 * Änderungen an Verfügbarkeit oder Themen-Gewichten **vorschlagen** —
 * angewandt wird erst per Klick (ADR-005: „vorschlagen, nie bevormunden").
 *
 * Der Verlauf lebt nur in dieser Sitzung (kein DB-Feld) — ein
 * persistenter Chatverlauf ist bewusst ein möglicher Folgeschritt, nicht
 * Teil dieser ersten Version.
 *
 * Reine Präsentation: `onSend` (KI-Aufruf mit Verlauf) und die
 * `onApply*`-Callbacks kommen von `App.tsx`.
 */

export interface AssistantChatProps {
  onSend: (history: ChatMessage[]) => Promise<ChatReply>
  onApplyAvailability: (proposal: AvailabilityProposal) => void
  onApplyTopicWeights: (changes: { topicId: number; weight: 1 | 2 | 3 | 4 | 5 }[]) => void
  /** Für die Anzeige „Thema X → Gewicht 5" statt nur der id. */
  topicName: (topicId: number) => string
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
  proposals?: ChatProposal[]
}

export function AssistantChat({ onSend, onApplyAvailability, onApplyTopicWeights, topicName }: AssistantChatProps) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
  const logRef = useRef<HTMLDivElement>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (text.length === 0 || busy) return
    setError(null)
    const nextTurns: Turn[] = [...turns, { role: 'user', content: text }]
    setTurns(nextTurns)
    setDraft('')
    setBusy(true)
    try {
      const history: ChatMessage[] = nextTurns.map((t) => ({ role: t.role, content: t.content }))
      const reply = await onSend(history)
      setTurns([...nextTurns, { role: 'assistant', content: reply.message || '(keine Antwort)', proposals: reply.proposals }])
      requestAnimationFrame(() => {
        const log = logRef.current
        // `scrollTo` fehlt in jsdom — im echten Browser ans Ende scrollen.
        if (log && typeof log.scrollTo === 'function') log.scrollTo({ top: log.scrollHeight })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setTurns(nextTurns) // die (fehlgeschlagene) Nutzer-Nachricht bleibt stehen
    } finally {
      setBusy(false)
    }
  }

  const applyProposal = (key: string, proposal: ChatProposal) => {
    if (proposal.kind === 'availability') onApplyAvailability(proposal.proposal)
    else onApplyTopicWeights(proposal.changes)
    setAppliedKeys((prev) => new Set(prev).add(key))
  }

  return (
    <section aria-label="Sven">
      <h2>Sven</h2>
      <p className="empty-state-inline">
        Dein Lern-Assistent. Er kennt deine Fächer, den Fortschritt und deine Verfügbarkeit. Frag ihn nach einem
        Plan für die Woche, wo du gerade hängst, oder sag ihm, wie viel Zeit du hast — Änderungen macht er nur als
        Vorschlag, den du bestätigst.
      </p>

      {turns.length > 0 && (
        <div className="chat-log" ref={logRef}>
          {turns.map((turn, i) => (
            <div key={i} className={`chat-turn chat-turn-${turn.role}`}>
              <div className="chat-bubble">{turn.content}</div>
              {turn.proposals?.map((proposal, j) => {
                const key = `${i}-${j}`
                const applied = appliedKeys.has(key)
                return (
                  <div key={key} className="chat-proposal">
                    <strong>Vorschlag: {proposal.kind === 'availability' ? 'Verfügbarkeit' : 'Themen-Gewichte'}</strong>
                    <ul>
                      {proposal.kind === 'availability'
                        ? describeAvailabilityProposal(proposal.proposal).map((line) => <li key={line}>{line}</li>)
                        : proposal.changes.map((c) => (
                            <li key={c.topicId}>
                              {topicName(c.topicId)} → Gewicht {c.weight}/5
                            </li>
                          ))}
                    </ul>
                    <button type="button" className="button-primary" disabled={applied} onClick={() => applyProposal(key, proposal)}>
                      {applied ? 'Übernommen' : 'Übernehmen'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      <form onSubmit={send} className="chat-input">
        <label>
          Nachricht an Sven
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="z. B. „Ich hab Mo–Do je 2h Zeit, wie teile ich das auf?“"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e as unknown as React.FormEvent)
            }}
          />
        </label>
        <button type="submit" disabled={draft.trim().length === 0 || busy}>
          {busy ? 'Sven antwortet …' : 'Senden'}
        </button>
      </form>
    </section>
  )
}
