import type { EduBlockDef, EduEntry } from '../types'
import { isOpen } from './availability'

export interface EduBlock {
  from: number
  to: number
  /** brak nazwy = blok za ostatnim z BLOKI (aplikacja podpisze go zakresem numerow) */
  title?: string
  items: EduEntry[]
}

/** Dzieli spis na bloki: najpierw te z index.json, reszte po 7 (tygodniami). Puste bloki odpadaja. */
export function eduBlocks(items: EduEntry[], defs: EduBlockDef[] = [], size = 7): EduBlock[] {
  const sorted = [...defs].sort((a, b) => a.from - b.from)
  const blocks: EduBlock[] = sorted.map((d) => ({ ...d, items: [] }))
  const maxNr = Math.max(0, ...items.map((it) => it.nr))
  let next = sorted.length ? sorted[sorted.length - 1].to + 1 : 1
  while (next <= maxNr) {
    blocks.push({ from: next, to: next + size - 1, items: [] })
    next += size
  }
  for (const it of [...items].sort((a, b) => a.nr - b.nr)) {
    const b = blocks.find((x) => it.nr >= x.from && it.nr <= x.to)
    if (b) b.items.push(it)
  }
  return blocks.filter((b) => b.items.length)
}

/**
 * Bloki rozwiniete na starcie: biezacy (z najnowszym otwartym materialem) i te, w ktorych
 * nic jeszcze nie jest otwarte - zeby jutrzejszy material z klodka byl widac takze wtedy,
 * gdy zaczyna nowy tydzien.
 */
export function openByDefault(blocks: EduBlock[], now = new Date()): Set<number> {
  const open = new Set<number>()
  let current: EduBlock | undefined
  for (const b of blocks) {
    if (b.items.some((it) => isOpen(it, now))) current = b
    else open.add(b.from)
  }
  if (current) open.add(current.from)
  return open
}
