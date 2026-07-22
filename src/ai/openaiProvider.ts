import { fetch } from '@tauri-apps/plugin-http'
import type { ExtractedDocument } from '../ingest/types'
import type { CourseLanguage, Topic } from '../data/schema'
import type {
  AIProvider,
  AIUsage,
  AIUsageListener,
  ExamTopicMatch,
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

/**
 * Übergangslösung, bis die Zahlung für den Anthropic-API-Zugang klappt
 * (Nutzerwunsch, 2026-07-22): dieselbe `AIProvider`-Schnittstelle
 * (ARCHITECTURE.md „ai/ — austauschbar", ADR-011), aber gegen die
 * OpenAI-Chat-Completions-API. Wird über `ai/index.ts` als Alternative zu
 * `AnthropicProvider` angeboten — ein späterer Rückwechsel zu Claude ist
 * reine Konfiguration (Anbieter-Auswahl in den Einstellungen), kein Umbau.
 *
 * Modell: `gpt-5.6-terra` (Nutzerwunsch, 2026-07-22 — vorher testweise
 * `gpt-4o-mini`). Preise sind Schätzwerte (OpenAI ändert sie ohne
 * Vorankündigung, und für dieses Modell lag zum Zeitpunkt dieser Änderung
 * keine gesicherte Preisliste vor) — reicht für die grobe Budget-Anzeige
 * (ADR-007), ist aber keine exakte Abrechnung. Bei Abweichung von der
 * echten `Billing`-Seite dort nachjustieren.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-5.6-terra'

const PRICE_PER_MTOK_INPUT_EUR = 0.14
const PRICE_PER_MTOK_OUTPUT_EUR = 0.55

function estimateCostEur(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_PER_MTOK_INPUT_EUR + (outputTokens / 1_000_000) * PRICE_PER_MTOK_OUTPUT_EUR
}

interface OpenAIChatResponse {
  choices: { message: { content: string } }[]
  usage: { prompt_tokens: number; completion_tokens: number }
}

async function callOpenAi(apiKey: string, prompt: string): Promise<{ text: string; usage: OpenAIChatResponse['usage'] }> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      // Neuere OpenAI-Modelle (u. a. gpt-5.6-terra) lehnen `max_tokens` ab
      // ("Unsupported parameter", an echtem Aufruf entdeckt, 2026-07-22) —
      // `max_completion_tokens` ist der Nachfolgeparameter.
      max_completion_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI-API-Fehler ${response.status}: ${body}`)
  }

  const data = (await response.json()) as OpenAIChatResponse
  const text = data.choices[0]?.message.content ?? ''
  return { text, usage: data.usage }
}

/** Extrahiert das erste JSON-Objekt/-Array aus einer Modellantwort — robust gegen umgebenden Fließtext. */
function extractJson(text: string): unknown {
  const match = text.match(/[[{][\s\S]*[\]}]/)
  if (!match) throw new Error('Keine JSON-Antwort von OpenAI erhalten')
  return JSON.parse(match[0])
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly onUsage?: AIUsageListener,
  ) {}

  private report(operation: string, usage: OpenAIChatResponse['usage']) {
    const record: AIUsage = {
      operation,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      costEur: estimateCostEur(usage.prompt_tokens, usage.completion_tokens),
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

    const { text, usage } = await callOpenAi(this.apiKey, prompt)
    this.report('refine_topics', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('OpenAI-Antwort war kein JSON-Array')
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

    const { text, usage } = await callOpenAi(this.apiKey, prompt)
    this.report('estimate_difficulty', usage)
    const value = Number.parseInt(text.trim(), 10)
    if (Number.isNaN(value) || value < 1 || value > 5) {
      throw new Error(`Ungültige Schwierigkeitsangabe von OpenAI: "${text}"`)
    }
    return value
  }

  async generateQuestions(
    topicName: string,
    sourceText: string,
    count: number,
    difficulty: QuizDifficulty,
    language: CourseLanguage,
  ): Promise<QuestionSuggestion[]> {
    const prompt = [
      `Erzeuge ${count} Quizfragen zum Thema "${topicName}" ausschließlich auf Basis des folgenden`,
      'Textauszugs aus dem Vorlesungsmaterial — erfinde keine Inhalte, die dort nicht stehen:',
      '',
      sourceText,
      '',
      DIFFICULTY_INSTRUCTION[difficulty],
      LANGUAGE_INSTRUCTION[language],
      '',
      'Mische Multiple-Choice- und Freitext-Fragen. Antworte ausschließlich mit einem JSON-Array von',
      'Objekten der Form {"type": "mc"|"freitext", "prompt": string, "options": string[] (nur bei "mc",',
      'genau die Antwortoptionen ohne Buchstaben-Präfix, z. B. ["12", "14", "16", "18"]), "answer": string,',
      '"explanation": string, "difficulty": 1|2|3|4|5} — kein weiterer Text. Bei "mc" ist "answer" der',
      'Buchstabe der richtigen Option ("A" = erste Option in "options", "B" = zweite, usw.).',
    ].join('\n')

    const { text, usage } = await callOpenAi(this.apiKey, prompt)
    this.report('generate_questions', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('OpenAI-Antwort war kein JSON-Array')
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

    const { text, usage } = await callOpenAi(this.apiKey, prompt)
    this.report('classify_exam_content', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('OpenAI-Antwort war kein JSON-Array')
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

    const { text, usage } = await callOpenAi(this.apiKey, prompt)
    this.report('detect_topics_from_text', usage)
    const parsed = extractJson(text)
    if (!Array.isArray(parsed)) throw new Error('OpenAI-Antwort war kein JSON-Array')
    return parsed as TextTopicSuggestion[]
  }
}
