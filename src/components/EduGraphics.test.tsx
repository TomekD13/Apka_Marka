import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EduGraphics } from './EduGraphics'
import type { EduGraphic } from '../types'

vi.mock('../i18n', () => ({ useI18n: () => ({ lang: 'pl', t: (_p: string, f = '') => f }) }))

const items: EduGraphic[] = [
  { src: 'media/edu/002a.jpg?v=1', thumb: 'media/edu/002a_m.webp?v=1', view: 'media/edu/002a_d.webp?v=1', width: 1122, height: 1402, text: 'Pierwsza myśl.' },
  { src: 'media/edu/002b.jpg?v=2', thumb: 'media/edu/002b_m.webp?v=2', view: 'media/edu/002b_d.webp?v=2', width: 1122, height: 1402, text: 'Druga myśl.' },
]

describe('grafiki pod lekcja: miniatury, podglad, pelna tylko do udostepnienia', () => {
  afterEach(() => vi.restoreAllMocks())

  it('pod tekstem sa same miniatury i nic wiecej sie nie pobiera', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<EduGraphics items={items} nr={2} pageUrl="https://x/pl/edukacja/2" />)
    const srcs = [...document.querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(srcs.every((s) => s?.includes('_m.webp'))).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('dotkniecie miniatury otwiera podglad i dopiero wtedy pobiera pelna grafike tej jednej', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['x'], { type: 'image/jpeg' })))
    render(<EduGraphics items={items} nr={2} pageUrl="https://x/pl/edukacja/2" />)
    await user.click(screen.getByRole('button', { name: 'Powiększ grafikę 2' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('img')?.getAttribute('src')).toContain('002b_d.webp')
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(String(fetchSpy.mock.calls[0][0])).toContain('002b.jpg')
    await waitFor(() => expect(screen.getByRole('button', { name: /Udostępnij/ })).not.toBeDisabled())
    await user.click(screen.getByRole('button', { name: 'Następna grafika' }))
    expect(screen.getByRole('dialog').querySelector('img')?.getAttribute('src')).toContain('002a_d.webp')
    await user.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
