import { describe, expect, it } from 'vitest'
import { createTestConnection } from './testConnection'
import { insertQuestion, loadQuestions } from '../../src/data/questionsRepo'
import { insertQuiz } from '../../src/data/quizzesRepo'
import { insertCourse } from '../../src/data/coursesRepo'
import { insertDocument } from '../../src/data/documentsRepo'

const COURSE_INPUT = { name: 'Microeconomics', semester: 'WS26', color: '#000', priority: 3 as const, difficulty: 3 as const, language: 'de' as const }

async function seed(conn: Awaited<ReturnType<typeof createTestConnection>>) {
  const course = await insertCourse(conn, COURSE_INPUT, 'x')
  const document = await insertDocument(
    conn,
    {
      course_id: course.id,
      filename: 'folien.pdf',
      stored_path: 'documents/abc.pdf',
      sha256: 'abc',
      doc_type: 'folien',
      doc_type_label: null,
      pdf_pages: 3,
      slide_count: 3,
      unique_chars: 100,
    },
    'x',
  )
  const quiz = await insertQuiz(conn, { course_id: course.id, config_json: '{}' }, 'x')
  return { course, document, quiz }
}

describe('questionsRepo — options (Migration 0004, anklickbare MC-Antworten)', () => {
  it('speichert und lädt die Antwortoptionen einer MC-Frage als echtes Array', async () => {
    const conn = createTestConnection()
    const { document, quiz } = await seed(conn)

    const question = await insertQuestion(conn, {
      quiz_id: quiz.id,
      topic_id: null,
      type: 'mc',
      prompt: 'Wie viel ist 2 + 2?',
      answer: 'B',
      explanation: 'Grundrechenart.',
      source_document_id: document.id,
      source_page: 1,
      difficulty: 2,
      options: ['3', '4', '5', '6'],
    })

    expect(question.options).toEqual(['3', '4', '5', '6'])
    const loaded = await loadQuestions(conn)
    expect(loaded).toHaveLength(1)
    expect(loaded[0]!.options).toEqual(['3', '4', '5', '6'])
  })

  it('lässt options bei einer Freitext-Frage null', async () => {
    const conn = createTestConnection()
    const { document, quiz } = await seed(conn)

    const question = await insertQuestion(conn, {
      quiz_id: quiz.id,
      topic_id: null,
      type: 'freitext',
      prompt: 'Erkläre das Gesetz der Nachfrage.',
      answer: 'Preis steigt, Nachfrage sinkt (ceteris paribus).',
      explanation: '',
      source_document_id: document.id,
      source_page: 1,
      difficulty: 3,
      options: null,
    })

    expect(question.options).toBeNull()
    const loaded = await loadQuestions(conn)
    expect(loaded[0]!.options).toBeNull()
  })
})
