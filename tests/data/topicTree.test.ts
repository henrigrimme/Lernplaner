import { describe, expect, it } from 'vitest'
import {
  buildTree,
  deleteTopic,
  moveTopic,
  renameTopic,
  setTopicDifficulty,
  setTopicWeight,
} from '../../src/data/topicTree'
import type { Topic } from '../../src/data/schema'

function topic(overrides: Partial<Topic> & { id: number }): Topic {
  return {
    course_id: 1,
    parent_id: null,
    name: `Thema ${overrides.id}`,
    normalized_name: `thema${overrides.id}`,
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
    ...overrides,
  }
}

describe('buildTree', () => {
  it('gruppiert Themen nach parent_id und sortiert nach sort_order', () => {
    const topics = [
      topic({ id: 1, parent_id: null, sort_order: 1, name: 'Producer Theory' }),
      topic({ id: 2, parent_id: null, sort_order: 0, name: 'Consumer Theory' }),
      topic({ id: 3, parent_id: 2, sort_order: 0, name: 'Preferences' }),
      topic({ id: 4, parent_id: 2, sort_order: 1, name: 'Budget Constraint' }),
    ]

    const tree = buildTree(topics)

    expect(tree.map((n) => n.name)).toEqual(['Consumer Theory', 'Producer Theory'])
    expect(tree[0]!.children.map((n) => n.name)).toEqual(['Preferences', 'Budget Constraint'])
    expect(tree[1]!.children).toEqual([])
  })

  it('fängt einen kaputten parent_id-Verweis als eigene Wurzel ab, statt abzustürzen', () => {
    const topics = [topic({ id: 1, parent_id: 999 })]
    const tree = buildTree(topics)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.id).toBe(1)
  })
})

describe('renameTopic', () => {
  it('benennt um, aktualisiert normalized_name und setzt manual_override', () => {
    const topics = [topic({ id: 1, name: 'Cost Minimization', normalized_name: 'costminimization' })]
    const result = renameTopic(topics, 1, 'Kostenminimierung')
    expect(result[0]).toMatchObject({
      name: 'Kostenminimierung',
      normalized_name: 'kostenminimierung',
      manual_override: 1,
    })
  })

  it('trimmt Whitespace und weist einen leeren Namen zurück', () => {
    const topics = [topic({ id: 1 })]
    expect(renameTopic(topics, 1, '  Neuer Name  ')[0]!.name).toBe('Neuer Name')
    expect(() => renameTopic(topics, 1, '   ')).toThrow(/leer/)
  })

  it('wirft bei unbekannter id', () => {
    expect(() => renameTopic([], 1, 'X')).toThrow(/nicht gefunden/)
  })
})

describe('deleteTopic', () => {
  it('löscht ein Blattthema', () => {
    const topics = [topic({ id: 1 }), topic({ id: 2 })]
    const result = deleteTopic(topics, 1)
    expect(result.map((t) => t.id)).toEqual([2])
  })

  it('löscht Unterthemen mit (spiegelt ON DELETE CASCADE)', () => {
    const topics = [
      topic({ id: 1, parent_id: null }),
      topic({ id: 2, parent_id: 1 }),
      topic({ id: 3, parent_id: 2 }),
      topic({ id: 4, parent_id: null }),
    ]
    const result = deleteTopic(topics, 1)
    expect(result.map((t) => t.id)).toEqual([4])
  })
})

