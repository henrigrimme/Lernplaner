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

describe('AssessmentSetup', () => {
  it('zeigt nur Prüfungen des übergebenen Fachs, sortiert nach Datum', () => {
    const assessments = [
      assessment({ id: 1, course_id: 1, title: 'Später', date: '2026-10-20' }),
      assessment({ id: 2, course_id: 2, title: 'Anderes Fach' }),
      assessment({ id: 3, course_id: 1, title: 'Früher', date: '2026-10-05' }),
    ]
    render(<AssessmentSetup course={COURSE} assessments={assessments} onChange={vi.fn()} />)

    expect(screen.queryByText('Anderes Fach')).not.toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]!).getByText('Früher')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Später')).toBeInTheDocument()
  })

  it('legt eine neue Prüfung mit den Formularwerten an', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Prüfung hinzufügen' }))
    await user.type(screen.getByLabelText('Titel'), 'Endklausur')
    await user.type(screen.getByLabelText('Prüfungsdatum'), '2026-10-15')
    await user.selectOptions(screen.getByLabelText('Format'), 'freitext')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    const result = onChange.mock.calls[0]![0] as Assessment[]
    expect(result[0]).toMatchObject({
      course_id: 1,
      title: 'Endklausur',
      date: '2026-10-15',
      format: 'freitext',
      open_book: 0,
      duration_minutes: null,
    })
  })

  it('setzt duration_minutes und open_book korrekt', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Prüfung hinzufügen' }))
    await user.type(screen.getByLabelText('Titel'), 'Endklausur')
    await user.type(screen.getByLabelText('Prüfungsdatum'), '2026-10-15')
    await user.click(screen.getByLabelText('Open Book'))
    await user.type(screen.getByLabelText('Dauer (Minuten, optional)'), '90')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    const result = onChange.mock.calls[0]![0] as Assessment[]
    expect(result[0]).toMatchObject({ open_book: 1, duration_minutes: 90 })
  })

  it('bearbeitet eine bestehende Prüfung', async () => {
    const user = userEvent.setup()
    const assessments = [assessment({ id: 1, title: 'Endklausur' })]
    const onChange = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={assessments} onChange={onChange} />)

    const item = screen.getByText('Endklausur').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Bearbeiten' }))
    await user.selectOptions(screen.getByLabelText('Gewicht'), '5')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    const result = onChange.mock.calls[0]![0] as Assessment[]
    expect(result[0]).toMatchObject({ id: 1, weight: 5, title: 'Endklausur' })
  })

  it('löscht eine Prüfung', async () => {
    const user = userEvent.setup()
    const assessments = [assessment({ id: 1, title: 'Endklausur' })]
    const onChange = vi.fn()
    render(<AssessmentSetup course={COURSE} assessments={assessments} onChange={onChange} />)

    const item = screen.getByText('Endklausur').closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Löschen' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
