import { getKeychainSecret, setKeychainSecret } from '../platform/keychain'
import { AnthropicProvider } from './anthropicProvider'
import { OpenAIProvider } from './openaiProvider'
import type { AIProvider, AIProviderKind, AIUsageListener } from './types'

export type { AIProvider, AIProviderKind, AIUsage, AIUsageListener, TopicSuggestion } from './types'

/** Schlüsselnamen in der Keychain (SECURITY.md „Im Programm: in der macOS-Keychain"). */
export const ANTHROPIC_API_KEY_ACCOUNT = 'anthropic_api_key'
export const OPENAI_API_KEY_ACCOUNT = 'openai_api_key'
/** Welcher der beiden hinterlegten Schlüssel gerade aktiv ist — kein Geheimnis, aber der Einfachheit halber in derselben Keychain abgelegt statt einer eigenen `settings`-Anbindung. */
const ACTIVE_PROVIDER_ACCOUNT = 'ai_active_provider'

const KEY_ACCOUNT_BY_PROVIDER: Record<AIProviderKind, string> = {
  anthropic: ANTHROPIC_API_KEY_ACCOUNT,
  openai: OPENAI_API_KEY_ACCOUNT,
}

/**
 * Welcher Anbieter zuletzt ausgewählt wurde (ARCHITECTURE.md „Anbieterwechsel
 * ist Konfiguration, kein Umbau"). Übergangslösung 2026-07-22: Zahlung für
 * den Anthropic-Zugang klappte zunächst nicht, ChatGPT/OpenAI dient
 * währenddessen als Ersatz — ein späterer Rückwechsel zu Claude behält den
 * einmal eingegebenen Anthropic-Schlüssel, sofern er nicht separat gelöscht
 * wurde. `anthropic` ist der Default, wenn noch nichts gewählt wurde.
 */
export async function getActiveProvider(): Promise<AIProviderKind> {
  const stored = await getKeychainSecret(ACTIVE_PROVIDER_ACCOUNT)
  return stored === 'openai' ? 'openai' : 'anthropic'
}

export async function setActiveProvider(provider: AIProviderKind): Promise<void> {
  await setKeychainSecret(ACTIVE_PROVIDER_ACCOUNT, provider)
}

function buildProvider(kind: AIProviderKind, apiKey: string, onUsage?: AIUsageListener): AIProvider {
  return kind === 'openai' ? new OpenAIProvider(apiKey, onUsage) : new AnthropicProvider(apiKey, onUsage)
}

/**
 * Baut den aktuell konfigurierten KI-Anbieter. `null`, wenn für den
 * ausgewählten Anbieter noch kein Schlüssel hinterlegt ist.
 */
export async function getConfiguredAIProvider(onUsage?: AIUsageListener): Promise<AIProvider | null> {
  const kind = await getActiveProvider()
  const apiKey = await getKeychainSecret(KEY_ACCOUNT_BY_PROVIDER[kind])
  if (!apiKey) return null
  return buildProvider(kind, apiKey, onUsage)
}

/** Prüft einen Schlüssel mit einer minimalen Anfrage, ohne ihn zu speichern — für den „Testen"-Knopf in den Einstellungen. */
export async function testApiKey(kind: AIProviderKind, apiKey: string): Promise<void> {
  const provider = buildProvider(kind, apiKey)
  await provider.estimateDifficulty(
    { id: 0, course_id: 0, parent_id: null, name: 'Testthema', normalized_name: 'testthema', weight: 1, difficulty: 1, sort_order: 0, status: 'offen', manual_override: 0 },
    'Dies ist ein kurzer Testtext, um den API-Schlüssel zu prüfen.',
  )
}
