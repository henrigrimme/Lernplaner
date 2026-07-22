import type { SqlConnection } from './db'
import type { Quiz } from './schema'

/**
 * Echte SQL-Operationen für `quizzes` (ROADMAP.md Phase 4
 * „Quiz-Generierung"/„Probeklausur-Simulation" — Letztere unterscheidet
 * sich nur über `config_json`, siehe `ui/QuizSetup.tsx`, nicht über eine
 * eigene Tabelle).
 */

export async function loadQuizzes(conn: SqlConnection): Promise<Quiz[]> {
  return conn.select<Quiz>('SELECT * FROM quizzes ORDER BY id')
}

export type NewQuizInput = Omit<Quiz, 'id' | 'created_at' | 'completed_at' | 'score'>

export async function insertQuiz(conn: SqlConnection, input: NewQuizInput, createdAt: string): Promise<Quiz> {
  const result = await conn.execute(`INSERT INTO quizzes (course_id, config_json, created_at) VALUES (?, ?, ?)`, [
    input.course_id,
    input.config_json,
    createdAt,
  ])
  if (result.lastInsertId === undefined) throw new Error('INSERT hat keine lastInsertId geliefert')
  return { id: result.lastInsertId, created_at: createdAt, completed_at: null, score: null, ...input }
}

export async function completeQuiz(conn: SqlConnection, id: number, score: number, completedAt: string): Promise<void> {
  await conn.execute(`UPDATE quizzes SET completed_at = ?, score = ? WHERE id = ?`, [completedAt, score, id])
}
