import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBible, loadPrayerTexts } from '../content'
import { PrayerTexts } from './PrayerTexts'

vi.mock('../content', () => ({ loadPrayerTexts: vi.fn(), loadBible: vi.fn() }))
vi.mock('../i18n', () => ({
  useI18n: () => ({ lang: 'pl', t: (_path: string, fallback = '') => fallback }),
}))

const data = {
  lang: 'pl',
  translation: 'BE',
  title: 'Teksty do modlitwy',
  groups: [
    { id: 'uwielbienie', name: 'Uwielbienie', verses: [{ osis: 'Ps.150.1', ref: 'Psalm 150,1' }] },
    { id: 'skrucha', name: 'Skrucha', verses: [{ osis: 'Ps.51.3', ref: 'Psalm 51,3' }] },
    { id: 'prosby', name: 'Prośby', verses: [{ osis: 'Matt.7.7', ref: 'Ewangelia Mateusza 7,7' }] },
    {
      id: 'wdziecznosc',
      name: 'Wdzięczność',
      verses: [
        { osis: 'Ps.100.4', ref: 'Psalm 100,4' },
        { osis: 'Ps.118.1', ref: 'Psalm 118,1' },
      ],
    },
  ],
}

const bible = {
  translation: 'BE',
  name: 'Biblia Ekumeniczna (2018)',
  lang: 'pl',
  verses: {
    'Ps.150.1': 'Psalm. Chwalcie Boga w Jego świątyni',
    'Ps.51.3': 'Boże, zmiłuj się nade mną',
    'Matt.7.7': 'Proście a otrzymacie',
    'Ps.100.4': 'Z dziękczynieniem wchodźcie w Jego bramy',
    'Ps.118.1': 'Wysławiajcie PANA, bo jest dobry',
  },
}

describe('Teksty do modlitwy — regresja', () => {
  beforeEach(() => {
    vi.mocked(loadPrayerTexts).mockResolvedValue(data as never)
    vi.mocked(loadBible).mockResolvedValue(bible as never)
  })

  it('losowo pokazuje po jednym tekście z każdego z czterech działów', async () => {
    render(<MemoryRouter><PrayerTexts /></MemoryRouter>)

    for (const name of ['Uwielbienie', 'Skrucha', 'Prośby', 'Wdzięczność']) {
      expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByText(/Psalm|Ewangelia/)).toHaveLength(4)
  })

  it('zdejmuje psalmowy nagłówek z tekstu czytanego w modlitwie', async () => {
    render(<MemoryRouter><PrayerTexts /></MemoryRouter>)

    expect(await screen.findByText('Chwalcie Boga w Jego świątyni')).toBeInTheDocument()
  })

  it('ponowne wciśnięcie „Losowo" daje kolejny zestaw', async () => {
    render(<MemoryRouter><PrayerTexts /></MemoryRouter>)

    const pierwszy = (await screen.findByRole('heading', { name: 'Wdzięczność' }))
      .closest('section')!.querySelector('.text-brand')!.textContent
    await userEvent.click(screen.getByRole('button', { name: 'Losowo' }))

    await waitFor(() => {
      const teraz = screen.getByRole('heading', { name: 'Wdzięczność' })
        .closest('section')!.querySelector('.text-brand')!.textContent
      expect(teraz).not.toBe(pierwszy)
    })
  })

  it('w trybie listy pokazuje wszystkie teksty wybranego działu', async () => {
    render(<MemoryRouter><PrayerTexts /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: 'Wybierz z listy' }))
    await userEvent.click(screen.getByRole('button', { name: /Wdzięczność/ }))

    await waitFor(() => expect(screen.getByText('Psalm 100,4')).toBeInTheDocument())
    expect(screen.getByText('Psalm 118,1')).toBeInTheDocument()
  })

  it('wraca do sekcji Modlitwa', async () => {
    render(<MemoryRouter><PrayerTexts /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: /Modlitwa/ })).toHaveAttribute('href', '/pl/modlitwa')
  })
})
