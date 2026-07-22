import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SourceViewer } from '../../src/ui/SourceViewer'
import type { Card, Topic, TopicSection } from '../../src/data/schema'

vi.mock('../../src/ui/PdfViewer', () => ({
  PdfViewer: ({
    data,
    initialPage,
    onSelectionChange,
  }: {
    data: Uint8Array
    initialPage?: number
    onSelectionChange?: (text: string, page: number) => void
  }) => (
    <div aria-label="PDF-Ansicht (Mock)">
      Seite {initialPage}, {data.length} Bytes
      <button type="button" onClick={() => onSelectionChange?.('Markierter Text', 5)}>
        Auswahl simulieren
      </button>
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

function card(overrides: Partial<Card> & { id: number }): Card {
  return {
    topic_id: 1,
    document_id: 1,
    page: 5,
    front: 'Frage',
    back: 'Antwort',
    source_quote: 'Zitat',
    created_at: 'x',
    ...overrides,
  }
}

const NOOP_CARD_PROPS = { cards: [], onCreateCard: vi.fn(), onDeleteCard: vi.fn() }

describe('SourceViewer', () => {
  it('zeigt einen Hinweis ohne importierte Materialien', () => {
    render(<SourceViewer topics={[]} topicSections={[]} documentBytes={{}} {...NOOP_CARD_PROPS} />)
    expect(screen.getByText(/noch keine materialien importiert/i)).toBeInTheDocument()
  })

  it('listet Abschnitte mit Themenname und Seitenbereich', () => {
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section({ id: 1, topic_id: 1, page_start: 3, page_end: 7 })]
    render(<SourceViewer topics={topics} topicSections={sections} documentBytes={{}} {...NOOP_CARD_PROPS} />)
    expect(screen.getByText(/Consumer Theory/)).toBeInTheDocument()
    expect(screen.getByText(/Seite 3–7/)).toBeInTheDocument()
  })

  it('zeigt bei einer Einzelseite keinen Bereich (kein "3–3")', () => {
    const sections = [section({ id: 1, page_start: 5, page_end: 5 })]
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={{}} {...NOOP_CARD_PROPS} />)
    expect(screen.getByText(/Seite 5$/)).toBeInTheDocument()
  })

  it('öffnet den PdfViewer mit der richtigen Startseite, wenn Bytes vorhanden sind', async () => {
    const user = userEvent.setup()
    const sections = [section({ id: 1, document_id: 7, page_start: 4 })]
    const documentBytes = { 7: new Uint8Array([1, 2, 3]) }
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={documentBytes} {...NOOP_CARD_PROPS} />)

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.getByText(/Seite 4, 3 Bytes/)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn die PDF-Bytes für dieses Dokument nicht (mehr) vorliegen', async () => {
    const user = userEvent.setup()
    const sections = [section({ id: 1, document_id: 7 })]
    render(<SourceViewer topics={[]} topicSections={sections} documentBytes={{}} {...NOOP_CARD_PROPS} />)

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.getByText(/PDF nicht verfügbar/i)).toBeInTheDocument()
  })

  it('zeigt den CardCreator, sobald eine Textauswahl gemeldet wird', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section({ id: 1, topic_id: 1, document_id: 7 })]
    const documentBytes = { 7: new Uint8Array([1]) }
    render(<SourceViewer topics={topics} topicSections={sections} documentBytes={documentBytes} {...NOOP_CARD_PROPS} />)

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.queryByLabelText('Karteikarte erstellen')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Auswahl simulieren' }))
    expect(screen.getByLabelText('Karteikarte erstellen')).toBeInTheDocument()
    expect(screen.getByText(/Markierter Text/)).toBeInTheDocument()
  })

  it('ruft onCreateCard mit dem Thema des Abschnitts auf und blendet den CardCreator danach aus', async () => {
    const user = userEvent.setup()
    const onCreateCard = vi.fn()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section({ id: 1, topic_id: 1, document_id: 7 })]
    const documentBytes = { 7: new Uint8Array([1]) }
    render(
      <SourceViewer
        topics={topics}
        topicSections={sections}
        documentBytes={documentBytes}
        cards={[]}
        onCreateCard={onCreateCard}
        onDeleteCard={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    await user.click(screen.getByRole('button', { name: 'Auswahl simulieren' }))
    await user.type(screen.getByLabelText('Vorderseite'), 'F')
    await user.type(screen.getByLabelText('Rückseite'), 'A')
    await user.click(screen.getByRole('button', { name: 'Karteikarte erstellen' }))

    expect(onCreateCard).toHaveBeenCalledWith({
      topic_id: 1,
      document_id: 7,
      page: 5,
      front: 'F',
      back: 'A',
      source_quote: 'Markierter Text',
    })
    expect(screen.queryByLabelText('Karteikarte erstellen')).not.toBeInTheDocument()
  })

  it('listet vorhandene Karteikarten des angezeigten Themas mit Löschen-Knopf', async () => {
    const user = userEvent.setup()
    const onDeleteCard = vi.fn()
    const topics = [topic({ id: 1, name: 'Consumer Theory' })]
    const sections = [section({ id: 1, topic_id: 1, document_id: 7 })]
    const documentBytes = { 7: new Uint8Array([1]) }
    const cards = [card({ id: 5, topic_id: 1, front: 'Was ist X?' }), card({ id: 6, topic_id: 2, front: 'Anderes Thema' })]
    render(
      <SourceViewer
        topics={topics}
        topicSections={sections}
        documentBytes={documentBytes}
        cards={cards}
        onCreateCard={vi.fn()}
        onDeleteCard={onDeleteCard}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Im PDF ansehen' }))
    expect(screen.getByText('Was ist X?')).toBeInTheDocument()
    expect(screen.queryByText('Anderes Thema')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Löschen' }))
    expect(onDeleteCard).toHaveBeenCalledWith(5)
  })

  it('setzt die Auswahl zurück, wenn ein anderer Abschnitt geöffnet wird', async () => {
    const user = userEvent.setup()
    const topics = [topic({ id: 1 }), topic({ id: 2 })]
    const sections = [
      section({ id: 1, topic_id: 1, document_id: 7 }),
      section({ id: 2, topic_id: 2, document_id: 8, page_start: 2 }),
    ]
    const documentBytes = { 7: new Uint8Array([1]), 8: new Uint8Array([2]) }
    render(<SourceViewer topics={topics} topicSections={sections} documentBytes={documentBytes} {...NOOP_CARD_PROPS} />)

    const viewButtons = screen.getAllByRole('button', { name: 'Im PDF ansehen' })
    await user.click(viewButtons[0]!)
    await user.click(screen.getByRole('button', { name: 'Auswahl simulieren' }))
    expect(screen.getByLabelText('Karteikarte erstellen')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Im PDF ansehen' })[1]!)
    expect(screen.queryByLabelText('Karteikarte erstellen')).not.toBeInTheDocument()
  })
})
