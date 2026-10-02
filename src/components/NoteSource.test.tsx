import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/bible/UBG/index.json'
import { HighlightOnArrival, NoteSource } from './NoteSource'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))
vi.mock('../lib/bible', async (orig) => ({ ...(await orig<typeof import('../lib/bible')>()), loadBibleIndex: async () => index }))

describe('zrodlo notatki', () => {
  it('material: klikalne zrodlo prowadzi na strone materialu', () => {
    render(<MemoryRouter><NoteSource source={{ label: 'Dzień 3: Troska', path: '/pl/40-dni/3', quote: 'Bóg' }} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Dzień 3: Troska/ })).toHaveAttribute('href', '/pl/40-dni/3')
  })

  it('stara notatka z samym odnosnikiem prowadzi do rozdzialu Biblii', async () => {
    render(<MemoryRouter><NoteSource refText="J 3,16" /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /J 3,16/ })).toHaveAttribute('href', '/pl/biblia/John/3')
  })

  it('bez zrodla: notatka wlasna, bez linku', () => {
    render(<MemoryRouter><NoteSource /></MemoryRouter>)
    expect(screen.getByText('notatka własna')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('po wejsciu ze zrodla podswietla akapit z cytatem', () => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/pl/40-dni/3', state: { highlight: 'Bóg troszczy się o ciebie' } }]}>
        <main><p>Inny akapit.</p><p data-testid="cel">Bóg troszczy się o ciebie każdego dnia.</p></main>
        <HighlightOnArrival />
      </MemoryRouter>
    )
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByTestId('cel')).toHaveClass('note-flash')
    vi.useRealTimers()
  })
})
