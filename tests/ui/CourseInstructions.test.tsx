import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CourseInstructions } from '../../src/ui/CourseInstructions'
import type { Course } from '../../src/data/schema'

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 1,
    name: 'Microeconomics',
    semester: 'WS26',
    color: '#c9754f',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
    group_id: null,
    instructions: '',
    ...overrides,
  }
}

describe('CourseInstructions', () => {
  it('zeigt bereits gespeicherte Anweisungen vorausgefüllt', () => {
    render(<CourseInstructions course={course({ instructions: 'Fokus auf Rechenaufgaben' })} onSave={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('Fokus auf Rechenaufgaben')
  })

  it('speichert nur nach Änderung — der Button ist bei unverändertem Text deaktiviert', () => {
    render(<CourseInstructions course={course()} onSave={() => {}} />)
    expect(screen.getByRole('button', { name: 'Gespeichert' })).toBeDisabled()
  })

  it('ruft onSave mit dem neuen Text auf', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CourseInstructions course={course()} onSave={onSave} />)

    await user.type(screen.getByRole('textbox'), 'Nur Konzeptfragen')
    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button).toBeEnabled()
    await user.click(button)

    expect(onSave).toHaveBeenCalledWith('Nur Konzeptfragen')
  })

  it('setzt den Entwurf beim Fachwechsel zurück', () => {
    const { rerender } = render(<CourseInstructions course={course({ id: 1, instructions: 'Fach A' })} onSave={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('Fach A')

    rerender(<CourseInstructions course={course({ id: 2, instructions: 'Fach B' })} onSave={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('Fach B')
  })
})
