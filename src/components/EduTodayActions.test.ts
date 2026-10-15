import { describe, expect, it } from 'vitest'
import { currentEdu } from './EduTodayActions'

const items = [
  { nr: 1, date: '2026-10-15', open: true, title: 'Jeden', ref: '' },
  { nr: 2, date: '2026-10-16', title: 'Dwa', ref: '' },
  { nr: 3, date: '2026-10-17', title: 'Trzy', ref: '' },
]
const at = (iso: string) => new Date(`${iso}T09:00:00`)

describe('currentEdu - tekst na dziś', () => {
  it('dzisiejszy materiał', () => {
    expect(currentEdu(items, at('2026-10-16'))).toMatchObject({ entry: { nr: 2 }, state: 'today' })
  })
  it('przed startem pierwszy otwarty', () => {
    expect(currentEdu(items, at('2026-10-10'))).toMatchObject({ entry: { nr: 1 }, state: 'before' })
  })
  it('po ostatnim dniu ostatni otwarty, nie zablokowany', () => {
    expect(currentEdu(items, at('2026-11-01'))).toMatchObject({ entry: { nr: 3 }, state: 'last' })
  })
})
