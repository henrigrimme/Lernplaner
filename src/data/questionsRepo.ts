import type { SqlConnection } from './db'
import type { Question } from './schema'

/**
 * Echte SQL-Operationen für `questions` (ROADMAP.md Phase 4
 * „Quiz-Generierung"). `source_document_id`/`source_page` sind
 * Pflichtfelder (DATA_MODEL.md „eine generierte Frage ohne
 * Quellenangabe wird verworfen") — der Aufrufer (`App.tsx`) kennt sie
 * bereits über die `topic_section`, aus der der Belegtext für die
 * KI-Anfrage stammte, deshalb kein separates „Beleg suchen" hier.
 *
 * `options` (Migration 0004): in der DB ein JSON-String (SQLite kennt
 * keine Arrays), im `Question`-Typ ein echtes `string[] | null` —
 * `rowToQuestion`/die `JSON.stringify`-Aufrufe unten übersetzen dazwischen.
 */

interface QuestionRow extends Omit<Question, 'options'> {
  options: string | null
}

function rowToQuestion(row: QuestionRow): Question {
  return { ...row, options: row.options === null ? null : (JSON.parse(row.options) as string[]) }
}

export async function loadQuestions(conn: SqlConnection): Promise<Question[]> {
  const rows = await conn.select<QuestionRow>('SELECT * FROM questions ORDER BY id')
  return rows.map(rowToQuestion)
}

export type NewQuestionInput = Omit<Question, 'id'>

export async function insertQuestion(conn: SqlConnection, input: NewQuestionInput): Promise<Question> {
  const result = await conn.execute(
    `INSERT INTO questions (quiz_id, topic_id, type, prompt, answer, explanation, source_document_id, source_page, difficulty, options)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.quiz_id,
      input.topic_id,
      input.type,
      input.prompt,
      input.answer,
      input.explanation,
      input.source_document_id,
      input.source_page,
      input.difficulty,
      input.options === null ? null : JSON.stringify(input.options),
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}
