import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarExport } from '../../src/ui/CalendarExport'
import type { StudyBlock, Topic } from '../../src/data/schema'

function block(overrides: Partial<StudyBlock> & { id: number }): StudyBlock {
  return {
    topic_id: 1,
    assessment_id: 1,
    kind: 'erstdurchgang',
    planned_date: '2026-08-03',
    planned_minutes: 45,
    planned_order: 0,
    status: 'offen',
    actual_minutes: null,
    completed_at: null,
    difficulty_feedback: null,
    ...overrides,
  }
}

function topic(overrides: Partial<Topic> & { id: number }): Topic {
  return {
    course_id: 1,
    parent_id: null,
    name: `Thema ${overrides.id}`,
    normalized_name: `thema${overrides.id}`,
    weight: 3,
    difficulty: 3,
    sort_order: 0,
    status: 'offen',
    manual_override: 0,
    ...overrides,
  }
}

describe('CalendarExport', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.fn()
    URL.createObjectURL = createObjectURLSpy
    URL.revokeObjectURL = revokeObjectURLSpy
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    clickSpy.mockRestore()
  })

  it('zeigt einen Hinweis und deaktiviert "Exportieren" ohne offene Lernblöcke', () => {
    render(<CalendarExport studyBlocks={[]} topics={[]} now={() => 'x'} />)
    expect(screen.getByText(/noch keine offenen lernblöcke/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportieren' })).toBeDisabled()
  })

  it('exportiert offene Lernblöcke als Datei-Download', async () => {
    const user = userEvent.setup()
    render(
      <CalendarExport
        studyBlocks={[block({ id: 1 })]}
        topics={[topic({ id: 1, name: 'Consumer Theory' })]}
        now={() => '2026-07-21T12:00:00.000Z'}
      />,
    )

    expect(screen.getByRole('button', { name: 'Exportieren' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Exportieren' }))

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('übernimmt eine geänderte Startzeit in den Export', async () => {
    const user = userEvent.setup()
    render(<CalendarExport studyBlocks={[block({ id: 1 })]} topics={[]} now={() => '2026-07-21T12:00:00.000Z'} />)

    const input = screen.getByLabelText('Tägliche Startzeit')
    await user.clear(input)
    await user.type(input, '14:30')
    await user.click(screen.getByRole('button', { name: 'Exportieren' }))

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blobArg = createObjectURLSpy.mock.calls[0]![0] as Blob
    const text = await blobArg.text()
    expect(text).toContain('DTSTART:20260803T143000')
  })
})
