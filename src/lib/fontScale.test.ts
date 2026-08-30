import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }
}

describe('skala tekstu do czytania', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', storage())
    vi.stubGlobal('document', { documentElement: { style: { setProperty: vi.fn() } } })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('ogranicza skalę do bezpiecznego zakresu i wybiera najbliższy krok', async () => {
    const { clampScale, nearestStep, MIN_SCALE, MAX_SCALE } = await import('./fontScale')
    expect(clampScale(0.1)).toBe(MIN_SCALE)
    expect(clampScale(4)).toBe(MAX_SCALE)
    expect(nearestStep(1.22)).toBe(1.15)
    expect(nearestStep(1.66)).toBe(1.75)
  })

  it('zapisuje zmianę i aktualizuje zmienną CSS', async () => {
    const { setScale, getScale } = await import('./fontScale')
    const setProperty = document.documentElement.style.setProperty as ReturnType<typeof vi.fn>
    setScale(1.3)
    expect(getScale()).toBe(1.3)
    expect(localStorage.getItem('zs.fontScale')).toBe('1.3')
    expect(setProperty).toHaveBeenCalledWith('--reading-scale', '1.3')
  })
})
