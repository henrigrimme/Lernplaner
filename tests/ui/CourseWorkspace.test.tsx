import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CourseWorkspace } from '../../src/ui/CourseWorkspace'
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

describe('CourseWorkspace', () => {
  it('zeigt standardmäßig den Reiter "Prüfungen"', () => {
    render(
      <CourseWorkspace
        course={course()}
        pruefungenContent={<p>Prüfungsinhalt</p>}
        materialContent={<p>Materialinhalt</p>}
        themenContent={<p>Themeninhalt</p>}
        anweisungenContent={<p>Anweisungsinhalt</p>}
      />,
    )
    expect(screen.getByText('Prüfungsinhalt')).toBeVisible()
    expect(screen.getByText('Materialinhalt')).not.toBeVisible()
    expect(screen.getByText('Themeninhalt')).not.toBeVisible()
    expect(screen.getByText('Anweisungsinhalt')).not.toBeVisible()
  })

  it('wechselt beim Klick auf einen Reiter den sichtbaren Inhalt', async () => {
    const user = userEvent.setup()
    render(
      <CourseWorkspace
        course={course()}
        pruefungenContent={<p>Prüfungsinhalt</p>}
        materialContent={<p>Materialinhalt</p>}
        themenContent={<p>Themeninhalt</p>}
        anweisungenContent={<p>Anweisungsinhalt</p>}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Material' }))

    expect(screen.getByText('Materialinhalt')).toBeVisible()
    expect(screen.getByText('Prüfungsinhalt')).not.toBeVisible()
    expect(screen.getByRole('tab', { name: 'Material' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Prüfungen' })).toHaveAttribute('aria-selected', 'false')
  })

  it('behält alle vier Panels im DOM (nur "hidden", kein bedingtes Unmounten)', async () => {
    const user = userEvent.setup()
    render(
      <CourseWorkspace
        course={course()}
        pruefungenContent={<input placeholder="Notiz" />}
        materialContent={<p>Materialinhalt</p>}
        themenContent={<p>Themeninhalt</p>}
        anweisungenContent={<p>Anweisungsinhalt</p>}
      />,
    )

    await user.type(screen.getByPlaceholderText('Notiz'), 'Entwurf')
    await user.click(screen.getByRole('tab', { name: 'Themen & Quellen' }))
    await user.click(screen.getByRole('tab', { name: 'Prüfungen' }))

    expect(screen.getByPlaceholderText('Notiz')).toHaveValue('Entwurf')
  })

  it('zeigt den vierten Reiter "Anweisungen"', async () => {
    const user = userEvent.setup()
    render(
      <CourseWorkspace
        course={course()}
        pruefungenContent={<p>A</p>}
        materialContent={<p>B</p>}
        themenContent={<p>C</p>}
        anweisungenContent={<p>Anweisungsinhalt</p>}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Anweisungen' }))

    expect(screen.getByText('Anweisungsinhalt')).toBeVisible()
  })

  it('benennt die Reiter-Sektion nach dem Fachnamen', () => {
    render(
      <CourseWorkspace
        course={course({ name: 'Money & Banking' })}
        pruefungenContent={<p>A</p>}
        materialContent={<p>B</p>}
        themenContent={<p>C</p>}
        anweisungenContent={<p>D</p>}
      />,
    )
    expect(screen.getByRole('region', { name: 'Fach-Detail: Money & Banking' })).toBeInTheDocument()
  })
})
