import { describe, expect, it } from 'vitest'
import { currentExtraId, formatRange, lessonDayUTC } from './sabbathSchool'

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

describe('currentExtraId - podswietlenie biezacej lekcji w materialach dodatkowych', () => {
  const items = [
    { id: 'calosc' },
    { id: '5', start: '2026-10-24', end: '2026-10-30' },
    { id: '6', start: '2026-10-31', end: '2026-11-06' },
  ]
  it('w srodku tygodnia', () => {
    expect(currentExtraId(items, new Date(2026, 10, 3, 12))).toBe('6')
  })
  it('w sobote przed 16:00 zostaje przy konczacej sie lekcji', () => {
    expect(currentExtraId(items, new Date(2026, 9, 31, 10))).toBe('5')
  })
  it('w sobote od 16:00 przechodzi na nowa', () => {
    expect(currentExtraId(items, new Date(2026, 9, 31, 16))).toBe('6')
  })
  it('poza kwartalem nic', () => {
    expect(currentExtraId(items, new Date(2027, 0, 5))).toBeUndefined()
  })
})
