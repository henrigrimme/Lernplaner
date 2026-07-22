import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentSetup } from '../../src/ui/AssessmentSetup'
import type { Assessment, Course } from '../../src/data/schema'

const COURSE: Course = {
  id: 1,
  name: 'Microeconomics',
  semester: 'WS25',
  color: '#000',
  priority: 3,
  difficulty: 3,
  archived: 0,
  created_at: 'x',
  language: 'de',
  group_id: null,
}

function assessment(overrides: Partial<Assessment> & { id: number }): Assessment {
  return {
    course_id: 1,
    type: 'klausur',
    title: `Prüfung ${overrides.id}`,
    date: '2026-10-15',
    weight: 3,
    format: 'mixed',
    open_book: 0,
    duration_minutes: null,
    ...overrides,
  }
}

function noop() {
  return { onAdd: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn() }
}

describe('AssessmentSetup', () => {
  it('zeigt nur Prüfungen des übergebenen Fachs, sortiert nach Datum', () => {
    const assessments = [
      assessment({ id: 1, course_id: 1, title: 'Später', date: '2026-10-20' }),
      assessment({ id: 2, course_id: 2, title: 'Anderes Fach' }),
      assessment({ id: 3, course_id: 1, title: 'Früher', date: '2026-10-05' }),
    ]
    render(<AssessmentSetup course={COURSE} assessments={assessments} {...noop()} />)

    expect(screen.queryByText('Anderes Fach')).not.toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]!).getByText('Früher')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Später')).toBeInTheDocument()
  })

  it('legt eine neue Prüfung mit den Formularwerten an', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={[]} {...noop()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Prüfung hinzufügen' }))
    await user.type(screen.getByLabelText('Titel'), 'Endklausur')
    await user.type(screen.getByLabelText('Prüfungsdatum'), '2026-10-15')
    await user.click(screen.getByLabelText('Freitext'))
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 1,
        title: 'Endklausur',
        date: '2026-10-15',
        format: 'freitext',
        open_book: 0,
        duration_minutes: null,
      }),
    )
  })

  it('setzt duration_minutes und open_book korrekt', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={[]} {...noop()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Prüfung hinzufügen' }))
    await user.type(screen.getByLabelText('Titel'), 'Endklausur')
    await user.type(screen.getByLabelText('Prüfungsdatum'), '2026-10-15')
    await user.click(screen.getByLabelText('Multiple Choice'))
    await user.click(screen.getByLabelText('Hilfsmittel erlaubt'))
    await user.type(screen.getByLabelText('Dauer (Minuten, optional)'), '90')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ open_book: 1, duration_minutes: 90 }))
  })

  it('bearbeitet eine bestehende Prüfung', async () => {
    const user = userEvent.setup()
    const assessments = [assessment({ id: 1, title: 'Endklausur' })]
    const onUpdate = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={assessments} {...noop()} onUpdate={onUpdate} />)

    const item = screen.getByText('Endklausur').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Bearbeiten' }))
    // `format: 'mixed'` (siehe assessment()-Fixture) lässt sich nicht in
    // einzelne Formate zurückübersetzen (AssessmentSetup.tsx "toDraft") —
    // Checkboxen starten leer, ein Format muss neu gewählt werden.
    await user.click(screen.getByLabelText('Freitext'))
    await user.selectOptions(screen.getByLabelText('Gewicht'), '5')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ weight: 5, title: 'Endklausur' }))
  })

  it('löscht eine Prüfung', async () => {
    const user = userEvent.setup()
    const assessments = [assessment({ id: 1, title: 'Endklausur' })]
    const onRemove = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={assessments} {...noop()} onRemove={onRemove} />)

    const item = screen.getByText('Endklausur').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Löschen' }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})
