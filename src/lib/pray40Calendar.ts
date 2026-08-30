import type { Pray40DayEntry } from '../types'

export type CampaignState = 'before' | 'during' | 'after'

export function localIsoDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Zwraca materiał akcji przypisany do lokalnej daty użytkownika.
 * Przed rozpoczęciem akcji wskazuje pierwszy dzień, a po jej końcu — ostatni.
 */
export function currentCampaignDay(days: Pray40DayEntry[], now = new Date()) {
  const dated = days.filter((entry) => entry.date).sort((a, b) => a.date!.localeCompare(b.date!))
  if (!dated.length) return null

  const today = localIsoDate(now)
  if (today < dated[0].date!) return { entry: dated[0], state: 'before' as CampaignState }
  if (today > dated[dated.length - 1].date!) return { entry: dated[dated.length - 1], state: 'after' as CampaignState }
  return { entry: dated.find((entry) => entry.date === today) ?? dated[0], state: 'during' as CampaignState }
}
