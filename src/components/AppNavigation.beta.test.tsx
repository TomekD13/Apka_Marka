import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppNavigation } from './AppNavigation'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))

describe('menu boczne na becie', () => {
  it('notatki pod Ulubionymi, instalacja miedzy Ustawieniami a kontem, Kontakt na koncu', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/pl']}><AppNavigation /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const names = [...document.querySelectorAll('aside a')].map((a) => a.textContent?.trim())
    const at = (n: string) => names.indexOf(n)
    expect(at('Moje notatki biblijne')).toBe(at('Ulubione') + 1)
    expect(at('Dodaj aplikację do telefonu')).toBe(at('Ustawienia') + 1)
    expect(at('Twoje konto')).toBe(at('Dodaj aplikację do telefonu') + 1)
    expect(names[names.length - 1]).toBe('Kontakt')
  })
})
