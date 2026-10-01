import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import index from '../../public/content/pl/bible/UBG/index.json'
import plans from '../../public/content/pl/reading-plans.json'
import { getUserPlan, schedule, setBarPlan, startPlan } from '../lib/readingPlans'
import type { BibleBookMeta, ReadingPlanDef } from '../types'
import { PlanBar } from './PlanBar'

vi.mock('../i18n', () => ({
  useI18n: () => ({ lang: 'pl', t: (_path: string, fallback = '') => fallback }),
}))
vi.mock('../content', () => ({ loadReadingPlans: async () => plans }))
vi.mock('../lib/bible', () => ({ loadBibleIndex: async () => index }))

const books = (index as { books: BibleBookMeta[] }).books
const def = (plans as { plans: ReadingPlanDef[] }).plans.find((p) => p.id === 'ewangelie')!

beforeEach(() => localStorage.clear())

describe('pasek planu czytania', () => {
  it('na rozdziale z planu pokazuje dzien, pozwala odhaczyc i prowadzi dalej', async () => {
    const user = userEvent.setup()
    const p = startPlan('ewangelie', '2026-01-01', 30, [])!
    setBarPlan(p.id)
    const first = schedule(def, books, p)[0].chapters
    render(<MemoryRouter initialEntries={['/pl/biblia/Matt/1']}><PlanBar /></MemoryRouter>)

    expect(await screen.findByText('Cztery Ewangelie')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mt 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Dalej/ })).toHaveAttribute('href', '/pl/biblia/Matt/2')
    expect(first.length).toBeGreaterThan(1)

    await user.click(screen.getByRole('checkbox'))
    expect(getUserPlan(p.id)!.done).toEqual(['Matt.1'])
  })

  it('X zamyka pasek, a poza strona rozdzialu go nie ma', async () => {
    const user = userEvent.setup()
    const p = startPlan('ewangelie', '2026-01-01', 30, [])!
    setBarPlan(p.id)
    const { unmount } = render(<MemoryRouter initialEntries={['/pl/biblia/Matt/1']}><PlanBar /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Zamknij pasek planu' }))
    expect(screen.queryByText('Cztery Ewangelie')).not.toBeInTheDocument()
    unmount()

    setBarPlan(p.id)
    render(<MemoryRouter initialEntries={['/pl/biblia/plany']}><PlanBar /></MemoryRouter>)
    expect(screen.queryByText('Cztery Ewangelie')).not.toBeInTheDocument()
  })
})
