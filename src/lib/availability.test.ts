import { describe, expect, it } from 'vitest'
import { isAvailable, todayIso } from './availability'

describe('dostepnosc materialow od daty', () => {
  const at = (s: string) => new Date(s)
  it('bez daty zawsze dostepny', () => expect(isAvailable(undefined)).toBe(true))
  it('dzien przed data - zamkniety, w dniu daty i pozniej - otwarty', () => {
    expect(isAvailable('2026-10-15', at('2026-10-14T23:59:00'))).toBe(false)
    expect(isAvailable('2026-10-15', at('2026-10-15T00:00:30'))).toBe(true)
    expect(isAvailable('2026-10-15', at('2026-11-01T12:00:00'))).toBe(true)
  })
  it('data w czasie lokalnym', () => expect(todayIso(at('2026-01-05T08:00:00'))).toBe('2026-01-05'))
})
