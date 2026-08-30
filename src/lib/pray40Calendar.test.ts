import { describe, expect, it } from 'vitest'
import { currentCampaignDay, localIsoDate } from './pray40Calendar'
import type { Pray40DayEntry } from '../types'

const days: Pray40DayEntry[] = [
  { day: 1, date: '2026-09-05', dateLabel: '5 września', title: 'Pierwszy', ref: 'Rdz 1', lead: '...' },
  { day: 2, date: '2026-09-06', dateLabel: '6 września', title: 'Drugi', ref: 'Rdz 2', lead: '...' },
  { day: 3, date: '2026-09-07', dateLabel: '7 września', title: 'Trzeci', ref: 'Rdz 3', lead: '...' },
]

describe('kalendarz 40 dni modlitwy', () => {
  it('formatuje lokalną datę bez przesunięcia strefy czasowej', () => {
    expect(localIsoDate(new Date(2026, 8, 5, 0, 5))).toBe('2026-09-05')
  })

  it('wskazuje materiał zaplanowany dokładnie na dzisiaj', () => {
    expect(currentCampaignDay(days, new Date(2026, 8, 6))).toMatchObject({ state: 'during', entry: { day: 2 } })
  })

  it('przed akcją prowadzi do pierwszego dnia, a po niej do ostatniego', () => {
    expect(currentCampaignDay(days, new Date(2026, 8, 1))).toMatchObject({ state: 'before', entry: { day: 1 } })
    expect(currentCampaignDay(days, new Date(2026, 8, 20))).toMatchObject({ state: 'after', entry: { day: 3 } })
  })

  it('nie wybiera materiału, jeśli kalendarz nie zawiera dat', () => {
    expect(currentCampaignDay([{ ...days[0], date: undefined }], new Date(2026, 8, 5))).toBeNull()
  })
})
