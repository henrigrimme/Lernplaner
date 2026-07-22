import { useEffect, useState } from 'react'
import { ANTHROPIC_API_KEY_ACCOUNT, testAnthropicApiKey } from '../ai'
import { deleteKeychainSecret, getKeychainSecret, setKeychainSecret } from '../platform/keychain'

/**
 * Claude-API-Key verwalten (DECISIONS.md ADR-002-Update 2026-07-22,
 * SECURITY.md „Im Programm: in der macOS-Keychain"). Der Schlüssel selbst
 * geht nie durch `data/db.ts` oder ins Log — nur `platform/keychain.ts`
 * liest/schreibt ihn, diese Komponente zeigt nur, *ob* einer hinterlegt ist.
 *
 * Funktioniert nur im echten Tauri-Fenster (dieselbe IPC-Einschränkung wie
 * `data/db.ts`/`platform/notifications.ts`).
 */

type Status = 'unknown' | 'present' | 'absent'

export function AiSettings() {
  const [status, setStatus] = useState<Status>('unknown')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getKeychainSecret(ANTHROPIC_API_KEY_ACCOUNT)
      .then((value) => {
        if (!cancelled) setStatus(value ? 'present' : 'absent')
      })
      .catch(() => {
        // Kein echtes Tauri-Fenster (z. B. Vite-Dev-Server/Browser) — Status bleibt unbekannt.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    if (!input.trim()) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await testAnthropicApiKey(input.trim())
      await setKeychainSecret(ANTHROPIC_API_KEY_ACCOUNT, input.trim())
      setStatus('present')
      setInput('')
      setMessage('Schlüssel geprüft und in der Keychain gespeichert.')
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
      await deleteKeychainSecret(ANTHROPIC_API_KEY_ACCOUNT)
      setStatus('absent')
      setMessage('Schlüssel entfernt.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schlüssel konnte nicht entfernt werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Claude-API-Anbindung">
      <h2>Claude-API-Anbindung</h2>

      <p>
        {status === 'present' && 'Ein Claude-API-Schlüssel ist hinterlegt.'}
        {status === 'absent' && 'Noch kein Claude-API-Schlüssel hinterlegt.'}
        {status === 'unknown' && 'Status nur in der echten App verfügbar (nicht im Dev-Server-Browser).'}
      </p>

      <label>
        Neuer API-Schlüssel
        <input
          type="password"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="sk-ant-..."
        />
      </label>

      <button type="button" onClick={save} disabled={busy || !input.trim()}>
        Prüfen und speichern
      </button>

      {status === 'present' && (
        <button type="button" onClick={remove} disabled={busy}>
          Schlüssel entfernen
        </button>
      )}

      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
