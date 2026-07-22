import type { SqlConnection } from './db'
import type { Answer } from './schema'

/**
 * Echte SQL-Operationen für `answers` (ROADMAP.md Phase 4
 * „Quiz-Generierung"). Nur Einfügen und Lesen — eine gegebene Antwort
 * wird nie nachträglich bearbeitet, analog zu `reviewsRepo.ts`.
 */

export async function loadAnswers(conn: SqlConnection): Promise<Answer[]> {
  return conn.select<Answer>('SELECT * FROM answers ORDER BY id')
}

export type NewAnswerInput = Omit<Answer, 'id'>

export async function insertAnswer(conn: SqlConnection, input: NewAnswerInput): Promise<Answer> {
  const result = await conn.execute(
    `INSERT INTO answers (question_id, given, correct, answered_at, seconds) VALUES (?, ?, ?, ?, ?)`,
    [input.question_id, input.given, input.correct, input.answered_at, input.seconds],
  )
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, ...input }
}
