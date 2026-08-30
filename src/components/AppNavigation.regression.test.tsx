import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppNavigation } from './AppNavigation'

vi.mock('../i18n', () => ({
  useI18n: () => ({ lang: 'pl', t: (_path: string, fallback = '') => fallback }),
}))

describe('nawigacja aplikacji — regresja', () => {
  it('otwiera menu boczne i rozwija niezależnie sekcję Pieśni', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/pl/piesni']}><AppNavigation /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Pieśni' }))

    expect(screen.getByRole('link', { name: 'Śpiewnik' })).toHaveAttribute('href', '/pl/spiewnik')
    expect(screen.getByRole('link', { name: 'Pieśni młodzieżowe' })).toHaveAttribute('href', '/pl/piesni-mlodziezowe')
  })

  it('utrzymuje cztery główne punkty w dolnym menu', () => {
    render(<MemoryRouter initialEntries={['/pl']}><AppNavigation /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Biblia' })).toHaveAttribute('href', '/pl/biblia')
    expect(screen.getByRole('link', { name: 'Pieśni' })).toHaveAttribute('href', '/pl/piesni')
    expect(screen.getByRole('link', { name: 'Modlitwa' })).toHaveAttribute('href', '/pl/modlitwa')
    expect(screen.getByRole('link', { name: '#JestNadzieja' })).toHaveAttribute('href', '/pl/jest-nadzieja')
  })
})
