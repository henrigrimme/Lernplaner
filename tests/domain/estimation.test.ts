import { describe, expect, it } from 'vitest'
import { estimateMinutes, EXAM_FORMAT_MULTIPLIER } from '../../src/domain/estimation'
import type { EstimationInput } from '../../src/domain/estimation'

function baseInput(overrides: Partial<EstimationInput> = {}): EstimationInput {
  return {
    topic: { weight: 3 },
    sections: [{ unique_chars: 2000, slide_count: 4 }],
    course: { difficulty: 3 },
    assessmentFormat: 'mixed',
    calibration: null,
    ...overrides,
  }
}

describe('estimateMinutes', () => {
  it('berechnet die ADR-004-Basisformel bei neutraler Schwierigkeit/Gewicht/Format (alle Multiplikatoren 1,0)', () => {
    // (2000/1000 * 4.5 + 4*0.5) * 1 * 1 * 1 = 9 + 2 = 11
    const result = estimateMinutes(baseInput())
    expect(result.minutes).toBe(11)
    expect(result.calibrated).toBe(false)
  })

  it('summiert unique_chars und slide_count über mehrere topic_sections', () => {
    const result = estimateMinutes(
      baseInput({
        sections: [
          { unique_chars: 1000, slide_count: 2 },
          { unique_chars: 1000, slide_count: 2 },
        ],
      }),
    )
    // identisch zu einer einzelnen Section mit 2000/4 (siehe Basisfall)
    expect(result.minutes).toBe(11)
  })

  it('liefert 0 Minuten ohne Sections', () => {
    expect(estimateMinutes(baseInput({ sections: [] })).minutes).toBe(0)
  })

  it('skaliert linear mit course.difficulty um den Mittelwert 3', () => {
    const neutral = estimateMinutes(baseInput()).minutes
    const schwer = estimateMinutes(baseInput({ course: { difficulty: 5 } })).minutes
    const leicht = estimateMinutes(baseInput({ course: { difficulty: 1 } })).minutes

    expect(schwer).toBeGreaterThan(neutral)
    expect(leicht).toBeLessThan(neutral)
    // 5/3 * 11 = 18.33 -> gerundet 18
    expect(schwer).toBe(Math.round((5 / 3) * 11))
  })

  it('skaliert linear mit topic.weight um den Mittelwert 3', () => {
    const neutral = estimateMinutes(baseInput()).minutes
    const wichtig = estimateMinutes(baseInput({ topic: { weight: 5 } })).minutes
    expect(wichtig).toBeGreaterThan(neutral)
    expect(wichtig).toBe(Math.round((5 / 3) * 11))
  })

  it('wendet den Prüfungsart-Multiplikator an — mc niedriger als freitext', () => {
    const mc = estimateMinutes(baseInput({ assessmentFormat: 'mc' })).minutes
    const freitext = estimateMinutes(baseInput({ assessmentFormat: 'freitext' })).minutes
    expect(mc).toBeLessThan(freitext)
    expect(mc).toBe(Math.round(11 * EXAM_FORMAT_MULTIPLIER.mc))
    expect(freitext).toBe(Math.round(11 * EXAM_FORMAT_MULTIPLIER.freitext))
  })

  it('ignoriert eine Kalibrierung unterhalb der Mindest-Stichprobengröße', () => {
    const result = estimateMinutes(
      baseInput({ calibration: { minutes_per_1k_chars: 2, sample_count: 9 } }),
    )
    expect(result.calibrated).toBe(false)
    expect(result.minutes).toBe(11) // unverändert gegenüber dem Basisfall (4.5er-Konstante)
  })

  it('verwendet die Kalibrierung ab der Mindest-Stichprobengröße statt der Ausgangskonstante', () => {
    const result = estimateMinutes(
      baseInput({ calibration: { minutes_per_1k_chars: 2, sample_count: 10 } }),
    )
    expect(result.calibrated).toBe(true)
    // (2000/1000 * 2 + 4*0.5) = 4 + 2 = 6, alle anderen Multiplikatoren 1.0
    expect(result.minutes).toBe(6)
  })
})
