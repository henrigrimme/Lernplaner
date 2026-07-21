import type { SqlConnection } from './db'
import type { Topic } from './schema'

/**
 * Echte SQL-Operationen für `topics` über `SqlConnection` (siehe
 * `data/db.ts`) — Persistenz-Härtung Baustein 5.
 *
 * Anders als bei Fächern/Prüfungen keine expliziten Aktions-Callbacks in
 * `ui/TopicTree.tsx` (kein `onRename`/`onMove`/... ): `data/topicTree.ts`s
 * reine Funktionen (`renameTopic`/`moveTopic`/`deleteTopic`/
 * `setTopicWeight`/`setTopicDifficulty`) berechnen bereits den korrekten
 * **gesamten** neuen Baumzustand — `moveTopic` etwa kann beim
 * Neunummerieren von Geschwistern mehrere Zeilen gleichzeitig ändern.
 * Eine eigene SQL-Funktion je Baumoperation müsste dieselbe Logik
 * (Zyklen-Erkennung, lückenlose `sort_order`-Neunummerierung über zwei
 * Geschwistergruppen, Kaskade) ein zweites Mal nachbilden. Stattdessen
 * vergleicht `syncTopics` den alten mit dem neuen Zustand (von
 * `App.tsx` übergeben) und wendet nur die Differenz an.
 */

export async function loadTopics(conn: SqlConnection): Promise<Topic[]> {
  return conn.select<Topic>('SELECT * FROM topics ORDER BY id')
}

export interface NewTopicInput {
  course_id: number
  parent_id: number | null
  name: string
  normalized_name: string
  weight: Topic['weight']
  difficulty: Topic['difficulty']
  sort_order: number
  status: Topic['status']
  manual_override: Topic['manual_override']
}

export async function insertTopic(conn: SqlConnection, input: NewTopicInput): Promise<Topic> {
  const result = await conn.execute(
    `INSERT INTO topics (course_id, parent_id, name, normalized_name, weight, difficulty, sort_order, status, manual_override)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.course_id,
      input.parent_id,
      input.name,
      input.normalized_name,
      input.weight,
      input.difficulty,
      input.sort_order,
      input.status,
      input.manual_override,
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}

export async function updateTopicRow(conn: SqlConnection, id: number, changes: Partial<NewTopicInput>): Promise<void> {
  const fields = Object.keys(changes) as (keyof NewTopicInput)[]
  if (fields.length === 0) return
  const setClause = fields.map((field) => `${field} = ?`).join(', ')
  await conn.execute(`UPDATE topics SET ${setClause} WHERE id = ?`, [...fields.map((field) => changes[field]), id])
}

export async function deleteTopicRow(conn: SqlConnection, id: number): Promise<void> {
  await conn.execute('DELETE FROM topics WHERE id = ?', [id])
}

const DIFFABLE_FIELDS = [
  'course_id',
  'parent_id',
  'name',
  'normalized_name',
  'weight',
  'difficulty',
  'sort_order',
  'status',
  'manual_override',
] as const satisfies readonly (keyof NewTopicInput)[]

function diffTopic(before: Topic, after: Topic): Partial<NewTopicInput> {
  const changes: Partial<NewTopicInput> = {}
  for (const field of DIFFABLE_FIELDS) {
    if (before[field] !== after[field]) {
      Object.assign(changes, { [field]: after[field] })
    }
  }
  return changes
}

/**
 * Vergleicht `before` (Zustand vor der Baumoperation) mit `after` (das
 * Ergebnis von `renameTopic`/`moveTopic`/`deleteTopic`/`setTopicWeight`/
 * `setTopicDifficulty`) und wendet nur die Differenz als `UPDATE`/`DELETE`
 * an. Legt keine neuen Themen an — das läuft ausschließlich über den
 * PDF-Import (`insertTopic`/`persistExtractedDocument` in
 * `data/importTopics.ts`), nicht über den Themenbaum selbst.
 */
export async function syncTopics(conn: SqlConnection, before: Topic[], after: Topic[]): Promise<void> {
  const afterById = new Map(after.map((t) => [t.id, t]))
  const beforeById = new Map(before.map((t) => [t.id, t]))

  for (const oldTopic of before) {
    if (!afterById.has(oldTopic.id)) {
      await deleteTopicRow(conn, oldTopic.id)
    }
  }
  for (const newTopic of after) {
    const oldTopic = beforeById.get(newTopic.id)
    if (!oldTopic) continue
    const changes = diffTopic(oldTopic, newTopic)
    if (Object.keys(changes).length > 0) {
      await updateTopicRow(conn, newTopic.id, changes)
    }
  }
}
