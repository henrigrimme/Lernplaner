import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantChat } from '../../src/ui/AssistantChat'
import type { ChatReply } from '../../src/ai/types'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

const EMPTY_UPLOAD = { added: 0, failed: [], topicsCreated: 0, courseName: '' }

function setup(reply: ChatReply | Error, extra?: Partial<React.ComponentProps<typeof AssistantChat>>) {
  const onSend = vi.fn(async () => {
    if (reply instanceof Error) throw reply
    return reply
  })
  const onApplyAvailability = vi.fn()
  const onApplyTopicWeights = vi.fn()
  const onUploadDocuments = vi.fn(async () => EMPTY_UPLOAD)
  const onPickFolder = vi.fn(async () => null)
  const view = render(
    <AssistantChat
      onSend={onSend}
      onApplyAvailability={onApplyAvailability}
      onApplyTopicWeights={onApplyTopicWeights}
      topicName={(id) => `Thema ${id}`}
      courses={[{ id: 1, name: 'Microeconomics' }]}
      onUploadDocuments={onUploadDocuments}
      onPickFolder={onPickFolder}
      {...extra}
    />,
  )
  return { onSend, onApplyAvailability, onApplyTopicWeights, onUploadDocuments, onPickFolder, view }
}

describe('AssistantChat', () => {
  it('sendet die Nachricht und zeigt Svens Antwort', async () => {
    const user = userEvent.setup()
    const { onSend } = setup({ message: 'Mach 90 Minuten am Montag.', proposals: [] })

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'Wie plane ich Montag?')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(onSend).toHaveBeenCalledWith([{ role: 'user', content: 'Wie plane ich Montag?' }])
    expect(await screen.findByText('Mach 90 Minuten am Montag.')).toBeInTheDocument()
    expect(screen.getByText('Wie plane ich Montag?')).toBeInTheDocument()
  })

  it('rendert Markdown in Svens Antwort (fett + Liste)', async () => {
    const user = userEvent.setup()
    setup({ message: 'Plan:\n- **Montag** Micro\n- Dienstag Macro', proposals: [] })
    await user.type(screen.getByLabelText('Nachricht an Sven'), 'plan bitte')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    const bubble = (await screen.findByText('Montag')).closest('.chat-bubble-md') as HTMLElement
    expect(bubble.querySelector('strong')).toHaveTextContent('Montag')
    expect(bubble.querySelectorAll('li')).toHaveLength(2)
  })

  it('zeigt einen Verfügbarkeits-Vorschlag und übernimmt ihn erst auf Klick', async () => {
    const user = userEvent.setup()
    const { onApplyAvailability } = setup({
      message: 'Vorschlag unten.',
      proposals: [
        {
          kind: 'availability',
          proposal: {
            weekdayMinutes: [{ weekday: 1, minutes: 90 }],
            exceptions: [],
            recurringBlockers: [],
            summary: 'Mo 90',
          },
        },
      ],
    })

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'plan')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    const proposal = await screen.findByText(/Vorschlag: Verfügbarkeit/)
    const card = proposal.closest('.chat-proposal') as HTMLElement
    expect(within(card).getByText('Montag: 90 Min.')).toBeInTheDocument()
    expect(onApplyAvailability).not.toHaveBeenCalled()

    await user.click(within(card).getByRole('button', { name: 'Übernehmen' }))
    expect(onApplyAvailability).toHaveBeenCalledTimes(1)
    expect(within(card).getByRole('button', { name: 'Übernommen' })).toBeDisabled()
  })

  it('übernimmt einen Themen-Gewichts-Vorschlag', async () => {
    const user = userEvent.setup()
    const { onApplyTopicWeights } = setup({
      message: 'Gewichte anpassen:',
      proposals: [{ kind: 'topicWeights', changes: [{ topicId: 7, weight: 5 }], summary: 'Thema 7 hoch' }],
    })

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'gewichte')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    const card = (await screen.findByText(/Vorschlag: Themen-Gewichte/)).closest('.chat-proposal') as HTMLElement
    expect(within(card).getByText('Thema 7 → Gewicht 5/5')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Übernehmen' }))
    expect(onApplyTopicWeights).toHaveBeenCalledWith([{ topicId: 7, weight: 5 }])
  })

  it('zeigt einen Fehler und behält die Nutzer-Nachricht', async () => {
    const user = userEvent.setup()
    setup(new Error('Kein KI-Anbieter konfiguriert'))

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'hallo')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Kein KI-Anbieter konfiguriert')
    expect(screen.getByText('hallo')).toBeInTheDocument()
  })

  it('sendet keine leere Nachricht', async () => {
    const { onSend } = setup({ message: 'x', proposals: [] })
    expect(screen.getByRole('button', { name: 'Senden' })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('hängt Dateien an, schickt die Namen mit und importiert sie erst auf Svens Vorschlag hin', async () => {
    const user = userEvent.setup()
    const onUploadDocuments = vi.fn(async () => ({
      added: 2,
      failed: ['kaputt.pdf'],
      topicsCreated: 1,
      courseName: 'Money & Banking',
    }))
    const { onSend } = setup(
      { message: 'Alles klar, die kommen zu Money & Banking.', proposals: [{ kind: 'importDocuments', courseId: 2, fileNames: ['a.pdf', 'b.pdf'] }] },
      { courses: [{ id: 1, name: 'Microeconomics' }, { id: 2, name: 'Money & Banking' }], onUploadDocuments },
    )

    await user.upload(screen.getByLabelText(/Dateien anhängen/), [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ])
    expect(screen.getByLabelText('Angehängte Dateien')).toHaveTextContent('a.pdf')

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'Die gehören zu Money & Banking')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    // Dateinamen wandern in den an die KI geschickten Nachrichtentext
    expect(onSend).toHaveBeenCalledWith([
      { role: 'user', content: 'Die gehören zu Money & Banking\n\n[Angehängte Dateien: a.pdf, b.pdf]' },
    ])
    expect(onUploadDocuments).not.toHaveBeenCalled()

    const card = (await screen.findByText(/Vorschlag: Dokumente hinzufügen/)).closest('.chat-proposal') as HTMLElement
    expect(within(card).getByText('Fach: Money & Banking')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Übernehmen' }))

    expect(onUploadDocuments).toHaveBeenCalledWith(2, [expect.any(File), expect.any(File)])
    expect(await screen.findByText(/2 Dokumente zu „Money & Banking" hinzugefügt/)).toBeInTheDocument()
    expect(screen.getByText(/Nicht gelesen: kaputt\.pdf/)).toBeInTheDocument()
  })

  it('hängt die Dateien eines Ordners als Chips an', async () => {
    const user = userEvent.setup()
    const onPickFolder = vi.fn(async () => [
      { name: 'Kapitel 1/folien.pdf', data: new Uint8Array([1, 2, 3]) },
      { name: 'notizen.md', data: new Uint8Array([4]) },
    ])
    setup({ message: 'x', proposals: [] }, { onPickFolder })

    await user.click(screen.getByRole('button', { name: /Ordner anhängen/ }))
    const chips = screen.getByLabelText('Angehängte Dateien')
    expect(chips).toHaveTextContent('folien.pdf')
    expect(chips).toHaveTextContent('notizen.md')
  })

  it('entfernt einen Anhang wieder', async () => {
    const user = userEvent.setup()
    setup({ message: 'x', proposals: [] })
    await user.upload(screen.getByLabelText(/Dateien anhängen/), new File(['a'], 'weg.pdf'))
    expect(screen.getByLabelText('Angehängte Dateien')).toHaveTextContent('weg.pdf')
    await user.click(screen.getByRole('button', { name: 'weg.pdf entfernen' }))
    expect(screen.queryByLabelText('Angehängte Dateien')).not.toBeInTheDocument()
  })

  it('meldet, wenn die Dateien für einen Import-Vorschlag nicht mehr angehängt sind', async () => {
    const user = userEvent.setup()
    const { onUploadDocuments } = setup({
      message: 'Import:',
      proposals: [{ kind: 'importDocuments', courseId: 1, fileNames: ['fehlt.pdf'] }],
    })
    await user.type(screen.getByLabelText('Nachricht an Sven'), 'importier mal')
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    const card = (await screen.findByText(/Vorschlag: Dokumente hinzufügen/)).closest('.chat-proposal') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Übernehmen' }))

    expect(onUploadDocuments).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/nicht mehr da/)
  })

  it('zeigt während des Wartens einen Spinner mit wechselndem Spruch', async () => {
    const user = userEvent.setup()
    let resolveReply: (r: ChatReply) => void = () => {}
    const onSend = vi.fn(() => new Promise<ChatReply>((res) => (resolveReply = res)))
    render(
      <AssistantChat
        onSend={onSend}
        onApplyAvailability={vi.fn()}
        onApplyTopicWeights={vi.fn()}
        topicName={(id) => `Thema ${id}`}
        courses={[{ id: 1, name: 'Microeconomics' }]}
        onUploadDocuments={vi.fn(async () => EMPTY_UPLOAD)}
        onPickFolder={vi.fn(async () => null)}
      />,
    )

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'Hey Sven')
    await user.click(screen.getByRole('button', { name: 'Senden' }))

    const status = await screen.findByRole('status')
    expect(status.textContent).toMatch(/^Sven .+ …$/)
    expect(status.querySelector('.chat-spinner')).not.toBeNull()

    resolveReply({ message: 'Da bin ich wieder.', proposals: [] })
    expect(await screen.findByText('Da bin ich wieder.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('sendet mit Enter, fügt mit Umschalt+Enter eine neue Zeile ein', async () => {
    const user = userEvent.setup()
    const { onSend } = setup({ message: 'ok', proposals: [] })
    const input = screen.getByLabelText('Nachricht an Sven')

    await user.type(input, 'Zeile eins{Shift>}{Enter}{/Shift}Zeile zwei')
    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('Zeile eins\nZeile zwei')

    await user.type(input, '{Enter}')
    expect(onSend).toHaveBeenCalledWith([{ role: 'user', content: 'Zeile eins\nZeile zwei' }])
  })

  it('behält den Verlauf über einen Neuaufbau (localStorage)', async () => {
    const user = userEvent.setup()
    const { view } = setup({ message: 'Antwort von Sven.', proposals: [] })

    await user.type(screen.getByLabelText('Nachricht an Sven'), 'Meine Frage')
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    await screen.findByText('Antwort von Sven.')

    view.unmount()
    setup({ message: 'egal', proposals: [] })

    expect(screen.getByText('Meine Frage')).toBeInTheDocument()
    expect(screen.getByText('Antwort von Sven.')).toBeInTheDocument()
  })

  it('merkt sich einen übernommenen Vorschlag über den Neuaufbau', async () => {
    const user = userEvent.setup()
    const reply: ChatReply = {
      message: 'Vorschlag:',
      proposals: [{ kind: 'topicWeights', changes: [{ topicId: 7, weight: 5 }], summary: 's' }],
    }
    const { view } = setup(reply)
    await user.type(screen.getByLabelText('Nachricht an Sven'), 'x')
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    const card = (await screen.findByText(/Themen-Gewichte/)).closest('.chat-proposal') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Übernehmen' }))

    view.unmount()
    setup(reply)
    const card2 = (await screen.findByText(/Themen-Gewichte/)).closest('.chat-proposal') as HTMLElement
    expect(within(card2).getByRole('button', { name: 'Übernommen' })).toBeDisabled()
  })

  it('löscht den Verlauf und leert damit auch den Speicher', async () => {
    const user = userEvent.setup()
    const { view } = setup({ message: 'Antwort.', proposals: [] })
    await user.type(screen.getByLabelText('Nachricht an Sven'), 'Frage')
    await user.click(screen.getByRole('button', { name: 'Senden' }))
    await screen.findByText('Antwort.')

    await user.click(screen.getByRole('button', { name: 'Verlauf löschen' }))
    expect(screen.queryByText('Frage')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verlauf löschen' })).not.toBeInTheDocument()

    view.unmount()
    setup({ message: 'egal', proposals: [] })
    expect(screen.queryByText('Frage')).not.toBeInTheDocument()
  })
})
