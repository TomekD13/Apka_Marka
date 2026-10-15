import { describe, expect, it } from 'vitest'
import { formatRange, lessonDayUTC } from './sabbathSchool'

describe('data lekcji Szkoły Sobotniej', () => {
  it('w sobotę przed 16:00 pozostaje przy kończącej się lekcji', () => {
    expect(lessonDayUTC(new Date(2026, 8, 5, 15, 59))).toBe(Date.UTC(2026, 8, 4))
  })

  it('od soboty od 16:00 przechodzi na nową lekcję', () => {
    expect(lessonDayUTC(new Date(2026, 8, 5, 16, 0))).toBe(Date.UTC(2026, 8, 5))
  })
})

describe('formatRange - zakres dat tygodnia lekcji', () => {
  it('ten sam miesiac', () => {
    expect(formatRange('10/10/2026', '16/10/2026')).toBe('10–16 października')
  })
  it('przelom miesiecy', () => {
    expect(formatRange('26/09/2026', '02/10/2026')).toBe('26 września – 2 października')
  })
})
