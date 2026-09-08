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
  const onUploadFolder = vi.fn(async () => EMPTY_UPLOAD)
  const view = render(
    <AssistantChat
      onSend={onSend}
      onApplyAvailability={onApplyAvailability}
      onApplyTopicWeights={onApplyTopicWeights}
      topicName={(id) => `Thema ${id}`}
      courses={[{ id: 1, name: 'Microeconomics' }]}
      onUploadDocuments={onUploadDocuments}
      onUploadFolder={onUploadFolder}
      {...extra}
    />,
  )
  return { onSend, onApplyAvailability, onApplyTopicWeights, onUploadDocuments, onUploadFolder, view }
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

  it('lädt Dokumente zum gewählten Fach hoch und meldet das Ergebnis als Sven-Nachricht', async () => {
    const user = userEvent.setup()
    const onUploadDocuments = vi.fn(async () => ({
      added: 2,
      failed: ['kaputt.pdf'],
      topicsCreated: 1,
      courseName: 'Microeconomics',
    }))
    setup({ message: 'x', proposals: [] }, {
      courses: [{ id: 1, name: 'Microeconomics' }, { id: 2, name: 'Money & Banking' }],
      onUploadDocuments,
    })

    await user.selectOptions(screen.getByLabelText('Zu welchem Fach?'), '2')
    await user.upload(
      screen.getByLabelText(/Dateien wählen/),
      [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.pdf', { type: 'application/pdf' })],
    )

    expect(onUploadDocuments).toHaveBeenCalledWith(2, expect.arrayContaining([expect.any(File)]))
    expect(await screen.findByText(/2 Dokumente aus 2 Datei\(en\) zu „Microeconomics" hinzugefügt/)).toBeInTheDocument()
    expect(screen.getByText(/1 neues Thema/)).toBeInTheDocument()
    expect(screen.getByText(/Nicht gelesen: kaputt\.pdf/)).toBeInTheDocument()
  })

  it('lädt einen ganzen Ordner hoch', async () => {
    const user = userEvent.setup()
    const onUploadFolder = vi.fn(async () => ({
      added: 5,
      failed: [],
      topicsCreated: 3,
      skippedFormats: 2,
      courseName: 'Microeconomics',
    }))
    setup({ message: 'x', proposals: [] }, { onUploadFolder })

    await user.click(screen.getByRole('button', { name: 'Oder ganzen Ordner wählen' }))
    expect(onUploadFolder).toHaveBeenCalledWith(1)
    expect(await screen.findByText(/5 Dokumente aus einem Ordner zu „Microeconomics" hinzugefügt/)).toBeInTheDocument()
    expect(screen.getByText(/2 Datei\(en\) mit nicht unterstütztem Format übersprungen/)).toBeInTheDocument()
  })

  it('weist auf ein fehlendes Fach hin', async () => {
    setup({ message: 'x', proposals: [] }, { courses: [] })
    expect(screen.getByText(/Leg zuerst unter .* ein Fach an/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Zu welchem Fach?')).not.toBeInTheDocument()
  })

  it('speichert die Upload-Meldung im Verlauf', async () => {
    const user = userEvent.setup()
    const { view } = setup({ message: 'x', proposals: [] }, {
      onUploadFolder: vi.fn(async () => ({ added: 1, failed: [], topicsCreated: 0, courseName: 'Microeconomics' })),
    })
    await user.click(screen.getByRole('button', { name: 'Oder ganzen Ordner wählen' }))
    await screen.findByText(/1 Dokument aus einem Ordner/)

    view.unmount()
    setup({ message: 'x', proposals: [] })
    expect(screen.getByText(/1 Dokument aus einem Ordner zu „Microeconomics" hinzugefügt/)).toBeInTheDocument()
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
        onUploadFolder={vi.fn(async () => EMPTY_UPLOAD)}
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
