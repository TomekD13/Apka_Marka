import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPray40 } from '../content'
import { Home } from './Home'

vi.mock('../content', () => ({ loadPray40: vi.fn() }))
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
  days: [
    { day: 1, date: '2099-09-05', dateLabel: '5 września', title: 'Pierwszy materiał', ref: 'Rdz 1', lead: '...' },
    { day: 2, date: '2099-09-06', dateLabel: '6 września', title: 'Drugi materiał', ref: 'Rdz 2', lead: '...' },
  ],
}

describe('strona główna — regresja bieżącego materiału', () => {
  beforeEach(() => vi.mocked(loadPray40).mockResolvedValue(index))

  it('używa tego samego kalendarza i dwóch wejść co #JestNadzieja', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Otwórz pierwszy materiał' })).toHaveAttribute('href', '/pl/40-dni/1')
    expect(screen.getByRole('link', { name: 'Pełna lista 40 dni' })).toHaveAttribute('href', '/pl/40-dni')
  })
})
