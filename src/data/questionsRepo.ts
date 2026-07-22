import type { SqlConnection } from './db'
import type { Question } from './schema'

/**
 * Echte SQL-Operationen für `questions` (ROADMAP.md Phase 4
 * „Quiz-Generierung"). `source_document_id`/`source_page` sind
 * Pflichtfelder (DATA_MODEL.md „eine generierte Frage ohne
 * Quellenangabe wird verworfen") — der Aufrufer (`App.tsx`) kennt sie
 * bereits über die `topic_section`, aus der der Belegtext für die
 * KI-Anfrage stammte, deshalb kein separates „Beleg suchen" hier.
 */

export async function loadQuestions(conn: SqlConnection): Promise<Question[]> {
  return conn.select<Question>('SELECT * FROM questions ORDER BY id')
}

export type NewQuestionInput = Omit<Question, 'id'>

export async function insertQuestion(conn: SqlConnection, input: NewQuestionInput): Promise<Question> {
  const result = await conn.execute(
    `INSERT INTO questions (quiz_id, topic_id, type, prompt, answer, explanation, source_document_id, source_page, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}
