import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantChat } from '../../src/ui/AssistantChat'
import type { ChatReply } from '../../src/ai/types'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

function setup(reply: ChatReply | Error) {
  const onSend = vi.fn(async () => {
    if (reply instanceof Error) throw reply
    return reply
  })
  const onApplyAvailability = vi.fn()
  const onApplyTopicWeights = vi.fn()
  const view = render(
    <AssistantChat
      onSend={onSend}
      onApplyAvailability={onApplyAvailability}
      onApplyTopicWeights={onApplyTopicWeights}
      topicName={(id) => `Thema ${id}`}
    />,
  )
  return { onSend, onApplyAvailability, onApplyTopicWeights, view }
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
