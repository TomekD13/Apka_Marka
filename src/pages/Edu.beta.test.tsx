import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/edu/index.json'
import item4 from '../../public/content/pl/edu/04.json'
import { EduItemPage } from './Edu'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))
vi.mock('../place', () => ({ useSetPlace: () => {} }))
vi.mock('../content', () => ({ loadEdu: async () => index, loadEduItem: async () => item4 }))

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

  it('daty ida od dnia po 40 dniach modlitwy', () => {
    expect(index.items[0].date).toBe('2026-10-15')
    expect(index.items[9].date).toBe('2026-10-24')
  })
})
