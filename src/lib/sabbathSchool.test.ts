import { describe, expect, it } from 'vitest'
import { lessonDayUTC } from './sabbathSchool'

describe('data lekcji Szkoły Sobotniej', () => {
  it('w sobotę przed 16:00 pozostaje przy kończącej się lekcji', () => {
    expect(lessonDayUTC(new Date(2026, 8, 5, 15, 59))).toBe(Date.UTC(2026, 8, 4))
  })

  it('od soboty od 16:00 przechodzi na nową lekcję', () => {
    expect(lessonDayUTC(new Date(2026, 8, 5, 16, 0))).toBe(Date.UTC(2026, 8, 5))
  })
})
