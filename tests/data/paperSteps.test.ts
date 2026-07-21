import { describe, expect, it } from 'vitest'
import { removePaperStep, updatePaperStep } from '../../src/data/paperSteps'
import type { PaperStep } from '../../src/data/schema'

function stepFixture(overrides: Partial<PaperStep> = {}): PaperStep {
  return {
    id: 1,
    assessment_id: 1,
    title: 'Literaturrecherche',
    due_date: '2026-09-15',
    status: 'offen',
    notes: null,
    ...overrides,
  }
}

describe('updatePaperStep', () => {
  it('ändert nur die angegebenen Felder', () => {
    const result = updatePaperStep([stepFixture()], 1, { status: 'erledigt' })
    expect(result[0]).toMatchObject({ status: 'erledigt', title: 'Literaturrecherche' })
  })
})

describe('removePaperStep', () => {
  it('entfernt den Teilschritt vollständig', () => {
    expect(removePaperStep([stepFixture()], 1)).toEqual([])
  })
})
