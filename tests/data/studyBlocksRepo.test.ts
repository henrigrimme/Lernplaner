import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import {
  deleteStudyBlockRow,
  insertStudyBlock,
  loadStudyBlocks,
  syncStudyBlocks,
  updateStudyBlockRow,
} from '../../src/data/studyBlocksRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertTopic } from '../../src/data/topicsRepo'
import { insertAssessment } from '../../src/data/assessmentsRepo'
import { completeStudyBlock, materializeStudyBlocks } from '../../src/data/studyBlocks'
import type { SqlConnection } from '../../src/data/db'
import type { StudyBlock } from '../../src/data/schema'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const }

async function seedTopicAndAssessment(conn: SqlConnection) {
  const course = await seedCourse(conn)
  const topic = await insertTopic(conn, {
    course_id: course.id,
    parent_id: null,
    name: 'Consumer Theory',
    normalized_name: 'consumertheory',
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
  })
  const assessment = await insertAssessment(conn, {
    course_id: course.id,
    type: 'klausur',
    title: 'Klausur',
    date: '2026-09-01',
    weight: 3,
    format: 'mixed',
    open_book: 0,
    duration_minutes: 90,
  })
  return { topic, assessment }
}

function blockInput(overrides: Partial<StudyBlock> = {}): Omit<StudyBlock, 'id'> {
  return {
    topic_id: null,
    assessment_id: null,
    kind: 'erstdurchgang',
    planned_date: '2026-08-01',
    planned_minutes: 30,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

async function seedCourse(conn: SqlConnection) {
  return insertCourse(conn, COURSE_INPUT, 'x')
}

describe('studyBlocksRepo — insertStudyBlock/updateStudyBlockRow/deleteStudyBlockRow', () => {
  it('legt einen Block an und liefert ihn mit der echten AUTOINCREMENT-id zurück', async () => {
    const conn = createTestConnection()
    const block = await insertStudyBlock(conn, blockInput())
    expect(block).toMatchObject({ id: 1, ...blockInput() })
    expect(await loadStudyBlocks(conn)).toEqual([block])
  })

  it('aktualisiert nur die angegebenen Felder', async () => {
    const conn = createTestConnection()
    const block = await insertStudyBlock(conn, blockInput())
    await updateStudyBlockRow(conn, block.id, { status: 'erledigt', actual_minutes: 25 })
    const [updated] = await loadStudyBlocks(conn)
    expect(updated).toMatchObject({ status: 'erledigt', actual_minutes: 25, planned_minutes: 30 })
  })

  it('löscht einen Block vollständig', async () => {
    const conn = createTestConnection()
    const block = await insertStudyBlock(conn, blockInput())
    await deleteStudyBlockRow(conn, block.id)
    expect(await loadStudyBlocks(conn)).toEqual([])
  })

  it('kaskadiert, wenn das referenzierte Thema gelöscht wird (ON DELETE CASCADE auf topic_id)', async () => {
    const conn = createTestConnection()
    const course = await seedCourse(conn)
    const topic = await insertTopic(conn, {
      course_id: course.id,
      parent_id: null,
      name: 'Consumer Theory',
      normalized_name: 'consumertheory',
      weight: 3,
      difficulty: 3,
      sort_order: 0,
      status: 'offen',
      manual_override: 0,
    })
    await insertStudyBlock(conn, blockInput({ topic_id: topic.id }))
    // Löschen über die Topics-Tabelle, nicht über studyBlocksRepo — die
    // Kaskade ist Sache der DB (0001_init.sql), nicht dieses Repos.
    const { deleteTopicRow } = await import('../../src/data/topicsRepo')
    await deleteTopicRow(conn, topic.id)
    expect(await loadStudyBlocks(conn)).toEqual([])
  })
})

describe('syncStudyBlocks', () => {
  it('überträgt eine Fertigmeldung (completeStudyBlock) als UPDATE', async () => {
    const conn = createTestConnection()
    const inserted = await insertStudyBlock(conn, blockInput())
    const before = [inserted]
    const after = completeStudyBlock(before, inserted.id, {
      actualMinutes: 20,
      difficultyFeedback: 0,
      completedAt: '2026-08-01T10:00:00.000Z',
    })

    const result = await syncStudyBlocks(conn, before, after)

    const [row] = await loadStudyBlocks(conn)
    expect(row).toMatchObject({ status: 'erledigt', actual_minutes: 20, difficulty_feedback: 0 })
    expect(result).toEqual([row])
  })

  it('legt neue Blöcke an und ersetzt die lokale Platzhalter-id durch die echte AUTOINCREMENT-id', async () => {
    const conn = createTestConnection()
    const { topic, assessment } = await seedTopicAndAssessment(conn)
    // startId weit weg von der DB-Zählung, damit ein zufälliges Zusammentreffen ausgeschlossen ist.
    const after = materializeStudyBlocks(
      [{ topic_id: topic.id, assessment_id: assessment.id, kind: 'erstdurchgang', planned_date: '2026-08-01', planned_minutes: 30, planned_order: 0 }],
      999,
    )
    expect(after[0]!.id).toBe(999)

    const result = await syncStudyBlocks(conn, [], after)

    expect(result[0]!.id).not.toBe(999)
    expect(await loadStudyBlocks(conn)).toEqual(result)
  })

  it('löscht Blöcke, die im neuen Zustand nicht mehr vorkommen', async () => {
    const conn = createTestConnection()
    const a = await insertStudyBlock(conn, blockInput({ planned_order: 0 }))
    const b = await insertStudyBlock(conn, blockInput({ planned_order: 1 }))
    const before = [a, b]
    const after = [a]

    await syncStudyBlocks(conn, before, after)

    expect(await loadStudyBlocks(conn)).toEqual([a])
  })

  it('lässt unveränderte Blöcke unangetastet (kein UPDATE ohne Differenz)', async () => {
    const conn = createTestConnection()
    const block = await insertStudyBlock(conn, blockInput())
    const result = await syncStudyBlocks(conn, [block], [block])
    expect(result).toEqual([block])
    expect(await loadStudyBlocks(conn)).toEqual([block])
  })

  it('Neuberechnung: behält unveränderte Blöcke, löscht ersetzte offene Erstdurchgänge, legt neu berechnete an', async () => {
    const conn = createTestConnection()
    const { topic, assessment } = await seedTopicAndAssessment(conn)
    const kept = await insertStudyBlock(conn, blockInput({ kind: 'wiederholung', planned_order: 0 }))
    const replaced = await insertStudyBlock(conn, blockInput({ kind: 'erstdurchgang', status: 'offen', planned_order: 1 }))
    const before = [kept, replaced]

    // Entspricht data/studyBlocks.ts's applyReplan: kept bleibt, replaced entfällt, neu berechneter Block kommt hinzu.
    const newlyScheduled = materializeStudyBlocks(
      [{ topic_id: topic.id, assessment_id: assessment.id, kind: 'erstdurchgang', planned_date: '2026-08-02', planned_minutes: 45, planned_order: 0 }],
      replaced.id + 1,
    )
    const after = [kept, ...newlyScheduled]

    const result = await syncStudyBlocks(conn, before, after)

    const rows = await loadStudyBlocks(conn)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === kept.id)).toMatchObject({ kind: 'wiederholung' })
    expect(rows.find((r) => r.id === replaced.id)).toBeUndefined()
    expect(result).toHaveLength(2)
  })
})
