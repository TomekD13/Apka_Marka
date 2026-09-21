import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPrayerTexts } from './content'

afterEach(() => vi.unstubAllGlobals())

/** Odpowiedz fetcha z gotowa trescia JSON. */
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('wczytywanie treści', () => {
  it('po nieudanej próbie ponawia pobranie z pominięciem zapasu przeglądarki', async () => {
    const tresc = { lang: 'pl', translation: 'BE', groups: [] }
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('service worker nie oddał pliku'))
      .mockResolvedValueOnce(ok(tresc))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPrayerTexts('pl')).resolves.toEqual(tresc)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, opts] = fetchMock.mock.calls[1]
    expect(String(url)).toMatch(/prayer-texts\.json\?v=\d+/)
    expect(opts).toMatchObject({ cache: 'reload' })
  })

  it('przekazuje błąd dalej, gdy i druga próba zawiedzie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response)
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPrayerTexts('pl-brak')).rejects.toThrow(/404/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
