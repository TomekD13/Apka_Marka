import type { Prayer } from '../types'
import { exportJson, newId, parseBackup, readList, writeList } from './localStore'

// Dziennik modlitw zyje wylacznie w tej przegladarce - patrz lib/localStore.ts.
const KEY = 'zywe-slowo:prayers:v1'

const read = () => readList<Prayer>(KEY)
const write = (items: Prayer[]) => writeList(KEY, items)

/** Nieodpowiedziane najpierw, w kazdej grupie od najnowszych. */
export function listPrayers(): Prayer[] {
  return read().sort((a, b) => {
    if (a.answered !== b.answered) return a.answered ? 1 : -1
    const A = a.answered ? a.answeredAt || a.createdAt : a.createdAt
    const B = b.answered ? b.answeredAt || b.createdAt : b.createdAt
    return B.localeCompare(A)
  })
}

/** Dopisuje kolejny wiersz dziennika; null = zapis niemozliwy. */
export function addPrayer(text: string): Prayer | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const prayer: Prayer = {
    id: newId(),
    text: trimmed,
    answered: false,
    createdAt: new Date().toISOString(),
  }
  return write([prayer, ...read()]) ? prayer : null
}

export function updatePrayer(id: string, patch: Partial<Omit<Prayer, 'id' | 'createdAt'>>): boolean {
  const items = read()
  const i = items.findIndex((p) => p.id === id)
  if (i < 0) return false
  const next = { ...items[i], ...patch }
  // data wysluchania idzie za znacznikiem: zaznaczenie ja stawia, odznaczenie kasuje
  if (patch.answered === true && !items[i].answered) next.answeredAt = new Date().toISOString()
  if (patch.answered === false) delete next.answeredAt
  items[i] = next
  return write(items)
}

export function deletePrayer(id: string): void {
  write(read().filter((p) => p.id !== id))
}

export const exportPrayers = () => exportJson('prayers', listPrayers())

/** Dokłada modlitwy z kopii; te same id nadpisują istniejące. Zwraca liczbę wczytanych. */
export function importPrayers(json: string): number {
  const incoming = parseBackup(json, 'prayers') as Partial<Prayer>[]
  const byId = new Map(read().map((p) => [p.id, p]))
  let n = 0
  for (const raw of incoming) {
    if (!raw || typeof raw.text !== 'string') continue
    const id = raw.id || newId()
    byId.set(id, {
      id,
      text: raw.text,
      answered: !!raw.answered,
      answer: raw.answer,
      createdAt: raw.createdAt || new Date().toISOString(),
      answeredAt: raw.answeredAt,
    })
    n++
  }
  write([...byId.values()])
  return n
}
