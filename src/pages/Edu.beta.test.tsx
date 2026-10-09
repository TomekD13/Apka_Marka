import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/edu/index.json'
import item4 from '../../public/content/pl/edu/04.json'
import item1 from '../../public/content/pl/edu/01.json'
import { EduItemPage, EduList } from './Edu'

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

  it('bez nagrania jest tylko udostepnianie tekstu', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(
      <MemoryRouter initialEntries={['/pl/edukacja/4']}>
        <Routes><Route path="/:lang/edukacja/:nr" element={<EduItemPage />} /></Routes>
      </MemoryRouter>
    )
    const top = await screen.findByRole('button', { name: 'Udostępnij tekst' })
    expect(screen.queryByRole('button', { name: 'Udostępnij nagranie' })).not.toBeInTheDocument()
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
    // dwa przyciski: tekst (obok „Przeczytane”) i nagranie (w odtwarzaczu)
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    screen.getByRole('button', { name: 'Udostępnij tekst' }).click()
    expect(share).toHaveBeenLastCalledWith({ url: window.location.href })
    screen.getByRole('button', { name: 'Udostępnij nagranie' }).click()
    expect(share).toHaveBeenLastCalledWith({
      text: 'Posłuchaj: Poznając projekt, poznasz Projektanta',
      url: `${window.location.origin}/pl/edukacja/1?sluchaj`,
    })
    Reflect.deleteProperty(navigator, 'share')
    expect(screen.queryByText(/Ten materiał otworzy się/)).not.toBeInTheDocument()
    expect(screen.getByText('Pytanie i wyzwanie')).toBeInTheDocument()
  })

  it('spis przed startem: odcinek 1 do czytania, reszta widoczna z data i klodka', async () => {
    vi.setSystemTime(new Date('2026-10-09T10:00:00'))
    render(<MemoryRouter><EduList /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /Poznając projekt, poznasz Projektanta/ })).toHaveAttribute('href', '/pl/edukacja/1')
    expect(screen.getByText('Geniusz bez pamięci. Dlaczego ośmiornice nie władają ziemią?')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Geniusz bez pamięci/ })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Dostępny od/)).toHaveLength(9)
  })

  it('daty ida od dnia po 40 dniach modlitwy', () => {
    expect(index.items[0].date).toBe('2026-10-15')
    expect(index.items[9].date).toBe('2026-10-24')
  })
})
