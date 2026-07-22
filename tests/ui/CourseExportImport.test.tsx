import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CourseExportImport } from '../../src/ui/CourseExportImport'
import { exportCourse, serializeCourseExport } from '../../src/data/courseExport'
import type { Course, Topic } from '../../src/data/schema'

function course(overrides: Partial<Course> & { id: number }): Course {
  return {
    name: 'Microeconomics',
    semester: 'WS26',
    color: '#000',
    priority: 3,
    difficulty: 3,
    archived: 0,
    created_at: 'x',
    language: 'de',
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

describe('CourseExportImport', () => {
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

  it('zeigt keine Export-Auswahl ohne Fächer', () => {
    render(
      <CourseExportImport
        courses={[]}
        topics={[]}
        topicSections={[]}
        assessments={[]}
        studyBlocks={[]}
        onImport={vi.fn()}
        now={() => 'x'}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Exportieren' })).not.toBeInTheDocument()
  })

  it('exportiert das ausgewählte Fach als Datei-Download', async () => {
    const user = userEvent.setup()
    const courses = [course({ id: 1, name: 'Microeconomics' })]
    render(
      <CourseExportImport
        courses={courses}
        topics={[]}
        topicSections={[]}
        assessments={[]}
        studyBlocks={[]}
        onImport={vi.fn()}
        now={() => '2026-07-21T00:00:00Z'}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Fach exportieren'), '1')
    await user.click(screen.getByRole('button', { name: 'Exportieren' }))

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('importiert eine gültige Export-Datei und ruft onImport mit umgeschriebenen IDs auf', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    const bundle = exportCourse(1, [course({ id: 1 })], [topic({ id: 1, course_id: 1 })], [], [], [], 'x')
    const file = new File([serializeCourseExport(bundle)], 'kurs.json', { type: 'application/json' })

    render(
      <CourseExportImport
        courses={[]}
        topics={[]}
        topicSections={[]}
        assessments={[]}
        studyBlocks={[]}
        onImport={onImport}
        now={() => 'x'}
      />,
    )

    await user.upload(screen.getByLabelText('Kurs-Export importieren'), file)

    expect(onImport).toHaveBeenCalledTimes(1)
    const [result] = onImport.mock.calls[0]!
    expect(result.newCourseId).toBe(1)
    expect(result.topics).toHaveLength(1)
  })

  it('zeigt einen Fehler bei einer ungültigen Import-Datei, ohne onImport aufzurufen', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    const file = new File(['nicht json'], 'kaputt.json', { type: 'application/json' })

    render(
      <CourseExportImport
        courses={[]}
        topics={[]}
        topicSections={[]}
        assessments={[]}
        studyBlocks={[]}
        onImport={onImport}
        now={() => 'x'}
      />,
    )

    await user.upload(screen.getByLabelText('Kurs-Export importieren'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(/konnte nicht importiert werden/i)
    expect(onImport).not.toHaveBeenCalled()
  })
})
