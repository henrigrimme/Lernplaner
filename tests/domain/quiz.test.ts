import { describe, expect, it } from 'vitest'
import { computeQuizScore, isMcAnswerCorrect } from '../../src/domain/quiz'

describe('isMcAnswerCorrect', () => {
  it('ignoriert Groß-/Kleinschreibung und umgebende Leerzeichen', () => {
    expect(isMcAnswerCorrect(' b ', 'B')).toBe(true)
  })

  it('liefert false bei unterschiedlichen Buchstaben', () => {
    expect(isMcAnswerCorrect('A', 'B')).toBe(false)
  })
})

describe('computeQuizScore', () => {
  it('liefert null ohne beantwortete Fragen', () => {
    expect(computeQuizScore([])).toBeNull()
  })

  it('berechnet den Anteil richtiger Antworten', () => {
    expect(computeQuizScore([{ correct: 1 }, { correct: 1 }, { correct: 0 }, { correct: 0 }])).toBe(0.5)
  })

  it('liefert 1 bei ausschließlich richtigen Antworten', () => {
    expect(computeQuizScore([{ correct: 1 }, { correct: 1 }])).toBe(1)
  })
})
