import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPray40 } from '../content'
import { Hope } from './Hope'

vi.mock('../content', () => ({ loadPray40: vi.fn() }))
vi.mock('../i18n', () => ({
  useI18n: () => ({ lang: 'pl', t: (_path: string, fallback = '') => fallback }),
}))

const index = {
  lang: 'pl',
  days: [
    { day: 1, date: '2099-09-05', dateLabel: '5 września', title: 'Pierwszy materiał', ref: 'Rdz 1', lead: '...' },
    { day: 2, date: '2099-09-06', dateLabel: '6 września', title: 'Ten tytuł ma pozostać na liście', ref: 'Rdz 2', lead: '...' },
  ],
}

describe('#JestNadzieja — regresja strony wyboru', () => {
  beforeEach(() => vi.mocked(loadPray40).mockResolvedValue(index))

  it('pokazuje dwa wejścia do 40 dni i nie rozwija listy na stronie wyboru', async () => {
    render(<MemoryRouter><Hope /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Otwórz pierwszy materiał' })).toHaveAttribute('href', '/pl/40-dni/1')
    expect(screen.getByRole('link', { name: 'Pełna lista 40 dni' })).toHaveAttribute('href', '/pl/40-dni')
    expect(screen.queryByText('Ten tytuł ma pozostać na liście')).not.toBeInTheDocument()
  })

  it('prowadzi do listy materiałów edukacyjnych, nie do konkretnego materiału', async () => {
    render(<MemoryRouter><Hope /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('link', { name: /Materiały edukacyjne/ })).toHaveAttribute('href', '/pl/edukacja'))
  })

  it('zachowuje widoczną drogę powrotu do menu głównego', async () => {
    render(<MemoryRouter><Hope /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: /Menu główne/ })).toHaveAttribute('href', '/pl')
  })
})
