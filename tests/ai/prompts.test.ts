import { describe, expect, it } from 'vitest'
import { buildAvailabilityPrompt, buildChatSystemPrompt, parseChatReply } from '../../src/ai/prompts'

describe('buildAvailabilityPrompt', () => {
  it('enthält das heutige Datum und die freie Beschreibung', () => {
    const p = buildAvailabilityPrompt('Mo-Fr 2h', '2026-09-08')
    expect(p).toContain('2026-09-08')
    expect(p).toContain('Mo-Fr 2h')
    expect(p).toMatch(/weekdayMinutes/)
  })
})

describe('buildChatSystemPrompt', () => {
  it('nennt den Assistenten Sven und bindet den Kontext ein', () => {
    const p = buildChatSystemPrompt('Fach A: 40% Vorbereitung')
    expect(p).toContain('Sven')
    expect(p).toContain('Fach A: 40% Vorbereitung')
  })

  it('fällt bei leerem Kontext auf einen Platzhalter zurück', () => {
    expect(buildChatSystemPrompt('')).toContain('(noch keine Daten)')
  })
})

describe('parseChatReply', () => {
  it('gibt reinen Text ohne Vorschläge unverändert zurück', () => {
    expect(parseChatReply('Klar, mach das so.')).toEqual({ message: 'Klar, mach das so.', proposals: [] })
  })

  it('löst einen availability-Block heraus und lässt ihn aus dem Text verschwinden', () => {
    const raw = [
      'Ich passe deine Woche an.',
      '```availability',
      '{ "weekdayMinutes": [{ "weekday": 1, "minutes": 90 }], "exceptions": [], "recurringBlockers": [], "summary": "Mo 90 Min" }',
      '```',
    ].join('\n')
    const reply = parseChatReply(raw)
    expect(reply.message).toBe('Ich passe deine Woche an.')
    expect(reply.proposals).toHaveLength(1)
    expect(reply.proposals[0]).toEqual({
      kind: 'availability',
      proposal: {
        weekdayMinutes: [{ weekday: 1, minutes: 90 }],
        exceptions: [],
        recurringBlockers: [],
        summary: 'Mo 90 Min',
      },
    })
  })

  it('löst einen topicWeights-Block heraus, verwirft ungültige Änderungen', () => {
    const raw = [
      'Vorschlag:',
      '```topicWeights',
      '{ "changes": [{ "topicId": 3, "weight": 5 }, { "topicId": 4, "weight": 9 }], "summary": "Thema 3 hoch" }',
      '```',
    ].join('\n')
    const reply = parseChatReply(raw)
    expect(reply.proposals[0]).toEqual({ kind: 'topicWeights', changes: [{ topicId: 3, weight: 5 }], summary: 'Thema 3 hoch' })
  })

  it('ignoriert einen kaputten JSON-Block, ohne zu werfen', () => {
    const reply = parseChatReply('Text\n```availability\n{ kaputt \n```')
    expect(reply.message).toBe('Text')
    expect(reply.proposals).toEqual([])
  })

  it('verwirft einen availability-Block, der nichts Anwendbares enthält', () => {
    const reply = parseChatReply('Ok\n```availability\n{ "weekdayMinutes": [], "exceptions": [], "recurringBlockers": [] }\n```')
    expect(reply.proposals).toEqual([])
  })
})
