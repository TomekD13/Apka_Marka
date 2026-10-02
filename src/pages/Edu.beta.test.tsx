import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/edu/index.json'
import item4 from '../../public/content/pl/edu/04.json'
import { EduItemPage } from './Edu'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))
vi.mock('../place', () => ({ useSetPlace: () => {} }))
vi.mock('../content', () => ({ loadEdu: async () => index, loadEduItem: async () => item4 }))

describe('Czlowiek Nadziei - nowy uklad tekstow', () => {
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

  it('daty ida od dnia po 40 dniach modlitwy', () => {
    expect(index.items[0].date).toBe('2026-10-15')
    expect(index.items[9].date).toBe('2026-10-24')
  })
})
