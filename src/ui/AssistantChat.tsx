import { useEffect, useRef, useState } from 'react'
import type { AvailabilityProposal, ChatMessage, ChatProposal, ChatReply } from '../ai/types'
import { describeAvailabilityProposal } from '../domain/availabilityProposal'

/**
 * „Sven" — freies Lern-Gespräch (Nutzerwunsch 2026-09-08). Sven sieht
 * über den von `App.tsx` gebauten Kontext die aktuelle Lage (Fächer,
 * Fortschritt, Verfügbarkeit) und kann darüber sprechen. Er kann
 * Änderungen an Verfügbarkeit oder Themen-Gewichten **vorschlagen** —
 * angewandt wird erst per Klick (ADR-005: „vorschlagen, nie bevormunden").
 *
 * **Verlauf bleibt über Sitzungen erhalten** (Nutzerwunsch 2026-09-08):
 * in `localStorage`, wie die übrigen Geräte-Zustände (Sidebar-Breite,
 * eingeklappte Ordner, Theme). Bewusst nicht in SQLite — der Verlauf ist
 * geräte-/personengebunden, muss nicht zwischen den zwei Nutzern geteilt
 * werden und soll auch ohne `getDb()` funktionieren. Auf die letzten
 * `MAX_STORED_TURNS` Beiträge begrenzt, damit er nicht unbegrenzt wächst.
 *
 * Reine Präsentation: `onSend` (KI-Aufruf mit Verlauf) und die
 * `onApply*`-Callbacks kommen von `App.tsx`.
 */

const STORAGE_KEY = 'lernplaner.svenChat'
const MAX_STORED_TURNS = 60

/** Kleine Sprüche fürs Warten auf Svens Antwort (Nutzerwunsch) — wechseln alle paar Sekunden. */
const THINKING_PHRASES = [
  'denkt nach',
  'kramt in deinen Unterlagen',
  'sortiert die Gedanken',
  'ist kurz Milch holen',
  'blättert durch deine Themen',
  'rechnet einmal nach',
  'macht sich Notizen',
  'holt tief Luft',
  'sucht die beste Antwort',
  'wärmt den Bleistift an',
] as const

const THINKING_INTERVAL_MS = 2500

/** Bilanz eines Uploads, die Sven als Chat-Nachricht meldet. */
export interface SvenUploadResult {
  added: number
  failed: string[]
  topicsCreated: number
  /** Nur beim Ordner-Upload: übersprungene Dateien wegen nicht unterstütztem Format. */
  skippedFormats?: number
  courseName: string
}

export interface AssistantChatProps {
  onSend: (history: ChatMessage[]) => Promise<ChatReply>
  onApplyAvailability: (proposal: AvailabilityProposal) => void
  onApplyTopicWeights: (changes: { topicId: number; weight: 1 | 2 | 3 | 4 | 5 }[]) => void
  /** Für die Anzeige „Thema X → Gewicht 5" statt nur der id. */
  topicName: (topicId: number) => string
  /** Aktive Fächer für die „zu welchem Fach"-Auswahl beim Upload. */
  courses: { id: number; name: string }[]
  onUploadDocuments: (courseId: number, files: File[]) => Promise<SvenUploadResult>
  onUploadFolder: (courseId: number) => Promise<SvenUploadResult>
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  proposals?: ChatProposal[]
}

interface StoredChat {
  turns: Turn[]
  applied: string[]
}

let turnCounter = 0
function newTurnId(): string {
  turnCounter += 1
  return `${Date.now().toString(36)}-${turnCounter}`
}

function loadStored(): StoredChat {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { turns: [], applied: [] }
    const parsed = JSON.parse(raw) as unknown
    const obj = (parsed ?? {}) as Record<string, unknown>
    const turns = Array.isArray(obj.turns)
      ? obj.turns.filter(
          (t): t is Turn =>
            !!t &&
            typeof (t as Turn).id === 'string' &&
            ((t as Turn).role === 'user' || (t as Turn).role === 'assistant') &&
            typeof (t as Turn).content === 'string',
        )
      : []
    const applied = Array.isArray(obj.applied) ? obj.applied.filter((k): k is string => typeof k === 'string') : []
    return { turns, applied }
  } catch {
    return { turns: [], applied: [] }
  }
}

