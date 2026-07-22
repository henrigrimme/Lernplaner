import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppearanceSetting } from '../../src/ui/AppearanceSetting'

describe('AppearanceSetting', () => {
  it('markiert die aktuelle Wahl', () => {
    render(<AppearanceSetting theme="dark" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Dunkel' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Hell' })).not.toBeChecked()
  })

  it('ruft onChange mit der gewählten Option auf', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AppearanceSetting theme="system" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: 'Hell' }))
    expect(onChange).toHaveBeenCalledWith('light')
  })
})
