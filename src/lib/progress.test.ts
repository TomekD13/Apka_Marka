import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRating, isRead, listRead, setRating, setRead } from './progress'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  }
}

describe('lokalny postęp czytania', () => {
  beforeEach(() => vi.stubGlobal('localStorage', storage()))

  it('zapamiętuje pozycje osobno dla różnych rodzajów materiałów', () => {
    expect(setRead('pray40', 3, true)).toBe(true)
    expect(setRead('edu', 3, true)).toBe(true)
    expect(isRead('pray40', 3)).toBe(true)
    expect([...listRead('pray40')]).toEqual(['3'])
    expect([...listRead('edu')]).toEqual(['3'])

    expect(setRead('pray40', 3, false)).toBe(false)
    expect(isRead('pray40', 3)).toBe(false)
    expect(isRead('edu', 3)).toBe(true)
  })

  it('zwraca bezpieczną wartość przy uszkodzonych danych przeglądarki', () => {
    localStorage.setItem('zywe-slowo:read:v1', '{nie jest jsonem')
    expect(isRead('pray40', 1)).toBe(false)
    expect([...listRead('pray40')]).toEqual([])
  })

  it('zapamiętuje ocenę materiału', () => {
    expect(getRating('edu', 4)).toBe(0)
    expect(setRating('edu', 4, 5)).toBe(5)
    expect(getRating('edu', 4)).toBe(5)
  })
})
