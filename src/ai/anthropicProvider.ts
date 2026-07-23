import { fetch } from '@tauri-apps/plugin-http'
import type { ExtractedDocument } from '../ingest/types'
import type { CourseLanguage, Topic } from '../data/schema'
import type {
  AIProvider,
  AIUsage,
  AIUsageListener,
  ExamTopicMatch,
  QuestionFocus,
  QuestionSuggestion,
  QuizDifficulty,
  TextTopicSuggestion,
  TopicSuggestion,
} from './types'

const LANGUAGE_INSTRUCTION: Record<CourseLanguage, string> = {
  de: 'Antworte auf Deutsch.',
  en: 'Antworte auf Englisch (Answer in English).',
}

const DIFFICULTY_INSTRUCTION: Record<QuizDifficulty, string> = {
  einfach: 'Einfaches Niveau: direkte Verständnisfragen, wenig Transfer nötig.',
  mittel: 'Mittleres Niveau: normaler Klausur-Anspruch, etwas Transferleistung.',
  schwer: 'Hohes Niveau: anspruchsvolle Transfer-/Anwendungsfragen, keine reinen Faktenfragen.',
}

const FOCUS_INSTRUCTION: Record<QuestionFocus, string> = {
  gemischt: 'Mische Multiple-Choice- und Freitext-Fragen zu Konzeptverständnis und, falls das Material Formeln/Berechnungen enthält, auch Rechenaufgaben.',
  rechnen: 'Nur Rechenaufgaben — jede Frage verlangt eine tatsächliche Berechnung anhand von Werten/Formeln aus dem Material, keine reinen Wissens-/Definitionsfragen.',
  konzept: 'Nur Konzeptverständnis — Definitionen, Zusammenhänge, Abgrenzungen; keine Rechenaufgaben, auch wenn das Material Formeln enthält.',
}

/**
 * Claude-Anbieter für `ai/` (ARCHITECTURE.md „ai/ — austauschbar",
 * DECISIONS.md ADR-002 „KI-Anbieter-Entscheidung … Anthropic/Claude").
 * Nutzt `@tauri-apps/plugin-http` statt des Browser-`fetch` — der Aufruf
 * läuft dadurch über die Rust-Seite und ist nicht auf CORS-Freigaben der
 * Anthropic-API angewiesen (siehe `src-tauri/capabilities/default.json`,
 * die den Zugriff auf `https://api.anthropic.com/*` freischaltet).
 *
 * Modellwahl: `claude-sonnet-5` (Nutzerwunsch, 2026-07-22 — vorher testweise
 * `claude-haiku-4-5`). Reicht deutlich über die ursprünglich nur für
 * Themenverfeinerung/Schwierigkeitseinschätzung nötige Qualität hinaus und
 * trägt jetzt auch Quiz-Generierung/Altklausur-Analyse (ROADMAP.md Phase 4),
 * die anspruchsvolleres Reasoning brauchen als der ADR-002/ADR-007
 * angenommene Kostenrahmen (< 1 €/Monat) ursprünglich vorsah.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-5'

// $/1M Tokens (Input/Output) — für die Kostenspalte in `ai_usage` (ADR-007).
// Einführungspreis bis 2026-08-31 (danach $3.00/$15.00, siehe Anthropic-Preisliste).
const PRICE_PER_MTOK_INPUT_EUR = 1.9
const PRICE_PER_MTOK_OUTPUT_EUR = 9.5

function estimateCostEur(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_PER_MTOK_INPUT_EUR + (outputTokens / 1_000_000) * PRICE_PER_MTOK_OUTPUT_EUR
}

interface AnthropicMessageResponse {
  content: { type: string; text?: string }[]
  usage: { input_tokens: number; output_tokens: number }
}

async function callClaude(apiKey: string, prompt: string): Promise<{ text: string; usage: AnthropicMessageResponse['usage'] }> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Claude-API-Fehler ${response.status}: ${body}`)
  }

  const data = (await response.json()) as AnthropicMessageResponse
  const text = data.content.find((block) => block.type === 'text')?.text ?? ''
  return { text, usage: data.usage }
}

/** Extrahiert das erste JSON-Objekt/-Array aus einer Modellantwort — robust gegen umgebenden Fließtext. */
function extractJson(text: string): unknown {
  const match = text.match(/[[{][\s\S]*[\]}]/)
  if (!match) throw new Error('Keine JSON-Antwort von Claude erhalten')
  return JSON.parse(match[0])
}

