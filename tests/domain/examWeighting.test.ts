import { describe, expect, it } from 'vitest'
import { suggestWeightAdjustments } from '../../src/domain/examWeighting'
import type { Topic } from '../../src/data/schema'

function topic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 1,
    course_id: 1,
    parent_id: null,
    name: 'Testthema',
    normalized_name: 'testthema',
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
    ...overrides,
  }
}

describe('suggestWeightAdjustments', () => {
  it('hebt das Gewicht eines häufig geprüften Themas um eine Stufe an', () => {
    const result = suggestWeightAdjustments([topic({ id: 1, weight: 3 })], [{ topicId: 1, occurrences: 3 }])
    expect(result).toEqual([{ topicId: 1, currentWeight: 3, suggestedWeight: 4, occurrences: 3 }])
  })

  it('schlägt bei zu wenigen Treffern (unter der Schwelle) nichts vor', () => {
    const result = suggestWeightAdjustments([topic({ id: 1, weight: 3 })], [{ topicId: 1, occurrences: 2 }])
    expect(result).toEqual([])
  })

  it('rührt ein Thema ohne Treffer nicht an — Abwesenheit ist kein Beleg für Unwichtigkeit', () => {
    const result = suggestWeightAdjustments([topic({ id: 1, weight: 3 })], [])
    expect(result).toEqual([])
  })

  it('deckelt bei 5 — kein Vorschlag, wenn das Gewicht schon am Maximum ist', () => {
    const result = suggestWeightAdjustments([topic({ id: 1, weight: 5 })], [{ topicId: 1, occurrences: 5 }])
    expect(result).toEqual([])
  })

  it('lässt manuell bearbeitete Themen unangetastet (DATA_MODEL.md manual_override)', () => {
    const result = suggestWeightAdjustments(
      [topic({ id: 1, weight: 3, manual_override: 1 })],
      [{ topicId: 1, occurrences: 10 }],
    )
    expect(result).toEqual([])
  })

  it('behandelt mehrere Themen unabhängig voneinander', () => {
    const result = suggestWeightAdjustments(
      [topic({ id: 1, weight: 2 }), topic({ id: 2, weight: 3 })],
      [
        { topicId: 1, occurrences: 4 },
        { topicId: 2, occurrences: 1 },
      ],
    )
    expect(result).toEqual([{ topicId: 1, currentWeight: 2, suggestedWeight: 3, occurrences: 4 }])
  })
})
