import type { ChatProposal, ChatReply } from './types'
import { isEmptyAvailabilityProposal, normalizeAvailabilityProposal } from '../domain/availabilityProposal'

/**
 * Gemeinsame Prompt-Bausteine und Antwort-Auswertung für die
 * KI-Anbieter (`anthropicProvider.ts`/`openaiProvider.ts`). Anders als
 * bei den kleineren `refineTopics`/`generateQuestions`-Prompts (dort je
 * Anbieter dupliziert) lohnt sich das Teilen hier: die Verfügbarkeits-
 * und Chat-Prompts sind lang und beschreiben das App-Datenmodell.
 */

const WEEKDAY_HINT = '0 = Sonntag, 1 = Montag, 2 = Dienstag, 3 = Mittwoch, 4 = Donnerstag, 5 = Freitag, 6 = Samstag'

/** Prompt für `AIProvider.parseAvailability`. */
export function buildAvailabilityPrompt(text: string, todayISO: string): string {
  return [
    'Du hilfst, die Lernzeit-Verfügbarkeit eines Studenten aus einer freien Beschreibung zu strukturieren.',
    `Heutiges Datum: ${todayISO}. Relative Angaben ("nächsten Montag", "ab übermorgen") daran ausrichten.`,
    `Wochentage: ${WEEKDAY_HINT}.`,
    '',
    'Das Datenmodell kennt drei Dinge:',
    '- weekdayMinutes: verfügbare Lernminuten pro Wochentag (das übliche Wochenmuster).',
    '- exceptions: einzelne abweichende Kalendertage (Datum + Minuten, optional Notiz). Für einen',
    '  genannten Zeitraum jeden betroffenen Tag einzeln auflisten (z. B. ein Wochenende = 2 Einträge).',
    '- recurringBlockers: feste, wöchentlich wiederkehrende Zeitfenster, die von der Lernzeit abgehen',
    '  (z. B. "Di 18:00-19:30 Gym", "täglich 12:00-13:00 Mittagspause" = ein Eintrag je betroffenem Wochentag).',
    '',
    'Nenne NUR, was die Beschreibung tatsächlich hergibt — nicht erwähnte Wochentage weglassen.',
    'Stunden in Minuten umrechnen ("2 Stunden" -> 120).',
    '',
    'Antworte ausschließlich mit einem JSON-Objekt, kein weiterer Text:',
    '{',
    '  "weekdayMinutes": [{"weekday": 0-6, "minutes": number}],',
    '  "exceptions": [{"date": "YYYY-MM-DD", "minutes": number, "note": string|null}],',
    '  "recurringBlockers": [{"weekday": 0-6, "startsAt": "HH:MM", "endsAt": "HH:MM", "label": string}],',
    '  "summary": "ein Satz auf Deutsch, was du verstanden hast"',
    '}',
    '',
    'Beschreibung:',
    text.trim(),
  ].join('\n')
}

export function parseAvailabilityReply(json: unknown) {
  return normalizeAvailabilityProposal(json)
}

/** System-/Kontextvorspann für `AIProvider.chat` — „Sven", der Lern-Assistent. */
export function buildChatSystemPrompt(context: string): string {
  return [
    'Du bist "Sven", ein ruhiger, konkreter Lern-Assistent in einer Lernplaner-App für einen WHU-Studenten.',
    'Antworte auf Deutsch, kurz und praktisch. Keine Motivationsfloskeln.',
    '',
    'Du kannst zwei Arten von Änderungen VORSCHLAGEN (nie selbst ausführen — die App fragt den Nutzer):',
    '1. Verfügbarkeit ändern. Hänge dann ans Ende deiner Antwort einen Block:',
    '```availability',
    '{ "weekdayMinutes": [...], "exceptions": [...], "recurringBlockers": [...], "summary": "..." }',
    '```',
    '   (gleiches Format wie die Verfügbarkeits-Strukturierung; Wochentage 0=So..6=Sa, Minuten als Zahl.)',
    '2. Themen-Gewichte anpassen (1 = leicht/wenig Aufwand … 5 = viel). Block:',
    '```topicWeights',
    '{ "changes": [{ "topicId": number, "weight": 1-5 }], "summary": "..." }',
    '```',
    'Nutze die Blöcke nur, wenn der Nutzer erkennbar eine solche Änderung will. Sonst normal antworten.',
    '',
    'Kontext zur aktuellen Lage des Nutzers:',
    context.trim() || '(noch keine Daten)',
  ].join('\n')
}

/**
 * Zerlegt die rohe Chat-Antwort in sichtbaren Text + herausgelöste
 * Vorschlags-Blöcke. Fehlerhafte Blöcke werden still verworfen (der
 * Nutzer sieht dann einfach keinen Vorschlag, keinen Absturz).
 */
export function parseChatReply(text: string): ChatReply {
  const proposals: ChatProposal[] = []
  let message = text

  const blockRe = /```(availability|topicWeights)\s*([\s\S]*?)```/g
  message = message.replace(blockRe, (_whole, kind: string, body: string) => {
    try {
      const json = JSON.parse(body.trim()) as Record<string, unknown>
      if (kind === 'availability') {
        const proposal = normalizeAvailabilityProposal(json)
        if (!isEmptyAvailabilityProposal(proposal)) proposals.push({ kind: 'availability', proposal })
      } else {
        const changes = (Array.isArray(json.changes) ? json.changes : [])
          .map((c) => c as Record<string, unknown>)
          .filter((c) => Number.isInteger(Number(c.topicId)) && [1, 2, 3, 4, 5].includes(Number(c.weight)))
          .map((c) => ({ topicId: Number(c.topicId), weight: Number(c.weight) as 1 | 2 | 3 | 4 | 5 }))
        if (changes.length > 0) {
          proposals.push({ kind: 'topicWeights', changes, summary: typeof json.summary === 'string' ? json.summary : '' })
        }
      }
    } catch {
      /* kaputter Block — ignorieren */
    }
    return ''
  })

  return { message: message.trim(), proposals }
}
