import { useEffect, useState } from 'react'
import {
  ANTHROPIC_API_KEY_ACCOUNT,
  OPENAI_API_KEY_ACCOUNT,
  getActiveProvider,
  setActiveProvider,
  testApiKey,
  type AIProviderKind,
} from '../ai'
import { deleteKeychainSecret, getKeychainSecret, setKeychainSecret } from '../platform/keychain'

/**
 * Claude/ChatGPT-API-Key verwalten (DECISIONS.md ADR-002-Update
 * 2026-07-22, SECURITY.md „Im Programm: in der macOS-Keychain"). Der
 * Schlüssel selbst geht nie durch `data/db.ts` oder ins Log — nur
 * `platform/keychain.ts` liest/schreibt ihn, diese Komponente zeigt nur,
 * *ob* einer hinterlegt ist.
 *
 * **Zwei Anbieter, austauschbar** (ARCHITECTURE.md „ai/ — austauschbar"):
 * Anthropic/Claude ist die eigentliche Zielwahl (ADR-002-Update), OpenAI/
 * ChatGPT eine Übergangslösung, solange die Zahlung für den
 * Anthropic-Zugang nicht klappt. Beide Schlüssel bleiben unabhängig
 * voneinander gespeichert — ein Rückwechsel zu Claude braucht später
 * keinen neuen Schlüssel, sofern er hier nicht separat gelöscht wurde.
 *
 * Funktioniert nur im echten Tauri-Fenster (dieselbe IPC-Einschränkung wie
 * `data/db.ts`/`platform/notifications.ts`).
 */

type Status = 'unknown' | 'present' | 'absent'

const ACCOUNT_BY_PROVIDER: Record<AIProviderKind, string> = {
  anthropic: ANTHROPIC_API_KEY_ACCOUNT,
  openai: OPENAI_API_KEY_ACCOUNT,
}

const LABEL_BY_PROVIDER: Record<AIProviderKind, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
}

export function AiSettings() {
  const [provider, setProvider] = useState<AIProviderKind>('anthropic')
  const [status, setStatus] = useState<Status>('unknown')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = (forProvider: AIProviderKind) => {
    getKeychainSecret(ACCOUNT_BY_PROVIDER[forProvider])
      .then((value) => setStatus(value ? 'present' : 'absent'))
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — Status bleibt unbekannt.
      })
  }

  useEffect(() => {
    let cancelled = false
    getActiveProvider()
      .then((active) => {
        if (cancelled) return
        setProvider(active)
        refreshStatus(active)
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster — Default (anthropic) bleibt stehen, Status unbekannt.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectProvider = (next: AIProviderKind) => {
    setProvider(next)
    setInput('')
    setMessage(null)
    setError(null)
    refreshStatus(next)
  }

  const save = async () => {
    if (!input.trim()) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await testApiKey(provider, input.trim())
      await setKeychainSecret(ACCOUNT_BY_PROVIDER[provider], input.trim())
      await setActiveProvider(provider)
      setStatus('present')
      setInput('')
      setMessage(`Schlüssel geprüft, gespeichert und als aktiver Anbieter (${LABEL_BY_PROVIDER[provider]}) hinterlegt.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schlüssel konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await deleteKeychainSecret(ACCOUNT_BY_PROVIDER[provider])
      setStatus('absent')
      setMessage('Schlüssel entfernt.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schlüssel konnte nicht entfernt werden.')
    } finally {
      setBusy(false)
    }
  }

  const useAsActive = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await setActiveProvider(provider)
      setMessage(`${LABEL_BY_PROVIDER[provider]} ist jetzt der aktive Anbieter.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anbieter konnte nicht umgestellt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="KI-Anbindung">
      <h2>KI-Anbindung</h2>

      <fieldset className="segmented-fieldset">
        <legend>Anbieter</legend>
        <div className="segmented-options">
          {(['anthropic', 'openai'] as const).map((kind) => (
            <label key={kind}>
              <input
                type="radio"
                name="ai-provider"
                checked={provider === kind}
                onChange={() => selectProvider(kind)}
              />
              {LABEL_BY_PROVIDER[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <p>
        {status === 'present' && `Ein Schlüssel für ${LABEL_BY_PROVIDER[provider]} ist hinterlegt.`}
        {status === 'absent' && `Noch kein Schlüssel für ${LABEL_BY_PROVIDER[provider]} hinterlegt.`}
        {status === 'unknown' && 'Status nur in der echten App verfügbar (nicht im Dev-Server-Browser).'}
      </p>

      <label>
        Neuer API-Schlüssel für {LABEL_BY_PROVIDER[provider]}
        <input
          type="password"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
        />
      </label>

      <button type="button" onClick={save} disabled={busy || !input.trim()}>
        Prüfen und speichern
      </button>

      {status === 'present' && (
        <>
          <button type="button" onClick={useAsActive} disabled={busy}>
            Als aktiven Anbieter verwenden
          </button>
          <button type="button" onClick={remove} disabled={busy}>
            Schlüssel entfernen
          </button>
        </>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
