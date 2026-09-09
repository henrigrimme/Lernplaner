import { useEffect, useRef, useState } from 'react'
import type { AvailabilityProposal, ChatMessage, ChatProposal, ChatReply } from '../ai/types'
import { describeAvailabilityProposal } from '../domain/availabilityProposal'
import { renderMarkdownToHtml } from './renderMarkdown'

/**
 * „Sven" — freies Lern-Gespräch (Nutzerwunsch 2026-09-08). Sven sieht
 * über den von `App.tsx` gebauten Kontext die aktuelle Lage (Fächer,
 * Fortschritt, Verfügbarkeit) und kann darüber sprechen. Er kann
 * Änderungen an Verfügbarkeit / Themen-Gewichten **vorschlagen** oder
 * **angehängte Dokumente einem Fach zuordnen** — ausgeführt wird erst per
 * Klick (ADR-005: „vorschlagen, nie bevormunden").
 *
 * **Dateien anhängen wie bei Claude/ChatGPT** (Nutzerwunsch 2026-09-08):
 * im Eingabefeld Dateien (oder einen Ordner) anhängen und dann normal
 * schreiben „die gehören zu Fach X". Sven schlägt dann einen
 * `importDocuments`-Block vor; die App hält die echten Datei-Bytes in
 * `attachedRef` und importiert sie erst bei „Übernehmen".
 *
 * **Verlauf bleibt über Sitzungen erhalten** — in `localStorage`, wie die
 * übrigen Geräte-Zustände. Angehängte Datei-**Bytes** werden bewusst
 * nicht persistiert (sind gross, ephemer); nur die Dateinamen erscheinen
 * im gespeicherten Verlauf.
 *
 * Reine Präsentation: `onSend`, `onApply*`, `onUploadDocuments`,
 * `onPickFolder` kommen von `App.tsx`.
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

/** Bilanz eines Imports, die Sven als Chat-Nachricht meldet. */
export interface SvenUploadResult {
  added: number
  failed: string[]
  topicsCreated: number
  courseName: string
}

export interface AssistantChatProps {
  onSend: (history: ChatMessage[], opts: { useDocuments: boolean }) => Promise<ChatReply>
  onApplyAvailability: (proposal: AvailabilityProposal) => void
  onApplyTopicWeights: (changes: { topicId: number; weight: 1 | 2 | 3 | 4 | 5 }[]) => void
  /** Für die Anzeige „Thema X → Gewicht 5" statt nur der id. */
  topicName: (topicId: number) => string
  /** Aktive Fächer — für die Fach-Namen in Import-Vorschlägen. */
  courses: { id: number; name: string }[]
  onUploadDocuments: (courseId: number, files: File[]) => Promise<SvenUploadResult>
  /** Öffnet den nativen Ordner-Dialog und liefert die enthaltenen (unterstützten) Dateien als Bytes. */
  onPickFolder: () => Promise<{ name: string; data: Uint8Array }[] | null>
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  proposals?: ChatProposal[]
  /** Dateinamen, die zu dieser Nutzer-Nachricht angehängt waren (nur Anzeige). */
  attachments?: string[]
}

interface StoredChat {
  turns: Turn[]
  applied: string[]
  /** Schalter „Unterlagen einbeziehen" — Default an. */
  useDocuments: boolean
}

let turnCounter = 0
function newTurnId(): string {
  turnCounter += 1
  return `${Date.now().toString(36)}-${turnCounter}`
}

/** Vergleichsschlüssel für Datei-Namen: nur der Basename, klein geschrieben. */
function fileKey(name: string): string {
  return (name.split(/[\\/]/).pop() ?? name).trim().toLowerCase()
}

function loadStored(): StoredChat {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { turns: [], applied: [], useDocuments: true }
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
    return { turns, applied, useDocuments: obj.useDocuments !== false }
  } catch {
    return { turns: [], applied: [], useDocuments: true }
  }
}