export function AssistantChat({
  onSend,
  onApplyAvailability,
  onApplyTopicWeights,
  topicName,
  courses,
  onUploadDocuments,
  onUploadFolder,
}: AssistantChatProps) {
  const initial = useRef(loadStored()).current
  const [turns, setTurns] = useState<Turn[]>(initial.turns)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set(initial.applied))
  const [thinkingPhrase, setThinkingPhrase] = useState<string>(THINKING_PHRASES[0])
  const [uploadCourseId, setUploadCourseId] = useState<number | null>(courses[0]?.id ?? null)
  const [uploading, setUploading] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Während gewartet wird, alle paar Sekunden einen anderen Spruch zeigen.
  useEffect(() => {
    if (!busy) return
    setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!)
    const timer = setInterval(() => {
      setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]!)
    }, THINKING_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [busy])

  useEffect(() => {
    try {
      const toStore: StoredChat = { turns: turns.slice(-MAX_STORED_TURNS), applied: [...appliedKeys] }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      /* privater Modus / Kontingent voll — Verlauf gilt dann nur für die Sitzung */
    }
  }, [turns, appliedKeys])

  // Fächer laden asynchron nach — Vorauswahl aktuell halten.
  useEffect(() => {
    setUploadCourseId((cur) => (cur !== null && courses.some((c) => c.id === cur) ? cur : (courses[0]?.id ?? null)))
  }, [courses])

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      const log = logRef.current
      // `scrollTo` fehlt in jsdom — im echten Browser ans Ende scrollen.
      if (log && typeof log.scrollTo === 'function') log.scrollTo({ top: log.scrollHeight })
    })
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (text.length === 0 || busy) return
    setError(null)
    const nextTurns: Turn[] = [...turns, { id: newTurnId(), role: 'user', content: text }]
    setTurns(nextTurns)
    setDraft('')
    setBusy(true)
    try {
      const history: ChatMessage[] = nextTurns.map((t) => ({ role: t.role, content: t.content }))
      const reply = await onSend(history)
      setTurns([
        ...nextTurns,
        { id: newTurnId(), role: 'assistant', content: reply.message || '(keine Antwort)', proposals: reply.proposals },
      ])
      scrollToEnd()
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

  const clearHistory = () => {
    setTurns([])
    setAppliedKeys(new Set())
    setError(null)
  }

  /** Hängt eine lokale Sven-Nachricht an (keine KI, kein Token-Verbrauch). */
  const pushLocalNote = (content: string) => {
    setTurns((prev) => [...prev, { id: newTurnId(), role: 'assistant', content }])
    scrollToEnd()
  }

  const summariseUpload = (r: SvenUploadResult, source: string): string => {
    const parts = [
      `📎 ${r.added} ${r.added === 1 ? 'Dokument' : 'Dokumente'} aus ${source} zu „${r.courseName}" hinzugefügt`,
    ]
    if (r.topicsCreated > 0) parts.push(`, ${r.topicsCreated} neue${r.topicsCreated === 1 ? 's Thema' : ' Themen'}`)
    parts.push('.')
    if (r.skippedFormats) parts.push(` ${r.skippedFormats} Datei(en) mit nicht unterstütztem Format übersprungen.`)
    if (r.failed.length > 0) parts.push(` Nicht gelesen: ${r.failed.slice(0, 5).join(', ')}${r.failed.length > 5 ? ', …' : ''}.`)
    return parts.join('')
  }

  const runUpload = async (action: () => Promise<SvenUploadResult>, source: string) => {
    if (uploadCourseId === null) {
      setError('Wähl zuerst ein Fach aus, zu dem die Unterlagen gehören.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const result = await action()
      if (result.added === 0 && result.failed.length === 0 && !result.skippedFormats) return // Nutzer hat abgebrochen
      pushLocalNote(summariseUpload(result, source))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const hasCourses = courses.length > 0

  return (
    <section aria-label="Sven">
      <div className="chat-header">
        <h2>Sven</h2>
        {turns.length > 0 && (
          <button type="button" onClick={clearHistory}>
            Verlauf löschen
          </button>
        )}
      </div>
      <p className="empty-state-inline">
        Dein Lern-Assistent. Er kennt deine Fächer, den Fortschritt und deine Verfügbarkeit. Frag ihn nach einem
        Plan für die Woche, wo du gerade hängst, oder sag ihm, wie viel Zeit du hast — Änderungen macht er nur als
        Vorschlag, den du bestätigst. Der Verlauf bleibt auf diesem Gerät erhalten.
      </p>

      <div className="chat-upload" aria-label="Unterlagen hinzufügen">
        <span className="chat-upload-title">Unterlagen hinzufügen</span>
        {hasCourses ? (
          <>
            <label>
              Zu welchem Fach?
              <select
                value={uploadCourseId ?? ''}
                onChange={(e) => setUploadCourseId(e.target.value === '' ? null : Number(e.target.value))}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dateien wählen (PDF, Word, PowerPoint, Excel, Markdown)
              <input
                type="file"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  if (files.length > 0 && uploadCourseId !== null) {
                    void runUpload(() => onUploadDocuments(uploadCourseId, files), `${files.length} Datei(en)`)
                  } else if (files.length > 0) {
                    setError('Wähl zuerst ein Fach aus, zu dem die Unterlagen gehören.')
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={uploading || uploadCourseId === null}
              onClick={() => void runUpload(() => onUploadFolder(uploadCourseId!), 'einem Ordner')}
            >
              {uploading ? 'lädt …' : 'Oder ganzen Ordner wählen'}
            </button>
            <p className="empty-state-inline">
              Unterordner werden 1:1 als verschachtelte Themen übernommen. Sven legt alles direkt beim gewählten Fach
              ab und meldet unten, was angekommen ist.
            </p>
          </>
        ) : (
          <p className="empty-state-inline">Leg zuerst unter „Fächer &amp; Themen" ein Fach an.</p>
        )}
      </div>

      {turns.length > 0 && (
        <div className="chat-log" ref={logRef}>
          {turns.map((turn) => (
            <div key={turn.id} className={`chat-turn chat-turn-${turn.role}`}>
              <div className="chat-bubble">{turn.content}</div>
              {turn.proposals?.map((proposal, j) => {
                const key = `${turn.id}:${j}`
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
                    <button
                      type="button"
                      className="button-primary"
                      disabled={applied}
                      onClick={() => applyProposal(key, proposal)}
                    >
                      {applied ? 'Übernommen' : 'Übernehmen'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {busy && (
        <p className="chat-thinking" role="status">
          <span className="chat-spinner" aria-hidden="true" />
          Sven {thinkingPhrase} …
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      <form onSubmit={send} className="chat-input">
        <label>
          Nachricht an Sven
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="z. B. „Ich hab Mo–Do je 2h Zeit, wie teile ich das auf?“ — Enter sendet, Umschalt+Enter für eine neue Zeile"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e as unknown as React.FormEvent)
              }
            }}
          />
        </label>
        <button type="submit" disabled={draft.trim().length === 0 || busy}>
          Senden
        </button>
      </form>
    </section>
  )
}