export class AnthropicProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly onUsage?: AIUsageListener,
  ) {}

  private report(operation: string, usage: AnthropicMessageResponse['usage']) {
    const record: AIUsage = {
      operation,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costEur: estimateCostEur(usage.input_tokens, usage.output_tokens),
    }
    this.onUsage?.(record)
  }

  async refineTopics(doc: ExtractedDocument): Promise<TopicSuggestion[]> {
    const chapterList = doc.chapters.map((c) => `- ${c.title}`).join('\n')
    const prompt = [
      'Du bekommst die vom Programm bereits erkannten Kapitel eines Foliensatzes.',
      'Schlage eine verfeinerte Themenliste vor: sinnvolle Zusammenfassung/Aufspaltung, jeweils mit',
      'einem Gewicht von 1 (sehr leicht) bis 5 (sehr aufwendig) für die Prüfungsvorbereitung.',
      'Antworte ausschließlich mit einem JSON-Array von Objekten der Form',
      '{"name": string, "parentName": string|null, "weight": 1|2|3|4|5} — kein weiterer Text.',
      '',
      `Dokument: ${doc.filename}`,
      'Erkannte Kapitel:',
      chapterList,
    ].join('\n')

    const { text, usage } = await callClaude(this.apiKey, prompt)
    this.report('refine_topics', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('Claude-Antwort war kein JSON-Array')
    return parsed as TopicSuggestion[]
  }

  async estimateDifficulty(topic: Topic, sample: string): Promise<number> {
    const prompt = [
      `Thema: "${topic.name}".`,
      'Hier ist ein Textauszug aus dem Vorlesungsmaterial zu diesem Thema:',
      sample,
      '',
      'Schätze die Schwierigkeit dieses Themas für eine Prüfungsvorbereitung auf einer Skala',
      'von 1 (sehr leicht) bis 5 (sehr schwer). Antworte ausschließlich mit der Zahl, kein weiterer Text.',
    ].join('\n')

    const { text, usage } = await callClaude(this.apiKey, prompt)
    this.report('estimate_difficulty', usage)
    const value = Number.parseInt(text.trim(), 10)
    if (Number.isNaN(value) || value < 1 || value > 5) {
      throw new Error(`Ungültige Schwierigkeitsangabe von Claude: "${text}"`)
    }
    return value
  }

  async generateQuestions(
    topicName: string,
    sourceText: string,
    count: number,
    difficulty: QuizDifficulty,
    language: CourseLanguage,
    focus: QuestionFocus,
    instructions: string,
  ): Promise<QuestionSuggestion[]> {
    const prompt = [
      `Erzeuge ${count} Quizfragen zum Thema "${topicName}" ausschließlich auf Basis des folgenden`,
      'Textauszugs aus dem Vorlesungsmaterial — erfinde keine Inhalte, die dort nicht stehen:',
      '',
      sourceText,
      '',
      DIFFICULTY_INSTRUCTION[difficulty],
      LANGUAGE_INSTRUCTION[language],
      FOCUS_INSTRUCTION[focus],
      ...(instructions.trim() ? [`Zusätzliche Anweisung für dieses Fach: ${instructions.trim()}`] : []),
      '',
      'Antworte ausschließlich mit einem JSON-Array von',
      'Objekten der Form {"type": "mc"|"freitext", "prompt": string, "options": string[] (nur bei "mc",',
      'genau die Antwortoptionen ohne Buchstaben-Präfix, z. B. ["12", "14", "16", "18"]), "answer": string,',
      '"explanation": string, "difficulty": 1|2|3|4|5} — kein weiterer Text. Bei "mc" ist "answer" der',
      'Buchstabe der richtigen Option ("A" = erste Option in "options", "B" = zweite, usw.).',
    ].join('\n')

    const { text, usage } = await callClaude(this.apiKey, prompt)
    this.report('generate_questions', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('Claude-Antwort war kein JSON-Array')
    return parsed as QuestionSuggestion[]
  }

  async classifyExamContent(topics: { id: number; name: string }[], examText: string): Promise<ExamTopicMatch[]> {
    const topicList = topics.map((t) => `${t.id}: ${t.name}`).join('\n')
    const prompt = [
      'Hier ist der Text einer Altklausur. Ordne jede darin gestellte Frage/Aufgabe einem der folgenden',
      'Themen zu (per ID) — mehrfache Zuordnung derselben ID ist normal, wenn mehrere Fragen zum selben',
      'Thema gehören. Passt eine Frage zu keinem Thema, lass sie aus.',
      '',
      'Themen:',
      topicList,
      '',
      'Altklausur-Text:',
      examText,
      '',
      'Antworte ausschließlich mit einem JSON-Array von Objekten der Form',
      '{"topicId": number, "occurrences": number} — ein Eintrag pro Thema mit mindestens einer Frage,',
      '"occurrences" ist die Anzahl der Fragen zu diesem Thema. Kein weiterer Text.',
    ].join('\n')

    const { text, usage } = await callClaude(this.apiKey, prompt)
    this.report('classify_exam_content', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('Claude-Antwort war kein JSON-Array')
    return parsed as ExamTopicMatch[]
  }

  async detectTopicsFromText(pages: { pageNumber: number; text: string }[]): Promise<TextTopicSuggestion[]> {
    const pagedText = pages.map((p) => `[Seite ${p.pageNumber}]\n${p.text}`).join('\n\n')
    const prompt = [
      'Das ist eine von einem Studierenden selbst geschriebene Zusammenfassung — jede Person baut ihre',
      'Zusammenfassung anders auf (manche mit Überschriften, manche als reine Liste von Frage-Antwort-Paaren',
      'ohne jede optische Gliederung). Verlasse dich deshalb nicht auf Formatierung, sondern lies den',
      'gesamten Text inhaltlich und gruppiere ihn nach den behandelten Themen — auch wenn dieselbe Frage',
      'thematisch zu einem vorherigen Abschnitt gehört, ohne dass eine neue Überschrift beginnt.',
      '',
      'Text (mit Seitenzahlen):',
      pagedText,
      '',
      'Antworte ausschließlich mit einem JSON-Array von Objekten der Form',
      '{"name": string, "pageStart": number, "pageEnd": number, "weight": 1|2|3|4|5} — "weight" ist der',
      'geschätzte Lernaufwand (1 sehr leicht bis 5 sehr aufwendig). Kein weiterer Text.',
    ].join('\n')

    const { text, usage } = await callClaude(this.apiKey, prompt)
    this.report('detect_topics_from_text', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('Claude-Antwort war kein JSON-Array')
    return parsed as TextTopicSuggestion[]
  }
}