export function AssistantChat({
  onSend,
  onApplyAvailability,
  onApplyTopicWeights,
  topicName,
  courses,
  onUploadDocuments,
  onPickFolder,
}: AssistantChatProps) {
  const initial = useRef(loadStored()).current
  const [turns, setTurns] = useState<Turn[]>(initial.turns)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set(initial.applied))
  const [useDocuments, setUseDocuments] = useState<boolean>(initial.useDocuments)
  const [thinkingPhrase, setThinkingPhrase] = useState<string>(THINKING_PHRASES[0])
  const [attached, setAttached] = useState<string[]>([])
  const [pickingFolder, setPickingFolder] = useState(false)
  const attachedRef = useRef<Map<string, File>>(new Map())
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
      const toStore: StoredChat = { turns: turns.slice(-MAX_STORED_TURNS), applied: [...appliedKeys], useDocuments }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      /* privater Modus / Kontingent voll — Verlauf gilt dann nur für die Sitzung */
    }
  }, [turns, appliedKeys, useDocuments])

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      const log = logRef.current
      // `scrollTo` fehlt in jsdom — im echten Browser ans Ende scrollen.
      if (log && typeof log.scrollTo === 'function') log.scrollTo({ top: log.scrollHeight })
    })
  }

  const courseName = (courseId: number) => courses.find((c) => c.id === courseId)?.name ?? `Fach ${courseId}`

  const addFiles = (files: File[]) => {
    if (files.length === 0) return
    for (const file of files) attachedRef.current.set(fileKey(file.name), file)
    setAttached((prev) => {
      const set = new Set(prev)
      for (const f of files) set.add(fileKey(f.name))
      return [...set]
    })
  }

  const removeAttachment = (key: string) => {
    attachedRef.current.delete(key)
    setAttached((prev) => prev.filter((k) => k !== key))
  }

  const pickFolder = async () => {
    setError(null)
    setPickingFolder(true)
    try {
      const picked = await onPickFolder()
      if (!picked || picked.length === 0) return
      addFiles(
        picked.map((p) => new File([p.data as unknown as BlobPart], p.name.split(/[\\/]/).pop() ?? p.name)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPickingFolder(false)
    }
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (text.length === 0 || busy) return
    setError(null)

    const attachedNow = [...attached]
    const contentForModel = attachedNow.length > 0 ? `${text}\n\n[Angehängte Dateien: ${attachedNow.join(', ')}]` : text

    const userTurn: Turn = { id: newTurnId(), role: 'user', content: text }
    if (attachedNow.length > 0) userTurn.attachments = attachedNow
    const nextTurns: Turn[] = [...turns, userTurn]
    setTurns(nextTurns)
    setDraft('')
    setAttached([]) // Chips „wandern" in die gesendete Nachricht; die Bytes bleiben in attachedRef
    setBusy(true)
    try {
      const history: ChatMessage[] = nextTurns.map((t, i) => ({
        role: t.role,
        content: i === nextTurns.length - 1 ? contentForModel : t.content,
      }))
      const reply = await onSend(history, { useDocuments })
      setTurns([
        ...nextTurns,
        { id: newTurnId(), role: 'assistant', content: reply.message || '(keine Antwort)', proposals: reply.proposals },
      ])
      scrollToEnd()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setTurns(nextTurns)
    } finally {
      setBusy(false)
    }
  }

  const pushLocalNote = (content: string) => {
    setTurns((prev) => [...prev, { id: newTurnId(), role: 'assistant', content }])
    scrollToEnd()
  }

  const summariseImport = (r: SvenUploadResult, missing: string[]): string => {
    const parts = [`📎 ${r.added} ${r.added === 1 ? 'Dokument' : 'Dokumente'} zu „${r.courseName}" hinzugefügt`]
    if (r.topicsCreated > 0) parts.push(`, ${r.topicsCreated} neue${r.topicsCreated === 1 ? 's Thema' : ' Themen'}`)
    parts.push('.')
    if (r.failed.length > 0) parts.push(` Nicht gelesen: ${r.failed.slice(0, 5).join(', ')}${r.failed.length > 5 ? ', …' : ''}.`)
    if (missing.length > 0) parts.push(` Nicht (mehr) angehängt: ${missing.join(', ')}.`)
    return parts.join('')
  }

  const applyProposal = async (key: string, proposal: ChatProposal) => {
    if (proposal.kind === 'availability') {
      onApplyAvailability(proposal.proposal)
      setAppliedKeys((prev) => new Set(prev).add(key))
      return
    }
    if (proposal.kind === 'topicWeights') {
      onApplyTopicWeights(proposal.changes)
      setAppliedKeys((prev) => new Set(prev).add(key))
      return
    }

    // importDocuments
    const files: File[] = []
    const missing: string[] = []
    for (const name of proposal.fileNames) {
      const file = attachedRef.current.get(fileKey(name))
      if (file) files.push(file)
      else missing.push(name)
    }
    if (files.length === 0) {
      setError('Die angehängten Dateien sind nicht mehr da — häng sie bitte nochmal an.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await onUploadDocuments(proposal.courseId, files)
      for (const file of files) attachedRef.current.delete(fileKey(file.name))
      pushLocalNote(summariseImport(result, missing))
      setAppliedKeys((prev) => new Set(prev).add(key))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const clearHistory = () => {
    setTurns([])
    setAppliedKeys(new Set())
    setError(null)
    setAttached([])
    attachedRef.current.clear()
  }

  const proposalTitle = (p: ChatProposal): string =>
    p.kind === 'availability' ? 'Verfügbarkeit' : p.kind === 'topicWeights' ? 'Themen-Gewichte' : 'Dokumente hinzufügen'

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
        Plan für die Woche, oder häng Unterlagen an und sag ihm, zu welchem Fach sie gehören. Änderungen macht er nur
        als Vorschlag, den du bestätigst. Der Verlauf bleibt auf diesem Gerät erhalten.
      </p>

      {turns.length > 0 && (
        <div className="chat-log" ref={logRef}>
          {turns.map((turn) => (
            <div key={turn.id} className={`chat-turn chat-turn-${turn.role}`}>
              {turn.role === 'assistant' ? (
                <div
                  className="chat-bubble chat-bubble-md"
                  // Svens Text ist Markdown; `renderMarkdownToHtml` escaped zuerst und
                  // sanitisiert danach auf ein enges Tag-Set.
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(turn.content) }}
                />
              ) : (
                <div className="chat-bubble">
                  {turn.content}
                  {turn.attachments && turn.attachments.length > 0 && (
                    <div className="chat-attachments">
                      {turn.attachments.map((name) => (
                        <span key={name} className="chat-chip">
                          📎 {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {turn.proposals?.map((proposal, j) => {
                const pkey = `${turn.id}:${j}`
                const applied = appliedKeys.has(pkey)
                return (
                  <div key={pkey} className="chat-proposal">
                    <strong>Vorschlag: {proposalTitle(proposal)}</strong>
                    <ul>
                      {proposal.kind === 'availability' &&
                        describeAvailabilityProposal(proposal.proposal).map((line) => <li key={line}>{line}</li>)}
                      {proposal.kind === 'topicWeights' &&
                        proposal.changes.map((c) => (
                          <li key={c.topicId}>
                            {topicName(c.topicId)} → Gewicht {c.weight}/5
                          </li>
                        ))}
                      {proposal.kind === 'importDocuments' && (
                        <>
                          <li>Fach: {courseName(proposal.courseId)}</li>
                          {proposal.fileNames.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </>
                      )}
                    </ul>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={applied || busy}
                      onClick={() => void applyProposal(pkey, proposal)}
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
        {attached.length > 0 && (
          <div className="chat-attachments" aria-label="Angehängte Dateien">
            {attached.map((key) => (
              <span key={key} className="chat-chip">
                📎 {key}
                <button type="button" aria-label={`${key} entfernen`} onClick={() => removeAttachment(key)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <label className="chat-use-documents">
          <input type="checkbox" checked={useDocuments} onChange={(e) => setUseDocuments(e.target.checked)} />
          Unterlagen einbeziehen — Sven zieht passende Seiten aus deinen importierten Dokumenten heran und zitiert sie
        </label>
        <label>
          Nachricht an Sven
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="z. B. „Häng die Folien an und sag: die gehören zu Micro“ — Enter sendet, Umschalt+Enter neue Zeile"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e as unknown as React.FormEvent)
              }
            }}
          />
        </label>
        <div className="chat-input-actions">
          <label className="chat-attach-button">
            📎 Dateien anhängen
            <input
              type="file"
              multiple
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
          <button type="button" onClick={() => void pickFolder()} disabled={pickingFolder}>
            {pickingFolder ? 'Ordner …' : '📁 Ordner anhängen'}
          </button>
          <button type="submit" disabled={draft.trim().length === 0 || busy}>
            Senden
          </button>
        </div>
      </form>
    </section>
  )
}
