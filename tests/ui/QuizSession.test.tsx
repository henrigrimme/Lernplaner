import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuizSession } from '../../src/ui/QuizSession'
import type { Question } from '../../src/data/schema'

function mcQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    quiz_id: 1,
    topic_id: null,
    type: 'mc',
    prompt: 'Wie viel ist 2 + 2?',
    answer: 'B',
    explanation: 'Grundrechenart.',
    source_document_id: 1,
    source_page: 1,
    difficulty: 2,
    options: ['3', '4', '5', '6'],
    ...overrides,
  }
}

describe('QuizSession — anklickbare Multiple-Choice-Antworten', () => {
  it('zeigt die Optionen als Buttons statt eines Texteingabefelds, wenn options gesetzt ist', () => {
    render(<QuizSession questions={[mcQuestion()]} topics={[]} durationMinutes={null} onAnswer={vi.fn()} onFinish={vi.fn()} />)

    expect(screen.getByRole('button', { name: /A\) 3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /B\) 4/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Antwort (Buchstabe)')).not.toBeInTheDocument()
  })

  it('meldet beim Klick auf eine Option sofort die Antwort, ohne separaten Einreichen-Schritt', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<QuizSession questions={[mcQuestion()]} topics={[]} durationMinutes={null} onAnswer={onAnswer} onFinish={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /B\) 4/ }))

    expect(onAnswer).toHaveBeenCalledWith(1, 'B', 1, expect.any(Number))
    expect(screen.getByText('Richtig!')).toBeInTheDocument()
  })

  it('markiert eine falsch gewählte Option und zeigt die richtige Antwort', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<QuizSession questions={[mcQuestion()]} topics={[]} durationMinutes={null} onAnswer={onAnswer} onFinish={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /A\) 3/ }))

    expect(onAnswer).toHaveBeenCalledWith(1, 'A', 0, expect.any(Number))
    expect(screen.getByText(/Leider falsch — richtige Antwort: B/)).toBeInTheDocument()
  })

  it('fällt bei options = null auf das Texteingabefeld zurück (alte Fragen vor Migration 0004)', () => {
    render(
      <QuizSession
        questions={[mcQuestion({ options: null })]}
        topics={[]}
        durationMinutes={null}
        onAnswer={vi.fn()}
        onFinish={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Antwort (Buchstabe)')).toBeInTheDocument()
  })
})
