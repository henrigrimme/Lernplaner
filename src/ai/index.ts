import { getKeychainSecret } from '../platform/keychain'
import { AnthropicProvider } from './anthropicProvider'
import type { AIProvider, AIUsageListener } from './types'

export type { AIProvider, AIUsage, AIUsageListener, TopicSuggestion } from './types'

/** Schlüsselname in der Keychain (SECURITY.md „Im Programm: in der macOS-Keychain"). */
export const ANTHROPIC_API_KEY_ACCOUNT = 'anthropic_api_key'

/**
 * Baut den konfigurierten KI-Anbieter (ARCHITECTURE.md „Anbieterwechsel ist
 * Konfiguration, kein Umbau") — aktuell fest Anthropic (ADR-002-Update
 * 2026-07-22). `null`, wenn noch kein Schlüssel hinterlegt ist.
 */
export async function getConfiguredAIProvider(onUsage?: AIUsageListener): Promise<AIProvider | null> {
  const apiKey = await getKeychainSecret(ANTHROPIC_API_KEY_ACCOUNT)
  if (!apiKey) return null
  return new AnthropicProvider(apiKey, onUsage)
}

/** Prüft einen Schlüssel mit einer minimalen Anfrage, ohne ihn zu speichern — für den „Testen"-Knopf in den Einstellungen. */
export async function testAnthropicApiKey(apiKey: string): Promise<void> {
  const provider = new AnthropicProvider(apiKey)
  await provider.estimateDifficulty(
    { id: 0, course_id: 0, parent_id: null, name: 'Testthema', normalized_name: 'testthema', weight: 1, difficulty: 1, sort_order: 0, status: 'offen', manual_override: 0 },
    'Dies ist ein kurzer Testtext, um den API-Schlüssel zu prüfen.',
  )
}
