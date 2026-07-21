import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SourceViewer } from '../../src/ui/SourceViewer'
import type { Topic, TopicSection } from '../../src/data/schema'

vi.mock('../../src/ui/PdfViewer', () => ({
  PdfViewer: ({ data, initialPage }: { data: Uint8Array; initialPage?: number }) => (
    <div aria-label="PDF-Ansicht (Mock)">
      Seite {initialPage}, {data.length} Bytes
    </div>
  ),
}))

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

function section(overrides: Partial<TopicSection> & { id: number }): TopicSection {
  return {
    topic_id: 1,
    document_id: 1,
    page_start: 1,
    page_end: 1,
    unique_chars: 100,
    slide_count: 1,
    ...overrides,
  }
}

describe('SourceViewer', () => {
  it('zeigt einen Hinweis ohne importierte Materialien', () => {
    render(<SourceViewer topics={[]} topicSections={[]} documentBytes={{}} />)
    expect(screen.getByText(/noch keine materialien importiert/i)).toBeInTheDocument()
  })

  it('listet Abschnitte mit Themenname und Seitenbereich', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section({ id: 1, topic_id: 1, page_start: 3, page_end: 7 })]
    render(<SourceViewer topics={topics} topicSections={sections} documentBytes={{}} />)
    expect(screen.getByText(/Consumer Theory/)).toBeInTheDocument()
    expect(screen.getByText(/Seite 3–7/)).toBeInTheDocument()
  })

  it('zeigt bei einer Einzelseite keinen Bereich (kein "3–3")', () => {
    const sections = [section({ id: 1, page_start: 5, page_end: 5 })]
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={{}} />)
    expect(screen.getByText(/Seite 5$/)).toBeInTheDocument()
  })

  it('öffnet den PdfViewer mit der richtigen Startseite, wenn Bytes vorhanden sind', async () => {
    const user = userEvent.setup()
    const sections = [section({ id: 1, document_id: 7, page_start: 4 })]
    const documentBytes = { 7: new Uint8Array([1, 2, 3]) }
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={documentBytes} />)

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.getByText(/Seite 4, 3 Bytes/)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn die PDF-Bytes für dieses Dokument nicht (mehr) vorliegen', async () => {
    const user = userEvent.setup()
    const sections = [section({ id: 1, document_id: 7 })]
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={{}} />)

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.getByText(/nicht mehr verfügbar/i)).toBeInTheDocument()
  })
})
