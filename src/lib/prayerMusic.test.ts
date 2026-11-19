import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SLEEP_MINUTES, leftClock, musicSrc, playTrack, setSleep, poolFor, sleepLabel, stepTrack, stop, trackLength } from './prayerMusic'

const t = (_k: string, f: string) => f

describe('Muzyka do modlitwy - kolejnosc utworow', () => {
  const tr = (id: string, nr: number) => ({ id, nr, title: id, icon: 'lyre', file: `${nr}.mp3`, seconds: 300 })
  const all = [tr('a', 1), tr('b', 2), tr('c', 3), tr('d', 4)]

  it('powtarzaj ten utwor - nie ma nastepnego', () => {
    expect(stepTrack(all, 'a', 'one', [])).toBeNull()
  })

  it('wszystkie po kolei, po ostatnim od poczatku, wstecz tez', () => {
    expect(stepTrack(all, 'a', 'all', [])?.id).toBe('b')
    expect(stepTrack(all, 'd', 'all', [])?.id).toBe('a')
    expect(stepTrack(all, 'a', 'all', [], -1)?.id).toBe('d')
  })

  it('playlista: tylko zaznaczone, w kolejnosci dodawania', () => {
    expect(stepTrack(all, 'd', 'list', ['d', 'b'])?.id).toBe('b')
    expect(stepTrack(all, 'b', 'list', ['d', 'b'])?.id).toBe('d')
    // utwor spoza playlisty (wlaczony recznie) - playlista zaczyna sie od pierwszego dodanego
    expect(stepTrack(all, 'c', 'list', ['d', 'b'])?.id).toBe('d')
    expect(stepTrack(all, 'a', 'list', [])).toBeNull()
    // utwor, ktorego juz nie ma w katalogu (np. usuniety), jest pomijany
    expect(poolFor(all, 'list', ['x', 'c', 'a'], []).map((t) => t.id)).toEqual(['c', 'a'])
  })

  it('ulubione po kolei, w kolejnosci z listy utworow', () => {
    expect(poolFor(all, 'fav', [], [4, 2]).map((t) => t.id)).toEqual(['b', 'd'])
    expect(stepTrack(all, 'b', 'fav', [], 1, [4, 2])?.id).toBe('d')
    expect(stepTrack(all, 'd', 'fav', [], 1, [4, 2])?.id).toBe('b')
    expect(stepTrack(all, 'a', 'fav', [], 1, [])).toBeNull()
  })
})

describe('Muzyka do modlitwy - adres pliku', () => {
  it('suma pliku w adresie - po podmianie nagrania telefon pobiera nowe', () => {
    const base = { id: 'krzyz', nr: 26, title: 'Krzyż', icon: 'cross', file: '26_krzyz.mp3', seconds: 569 }
    expect(musicSrc({ ...base, v: 'ab12cd34' })).toMatch(/audio\/muzyka\/26_krzyz\.mp3\?v=ab12cd34$/)
    expect(musicSrc(base)).toMatch(/audio\/muzyka\/26_krzyz\.mp3$/)
  })
})

describe('Muzyka do modlitwy - wylacznik', () => {
  // jsdom nie ma load() - stop() go wola
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  })
  afterEach(() => {
    stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('co kwadrans do godziny, potem co godzine do 8 godzin', () => {
    expect(SLEEP_MINUTES).toEqual([15, 30, 45, 60, 120, 180, 240, 300, 360, 420, 480])
  })

  it('polskie odmiany godzin', () => {
    expect(SLEEP_MINUTES.map((m) => sleepLabel(m, t))).toEqual([
      '15 min', '30 min', '45 min', '1 godzina', '2 godziny', '3 godziny', '4 godziny', '5 godzin', '6 godzin', '7 godzin', '8 godzin',
    ])
  })

  it('zegary', () => {
    expect(trackLength(313.6)).toBe('5:14')
    expect(leftClock(15 * 60_000)).toBe('15:00')
    expect(leftClock(3 * 3600_000 - 1500)).toBe('2:59:59')
  })

  it('po czasie wycisza i zatrzymuje muzyke', () => {
    vi.useFakeTimers()
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { value: false, configurable: true })
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { value: true, configurable: true })
    })
    playTrack({ id: 'psalm', nr: 1, title: 'Psalm', icon: 'lyre', file: '01_psalm.mp3', seconds: 313.6 }, 'Muzyka do modlitwy')
    expect(play).toHaveBeenCalled()
    setSleep(15)
    vi.advanceTimersByTime(14 * 60_000)
    expect(pause).not.toHaveBeenCalled()
    vi.advanceTimersByTime(61_000)
    expect(pause).toHaveBeenCalled()
  })
})
