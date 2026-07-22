import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

describe('platform/keychain — Sitzungs-Cache', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    // Modul-Level-Cache zwischen Tests zurücksetzen — jeder Test importiert
    // das Modul frisch, damit `secretCache` nicht über Tests hinweg leckt.
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('liest denselben Account nur einmal nativ, danach aus dem Cache', async () => {
    invokeMock.mockResolvedValue('geheim-123')
    const { getKeychainSecret } = await import('../../src/platform/keychain')

    const first = await getKeychainSecret('anthropic_api_key')
    const second = await getKeychainSecret('anthropic_api_key')

    expect(first).toBe('geheim-123')
    expect(second).toBe('geheim-123')
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('cached auch ein "nicht vorhanden" (null), um wiederholte native Aufrufe zu vermeiden', async () => {
    invokeMock.mockResolvedValue(null)
    const { getKeychainSecret } = await import('../../src/platform/keychain')

    const first = await getKeychainSecret('openai_api_key')
    const second = await getKeychainSecret('openai_api_key')

    expect(first).toBeNull()
    expect(second).toBeNull()
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('hält verschiedene Accounts unabhängig im Cache', async () => {
    invokeMock.mockImplementation((_, args) => {
      const account = (args as { account: string }).account
      return Promise.resolve(account === 'anthropic_api_key' ? 'claude-key' : 'openai-key')
    })
    const { getKeychainSecret } = await import('../../src/platform/keychain')

    expect(await getKeychainSecret('anthropic_api_key')).toBe('claude-key')
    expect(await getKeychainSecret('openai_api_key')).toBe('openai-key')
    expect(await getKeychainSecret('anthropic_api_key')).toBe('claude-key')

    expect(invokeMock).toHaveBeenCalledTimes(2)
  })

  it('setKeychainSecret schreibt sofort in den Cache, ohne dass ein erneutes get nativ nachfragt', async () => {
    invokeMock.mockResolvedValue(undefined)
    const { getKeychainSecret, setKeychainSecret } = await import('../../src/platform/keychain')

    await setKeychainSecret('anthropic_api_key', 'neuer-schluessel')
    const value = await getKeychainSecret('anthropic_api_key')

    expect(value).toBe('neuer-schluessel')
    // Nur der set-Aufruf selbst, kein zusätzlicher get-Aufruf nativ nötig.
    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith('keychain_set_secret', { account: 'anthropic_api_key', value: 'neuer-schluessel' })
  })

  it('deleteKeychainSecret setzt den Cache auf "nicht vorhanden", ohne ein erneutes get', async () => {
    invokeMock.mockResolvedValue(undefined)
    const { deleteKeychainSecret, getKeychainSecret } = await import('../../src/platform/keychain')

    await deleteKeychainSecret('openai_api_key')
    const value = await getKeychainSecret('openai_api_key')

    expect(value).toBeNull()
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })
})
