import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/edu/index.json'
import item4 from '../../public/content/pl/edu/04.json'
import item1 from '../../public/content/pl/edu/01.json'
import { EduItemPage } from './Edu'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))
vi.mock('../place', () => ({ useSetPlace: () => {} }))
vi.mock('../content', () => ({ loadEdu: async () => index, loadEduItem: async (_l: string, n: number) => (n === 1 ? item1 : item4) }))

describe('Czlowiek Nadziei - nowy uklad tekstow', () => {
  // material 4 otwiera sie 18 pazdziernika - testujemy go jako juz dostepny
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-20T10:00:00')) })
  afterEach(() => vi.useRealTimers())

  it('pokazuje date, pogrubienia, pytanie na koniec i zrodla', async () => {
    render(
      <MemoryRouter initialEntries={['/pl/edukacja/4']}>
        <Routes><Route path="/:lang/edukacja/:nr" element={<EduItemPage />} /></Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('18 października, niedziela')).toBeInTheDocument()
    expect(screen.getByText('Komu jestem winien jedno jasne zdanie?')).toBeInTheDocument()
    expect(screen.getByText('Pytanie i wyzwanie')).toBeInTheDocument()
    expect(screen.getByText('W myślach.')).toBeInTheDocument()
    expect(screen.getByText('Źródła')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('**')
  })

  it('przycisk udostepniania na gorze takze bez nagrania - przekazuje adres materialu', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(
      <MemoryRouter initialEntries={['/pl/edukacja/4']}>
        <Routes><Route path="/:lang/edukacja/:nr" element={<EduItemPage />} /></Routes>
      </MemoryRouter>
    )
    const top = (await screen.findAllByRole('button', { name: /Udostępnij/ }))[0]
    expect(screen.queryByRole('button', { name: 'Odtwórz' })).not.toBeInTheDocument()
    top.click()
    expect(share).toHaveBeenCalledWith({ url: window.location.href })
    Reflect.deleteProperty(navigator, 'share')
  })

  it('przed data pokazuje tylko informacje o dostepnosci, bez tresci', async () => {
    vi.setSystemTime(new Date('2026-10-16T10:00:00'))
    render(
      <MemoryRouter initialEntries={['/pl/edukacja/4']}>
        <Routes><Route path="/:lang/edukacja/:nr" element={<EduItemPage />} /></Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('18 października, niedziela')).toBeInTheDocument()
    expect(screen.getByText(/Ten materiał otworzy się/)).toBeInTheDocument()
    expect(screen.queryByText('Pytanie i wyzwanie')).not.toBeInTheDocument()
    expect(screen.queryByText('Źródła')).not.toBeInTheDocument()
  })

  it('odcinek 1 jest otwarty przed swoja data i ma odtwarzacz na gorze', async () => {
    vi.setSystemTime(new Date('2026-10-09T10:00:00'))
    render(
      <MemoryRouter initialEntries={['/pl/edukacja/1']}>
        <Routes><Route path="/:lang/edukacja/:nr" element={<EduItemPage />} /></Routes>
      </MemoryRouter>
    )
    expect(await screen.findByRole('button', { name: 'Odtwórz' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Udostępnij/ }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Ten materiał otworzy się/)).not.toBeInTheDocument()
    expect(screen.getByText('Pytanie i wyzwanie')).toBeInTheDocument()
  })

  it('daty ida od dnia po 40 dniach modlitwy', () => {
    expect(index.items[0].date).toBe('2026-10-15')
    expect(index.items[9].date).toBe('2026-10-24')
  })
})
