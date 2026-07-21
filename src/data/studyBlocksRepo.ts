import type { SqlConnection } from './db'
import type { StudyBlock } from './schema'

/**
 * Echte SQL-Operationen für `study_blocks` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 6.
 *
 * Anders als bei Themen (`syncTopics`, Baustein 5) entstehen hier über
 * `ui/TodayView.tsx` (`completeStudyBlock`) UND über `App.tsx`s
 * „Plan (neu) übernehmen"/Neuberechnung (`materializeStudyBlocks`,
 * `data/studyBlocks.ts` `applyReplan`) laufend **neue** Zeilen mit
 * lokalen Platzhalter-`id`s (siehe `materializeStudyBlocks`-Kommentar) —
 * `syncStudyBlocks` legt sie deshalb, anders als `syncTopics`, auch neu an
 * und liefert die korrigierte Liste zurück, in der die Platzhalter-`id`s
 * durch die echten `AUTOINCREMENT`-`id`s ersetzt sind (sonst würde ein
 * späteres `completeStudyBlock(id)` oder ein erneutes `syncStudyBlocks`
 * die falsche Zeile treffen).
 */

export async function loadStudyBlocks(conn: SqlConnection): Promise<StudyBlock[]> {
  return conn.select<StudyBlock>('SELECT * FROM study_blocks ORDER BY id')
}

export type NewStudyBlockInput = Omit<StudyBlock, 'id'>

export async function insertStudyBlock(conn: SqlConnection, input: NewStudyBlockInput): Promise<StudyBlock> {
  const result = await conn.execute(
    `INSERT INTO study_blocks (topic_id, assessment_id, kind, planned_date, planned_minutes, planned_order, status, actual_minutes, completed_at, difficulty_feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.topic_id,
      input.assessment_id,
      input.kind,
      input.planned_date,
      input.planned_minutes,
      input.planned_order,
      input.status,
      input.actual_minutes,
      input.completed_at,
      input.difficulty_feedback,
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function updateStudyBlockRow(
  conn: SqlConnection,
  id: number,
  changes: Partial<NewStudyBlockInput>,
): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewStudyBlockInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE study_blocks SET ${setClause} WHERE id = ?`, [
    ...fields.map((field) => changes[field]),
    id,
  ])
}

export async function deleteStudyBlockRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM study_blocks WHERE id = ?', [id])
}

const DIFFABLE_FIELDS = [
  'topic_id',
  'assessment_id',
  'kind',
  'planned_date',
  'planned_minutes',
  'planned_order',
  'status',
  'actual_minutes',
  'completed_at',
  'difficulty_feedback',
] as const satisfies readonly (keyof NewStudyBlockInput)[]

function diffStudyBlock(before: StudyBlock, after: StudyBlock): Partial<NewStudyBlockInput> {
  const changes: Partial<NewStudyBlockInput> = {}
  for (const field of DIFFABLE_FIELDS) {
    if (before[field] !== after[field]) {
      Object.assign(changes, { [field]: after[field] })
    }
  }
  return changes
}

/**
 * Vergleicht `before` (Zustand vor der Änderung) mit `after` (das Ergebnis
 * von `completeStudyBlock`/`materializeStudyBlocks`/`applyReplan` aus
 * `data/studyBlocks.ts`) und wendet die Differenz an: fehlende Zeilen
 * werden gelöscht, geänderte aktualisiert, neue (per `id` nicht in
 * `before` vorhanden) angelegt. Deckt damit einheitlich alle drei
 * Änderungsarten ab, die `App.tsx` an `study_blocks` vornimmt (Block
 * abschließen, Plan (neu) übernehmen, Neuberechnung übernehmen) — anders
 * als bei Themen ist hier kein gesonderter „Insert nur über den Import"-
 * Sonderfall nötig.
 *
 * Liefert die korrigierte Liste zurück (neue Zeilen mit echter
 * `AUTOINCREMENT`-`id` statt der lokalen Platzhalter-`id`) — diese, nicht
 * `after`, muss anschließend als neuer React-Zustand übernommen werden.
 */
export async function syncStudyBlocks(
  conn: SqlConnection,
  before: StudyBlock[],
  after: StudyBlock[],
): Promise<StudyBlock[]> {
  const beforeById = new Map(before.map((b) => [b.id, b]))
  const afterById = new Map(after.map((b) => [b.id, b]))

  for (const oldBlock of before) {
    if (!afterById.has(oldBlock.id)) {
      await deleteStudyBlockRow(conn, oldBlock.id)
    }
  }

  const result: StudyBlock[] = []
  for (const block of after) {
    const oldBlock = beforeById.get(block.id)
    if (!oldBlock) {
      const { id: _localPlaceholderId, ...input } = block
      result.push(await insertStudyBlock(conn, input))
      continue
    }
    const changes = diffStudyBlock(oldBlock, block)
    if (Object.keys(changes).length > 0) {
      await updateStudyBlockRow(conn, block.id, changes)
    }
    result.push(block)
  }
  return result
}
