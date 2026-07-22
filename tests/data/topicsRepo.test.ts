import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { deleteTopicRow, insertTopic, loadTopics, syncTopics, updateTopicRow } from '../../src/data/topicsRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { renameTopic, moveTopic, deleteTopic, buildTree } from '../../src/data/topicTree'
import type { SqlConnection } from '../../src/data/db'
import type { Topic } from '../../src/data/schema'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const, language: 'de' as const }

function topicInput(courseId: number, overrides: Partial<Topic> = {}) {
  return {
    course_id: courseId,
    parent_id: null,
    name: 'Consumer Theory',
    normalized_name: 'consumertheory',
    weight: 3 as const,
    difficulty: 3 as const,
    sort_order: 0,
    status: 'offen' as const,
    manual_override: 0 as const,
    ...overrides,
  }
}

async function seedCourse(conn: SqlConnection) {
  return insertCourse(conn, COURSE_INPUT, 'x')
}

describe('topicsRepo — insertTopic/updateTopicRow/deleteTopicRow', () => {
  it('legt ein Thema an und liefert es mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const topic = await insertTopic(conn, topicInput(course.id))
    expect(topic).toMatchObject({ id: 1, ...topicInput(course.id) })
    expect(await loadTopics(conn)).toEqual([topic])
  })

  it('aktualisiert nur die angegebenen Felder', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const topic = await insertTopic(conn, topicInput(course.id))
    await updateTopicRow(conn, topic.id, { weight: 5 })
    const [updated] = await loadTopics(conn)
    expect(updated).toMatchObject({ weight: 5, name: 'Consumer Theory' })
  })

  it('löscht ein Thema vollständig', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const topic = await insertTopic(conn, topicInput(course.id))
    await deleteTopicRow(conn, topic.id)
    expect(await loadTopics(conn)).toEqual([])
  })

  it('kaskadiert beim Löschen des Elternthemas (ON DELETE CASCADE auf parent_id)', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const parent = await insertTopic(conn, topicInput(course.id, { name: 'Kapitel' }))
    await insertTopic(conn, topicInput(course.id, { name: 'Unterthema', parent_id: parent.id, sort_order: 0 }))
    await deleteTopicRow(conn, parent.id)
    expect(await loadTopics(conn)).toEqual([])
  })
})

describe('syncTopics', () => {
  it('legt keine neuen Themen an (Neuanlegen läuft über den PDF-Import)', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const before: Topic[] = []
    const after: Topic[] = [{ id: 999, ...topicInput(course.id) }]
    await syncTopics(conn, before, after)
    expect(await loadTopics(conn)).toEqual([])
  })

  it('überträgt eine Umbenennung (renameTopic) als UPDATE', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const inserted = await insertTopic(conn, topicInput(course.id))
    const before = [inserted]
    const after = renameTopic(before, inserted.id, 'Neuer Name')

    await syncTopics(conn, before, after)

    const [row] = await loadTopics(conn)
    expect(row).toMatchObject({ name: 'Neuer Name', manual_override: 1 })
  })

  it('überträgt eine Verschiebung mit Geschwister-Neunummerierung (moveTopic) als mehrere UPDATEs', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const a = await insertTopic(conn, topicInput(course.id, { name: 'A', sort_order: 0 }))
    const b = await insertTopic(conn, topicInput(course.id, { name: 'B', sort_order: 1 }))
    const c = await insertTopic(conn, topicInput(course.id, { name: 'C', sort_order: 2 }))
    const before = [a, b, c]

    // C an den Anfang verschieben -> A und B rücken nach.
    const after = moveTopic(before, c.id, null, 0)
    await syncTopics(conn, before, after)

    const rows = await loadTopics(conn)
    const byId = new Map(rows.map((r) => [r.id, r]))
    expect(byId.get(c.id)!.sort_order).toBe(0)
    expect(byId.get(a.id)!.sort_order).toBe(1)
    expect(byId.get(b.id)!.sort_order).toBe(2)
  })

  it('überträgt eine Kaskaden-Löschung (deleteTopic) als mehrere DELETEs', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const parent = await insertTopic(conn, topicInput(course.id, { name: 'Kapitel' }))
    const child = await insertTopic(conn, topicInput(course.id, { name: 'Unterthema', parent_id: parent.id }))
    const before = [parent, child]

    const after = deleteTopic(before, parent.id)
    await syncTopics(conn, before, after)

    expect(await loadTopics(conn)).toEqual([])
  })

  it('lässt unveränderte Themen unangetastet (kein UPDATE ohne Differenz)', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const topic = await insertTopic(conn, topicInput(course.id))
    await syncTopics(conn, [topic], [topic])
    expect(await loadTopics(conn)).toEqual([topic])
  })

  it('rundtrip: buildTree über das Ergebnis liefert denselben Baum wie vor der Persistenz', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const parent = await insertTopic(conn, topicInput(course.id, { name: 'Kapitel' }))
    const child = await insertTopic(conn, topicInput(course.id, { name: 'Unterthema', parent_id: parent.id }))
    const before = [parent, child]
    const after = renameTopic(before, child.id, 'Umbenannt')

    await syncTopics(conn, before, after)
    const rows = await loadTopics(conn)
    const tree = buildTree(rows)

    expect(tree).toHaveLength(1)
    expect(tree[0]!.children[0]!.name).toBe('Umbenannt')
  })
})