describe('moveTopic', () => {
  it('verschiebt an eine neue Position innerhalb derselben Geschwistergruppe', () => {
    const topics = [
      topic({ id: 1, parent_id: null, sort_order: 0 }),
      topic({ id: 2, parent_id: null, sort_order: 1 }),
      topic({ id: 3, parent_id: null, sort_order: 2 }),
    ]
    const result = moveTopic(topics, 3, null, 0)
    const order = [...result].sort((a, b) => a.sort_order - b.sort_order).map((t) => t.id)
    expect(order).toEqual([3, 1, 2])
    expect(result.find((t) => t.id === 3)!.manual_override).toBe(1)
  })

  it('verschiebt zu einem neuen Elternthema und nummeriert beide Geschwistergruppen lückenlos neu', () => {
    const topics = [
      topic({ id: 1, parent_id: null, sort_order: 0 }), // altes Elternthema
      topic({ id: 2, parent_id: 1, sort_order: 0 }),
      topic({ id: 3, parent_id: 1, sort_order: 1 }), // wird verschoben
      topic({ id: 10, parent_id: null, sort_order: 1 }), // neues Elternthema
      topic({ id: 11, parent_id: 10, sort_order: 0 }),
    ]
    const result = moveTopic(topics, 3, 10, 1)

    const movedTopic = result.find((t) => t.id === 3)!
    expect(movedTopic.parent_id).toBe(10)
    expect(movedTopic.sort_order).toBe(1)
    expect(movedTopic.manual_override).toBe(1)

    const oldSiblings = result.filter((t) => t.parent_id === 1).sort((a, b) => a.sort_order - b.sort_order)
    expect(oldSiblings.map((t) => t.id)).toEqual([2])
    expect(oldSiblings[0]!.sort_order).toBe(0)

    const newSiblings = result.filter((t) => t.parent_id === 10).sort((a, b) => a.sort_order - b.sort_order)
    expect(newSiblings.map((t) => t.id)).toEqual([11, 3])
  })

  it('verweigert das Verschieben eines Themas in seinen eigenen Teilbaum', () => {
    const topics = [
      topic({ id: 1, parent_id: null }),
      topic({ id: 2, parent_id: 1 }),
    ]
    expect(() => moveTopic(topics, 1, 2, 0)).toThrow(/eigenen Teilbaum/)
  })

  it('wirft bei unbekanntem neuen Elternthema', () => {
    const topics = [topic({ id: 1 })]
    expect(() => moveTopic(topics, 1, 999, 0)).toThrow(/nicht gefunden/)
  })
})

describe('setTopicWeight', () => {
  it('setzt das Gewicht bei einem Blattthema, ohne andere Themen zu verändern', () => {
    const topics = [topic({ id: 1, weight: 3 }), topic({ id: 2, weight: 3 })]
    const result = setTopicWeight(topics, 1, 5)
    expect(result.find((t) => t.id === 1)).toMatchObject({ weight: 5, manual_override: 1 })
    expect(result.find((t) => t.id === 2)).toMatchObject({ weight: 3, manual_override: 0 })
  })

  it('vererbt sich von einem Kapitel (Elternthema) auf alle Unterthemen', () => {
    const topics = [
      topic({ id: 1, parent_id: null, weight: 3 }), // Kapitel
      topic({ id: 2, parent_id: 1, weight: 3 }),
      topic({ id: 3, parent_id: 2, weight: 3 }), // Enkel — auch betroffen
      topic({ id: 4, parent_id: null, weight: 3 }), // anderes Kapitel, unbetroffen
    ]
    const result = setTopicWeight(topics, 1, 5)
    expect(result.filter((t) => [1, 2, 3].includes(t.id)).every((t) => t.weight === 5)).toBe(true)
    expect(result.find((t) => t.id === 4)!.weight).toBe(3)
  })

  it('wirft bei unbekannter id', () => {
    expect(() => setTopicWeight([], 1, 5)).toThrow(/nicht gefunden/)
  })
})

describe('setTopicDifficulty', () => {
  it('setzt die Schwierigkeit bei einem Blattthema', () => {
    const topics = [topic({ id: 1, difficulty: 3 })]
    const result = setTopicDifficulty(topics, 1, 1)
    expect(result[0]).toMatchObject({ difficulty: 1, manual_override: 1 })
  })

  it('vererbt sich von einem Kapitel auf alle Unterthemen', () => {
    const topics = [
      topic({ id: 1, parent_id: null, difficulty: 3 }),
      topic({ id: 2, parent_id: 1, difficulty: 3 }),
    ]
    const result = setTopicDifficulty(topics, 1, 5)
    expect(result.every((t) => t.difficulty === 5)).toBe(true)
  })
})
