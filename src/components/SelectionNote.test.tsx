import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SelectionNote } from './SelectionNote'
import { listNotes } from '../lib/notes'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))
vi.mock('../place', () => ({ usePlace: () => 'Dzień 3' }))

describe('notatka z zaznaczenia', () => {
  it('po zaznaczeniu tekstu w tresci pokazuje przycisk i zapisuje cytat do notatek', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter initialEntries={['/pl/40-dni/3']}>
        <main><p data-testid="p">Bóg troszczy się o ciebie każdego dnia.</p></main>
        <SelectionNote />
      </MemoryRouter>
    )
    const p = screen.getByTestId('p')
    const range = document.createRange()
    range.selectNodeContents(p)
    act(() => {
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      document.dispatchEvent(new Event('selectionchange'))
      vi.advanceTimersByTime(300)
    })
    await user.click(await screen.findByRole('button', { name: /Dodaj do Moje notatki/ }))
    const area = screen.getByRole('textbox')
    expect((area as HTMLTextAreaElement).value).toContain('„Bóg troszczy się o ciebie każdego dnia.”')
    await user.type(area, 'moja myśl')
    await user.click(screen.getByRole('button', { name: /Zapisz/ }))
    expect(listNotes()[0].body).toContain('moja myśl')
    expect(listNotes()[0].source?.label).toBe('Dzień 3')
    vi.useRealTimers()
  })
})
