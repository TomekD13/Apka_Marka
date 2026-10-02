// Odhaczenie „przeczytane" - czytanki „40 dni", Czlowiek Nadziei, Grupy Nadziei
// i Lekcje Biblijne. Lista w localStorage; z kontem synchronizuje sie (lib/syncMeta.ts).
// Pozycja: id `rodzaj:numer`, `at` = chwila odhaczenia.

import { readList, writeList } from './localStore'

const KEY = 'zywe-slowo:read:v2'
// pierwsza wersja trzymala obiekt {`rodzaj:numer`: data} - przenosimy go raz do listy
const OLD = 'zywe-slowo:read:v1'

export type ReadKind = 'pray40' | 'edu' | 'group' | 'study'

interface ReadMark {
  id: string
  at: string
}

function read(): ReadMark[] {
  try {
    if (localStorage.getItem(KEY) === null && localStorage.getItem(OLD)) {
      const old = JSON.parse(localStorage.getItem(OLD) || '{}') as Record<string, string>
      const list = Object.entries(old).map(([id, at]) => ({ id, at }))
      writeList(KEY, list)
      return list
    }
  } catch {
    /* uszkodzony stary wpis - zaczynamy od pustej listy */
  }
  return readList<ReadMark>(KEY)
}

const mark = (kind: ReadKind, id: number | string) => `${kind}:${id}`

export function isRead(kind: ReadKind, id: number | string): boolean {
  const k = mark(kind, id)
  return read().some((m) => m.id === k)
}

/** Ustawia stan i zwraca to, co faktycznie zapisano. */
export function setRead(kind: ReadKind, id: number | string, value: boolean): boolean {
  const k = mark(kind, id)
  const rest = read().filter((m) => m.id !== k)
  const next = value ? [{ id: k, at: new Date().toISOString() }, ...rest] : rest
  const ok = writeList(KEY, next)
  // przycisk na gorze i na dole tekstu pokazuja ten sam stan
  if (ok && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(READ_EVENT))
  return ok ? value : !value
}

export const READ_EVENT = 'zywe-slowo:read-changed'

// --- ocena materialu -----------------------------------------------------------
// Gwiazdki 1-5. Trzymamy je tutaj, zeby czytelnik widzial swoja ocene po powrocie;
// zbieranie opinii idzie osobno, przez formularz (patrz components/ReadingFooter.tsx).

const RATE = 'zywe-slowo:rating:v1'

function ratings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATE)
    const data = raw ? JSON.parse(raw) : {}
    return data && typeof data === 'object' ? (data as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function getRating(kind: ReadKind, id: number | string): number {
  return ratings()[mark(kind, id)] || 0
}

/** Zapisuje ocene i zwraca to, co faktycznie zapisano. */
export function setRating(kind: ReadKind, id: number | string, value: number): number {
  const all = ratings()
  all[mark(kind, id)] = value
  try {
    localStorage.setItem(RATE, JSON.stringify(all))
    return value
  } catch {
    return getRating(kind, id)
  }
}

/** Odhaczone pozycje jednego rodzaju - jednym odczytem, dla calej listy. */
export function listRead(kind: ReadKind): Set<string> {
  const prefix = `${kind}:`
  const out = new Set<string>()
  for (const m of read()) if (m.id.startsWith(prefix)) out.add(m.id.slice(prefix.length))
  return out
}
