import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppearanceSetting } from '../../src/ui/AppearanceSetting'

describe('AppearanceSetting', () => {
  it('markiert die aktuelle Hell/Dunkel-Wahl', () => {
    render(<AppearanceSetting theme="dark" onChangeTheme={vi.fn()} palette="terrakotta" onChangePalette={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Dunkel' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Hell' })).not.toBeChecked()
  })

  it('ruft onChangeTheme mit der gewählten Option auf', async () => {
    const user = userEvent.setup()
    const onChangeTheme = vi.fn()
    render(<AppearanceSetting theme="system" onChangeTheme={onChangeTheme} palette="terrakotta" onChangePalette={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: 'Hell' }))
    expect(onChangeTheme).toHaveBeenCalledWith('light')
  })

  it('markiert die aktuelle Paletten-Wahl', () => {
    render(<AppearanceSetting theme="system" onChangeTheme={vi.fn()} palette="racing-green" onChangePalette={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /British Racing Green/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Terrakotta/ })).not.toBeChecked()
  })

  it('ruft onChangePalette mit der gewählten Option auf', async () => {
    const user = userEvent.setup()
    const onChangePalette = vi.fn()
    render(<AppearanceSetting theme="system" onChangeTheme={vi.fn()} palette="terrakotta" onChangePalette={onChangePalette} />)

    await user.click(screen.getByRole('radio', { name: /NATO Olive/ }))
    expect(onChangePalette).toHaveBeenCalledWith('nato-olive')
  })
})
