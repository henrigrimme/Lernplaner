import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaperSteps } from '../../src/ui/PaperSteps'
import type { Assessment, Course, PaperStep } from '../../src/data/schema'

const COURSE: Course = {
  id: 1,
  name: 'Microeconomics',
  semester: 'WS25',
  color: '#000',
  priority: 3,
  difficulty: 3,
  archived: 0,
  created_at: 'x',
}

function assessment(overrides: Partial<Assessment> & { id: number }): Assessment {
  return {
    course_id: 1,
    type: 'paper',
    title: `Paper ${overrides.id}`,
    date: '2026-10-20',
    weight: 5,
    format: 'freitext',
    open_book: 1,
    duration_minutes: null,
    ...overrides,
  }
}

function step(overrides: Partial<PaperStep> & { id: number; assessment_id: number }): PaperStep {
  return {
    title: `Schritt ${overrides.id}`,
    due_date: null,
    status: 'offen',
    notes: null,
    ...overrides,
  }
}

function noop() {
  return { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() }
}

describe('PaperSteps', () => {
  it('zeigt nichts an, wenn das Fach keine Paper-Abgabe hat', () => {
    const assessments = [assessment({ id: 1, type: 'klausur', course_id: 1 })]
    const { container } = render(
      <PaperSteps course={COURSE} assessments={assessments} steps={[]} {...noop()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('zeigt Paper-Abgaben nur des übergebenen Fachs', () => {
    const assessments = [
      assessment({ id: 1, course_id: 1, title: 'Mein Paper' }),
      assessment({ id: 2, course_id: 2, title: 'Anderes Fach' }),
    ]
    render(<PaperSteps course={COURSE} assessments={assessments} steps={[]} {...noop()} />)
    expect(screen.getByText('Mein Paper')).toBeInTheDocument()
    expect(screen.queryByText('Anderes Fach')).not.toBeInTheDocument()
  })

  it('listet die Teilschritte einer Paper-Abgabe mit Fälligkeit', () => {
    const assessments = [assessment({ id: 1, title: 'Mein Paper' })]
    const steps = [step({ id: 10, assessment_id: 1, title: 'Literaturrecherche', due_date: '2026-09-15' })]
    render(<PaperSteps course={COURSE} assessments={assessments} steps={steps} {...noop()} />)
    expect(screen.getByText('Literaturrecherche')).toBeInTheDocument()
    expect(screen.getByText(/fällig 2026-09-15/)).toBeInTheDocument()
  })

  it('legt einen neuen Teilschritt für die richtige Abgabe an', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const assessments = [assessment({ id: 1, title: 'Mein Paper' })]
    render(<PaperSteps course={COURSE} assessments={assessments} steps={[]} {...noop()} onAdd={onAdd} />)

    await user.type(screen.getByLabelText('Titel'), 'Erstentwurf')
    await user.click(screen.getByRole('button', { name: 'Teilschritt hinzufügen' }))

    expect(onAdd).toHaveBeenCalledWith({
      assessment_id: 1,
      title: 'Erstentwurf',
      due_date: null,
      status: 'offen',
      notes: null,
    })
  })

  it('ändert den Status eines Teilschritts', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const assessments = [assessment({ id: 1, title: 'Mein Paper' })]
    const steps = [step({ id: 10, assessment_id: 1, title: 'Literaturrecherche' })]
    render(<PaperSteps course={COURSE} assessments={assessments} steps={steps} {...noop()} onUpdate={onUpdate} />)

    await user.selectOptions(screen.getByLabelText('Status von Literaturrecherche'), 'erledigt')
    expect(onUpdate).toHaveBeenCalledWith(10, { status: 'erledigt' })
  })

  it('löscht einen Teilschritt', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    const assessments = [assessment({ id: 1, title: 'Mein Paper' })]
    const steps = [step({ id: 10, assessment_id: 1, title: 'Literaturrecherche' })]
    render(<PaperSteps course={COURSE} assessments={assessments} steps={steps} {...noop()} onRemove={onRemove} />)

    const item = screen.getByText('Literaturrecherche').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Löschen' }))
    expect(onRemove).toHaveBeenCalledWith(10)
  })
})
