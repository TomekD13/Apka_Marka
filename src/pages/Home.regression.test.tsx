import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadEdu } from '../content'
import { Home } from './Home'

vi.mock('../content', () => ({ loadEdu: vi.fn() }))
vi.mock('../i18n', () => ({
  useI18n: () => ({ lang: 'pl', t: (_path: string, fallback = '') => fallback }),
}))
vi.mock('../lib/sabbathSchool', () => ({
  fallbackUrl: () => 'https://example.com',
  findCurrentLesson: vi.fn().mockResolvedValue(null),
}))
vi.mock('../components/AppNavigation', () => ({ AppIcon: () => <span /> }))
vi.mock('../components/DailyOccasionVerse', () => ({ DailyOccasionVerse: () => <div /> }))
vi.mock('../components/PageHeading', () => ({ PageHeading: () => <div /> }))

const index = {
  lang: 'pl',
  items: [
    { nr: 1, date: '2099-09-05', dateLabel: '5 września', open: true, title: 'Pierwszy materiał', ref: '', audio: true },
    { nr: 2, date: '2099-09-06', dateLabel: '6 września', title: 'Drugi materiał', ref: '' },
  ],
}

describe('strona główna — tekst na dziś z Człowieka Nadziei', () => {
  beforeEach(() => vi.mocked(loadEdu).mockResolvedValue(index))

  it('przed startem cyklu prowadzi do pierwszego (otwartego) materiału i do spisu', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Otwórz materiał' })).toHaveAttribute('href', '/pl/edukacja/1')
    expect(screen.getByRole('link', { name: 'Wszystkie materiały' })).toHaveAttribute('href', '/pl/edukacja')
    expect(screen.getByText('Pierwszy materiał')).toBeInTheDocument()
  })
})
