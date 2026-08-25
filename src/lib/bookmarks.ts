import type { BibleBookmark } from '../types'
import { exportJson, newId, parseBackup, readList, writeList } from './localStore'

// Zakladki w Biblii - jak notatki i ulubione piesni: zostaja w tej przegladarce,
// bez konta i bez wysylania czegokolwiek na serwer (lib/localStore.ts).
const KEY = 'zywe-slowo:bible-bookmarks:v1'

const read = () => readList<BibleBookmark>(KEY)
const write = (items: BibleBookmark[]) => writeList(KEY, items)

const sameVerse = (b: BibleBookmark, osis: string, chapter: number, verse: number) =>
  b.osis === osis && b.chapter === chapter && b.verse === verse

/** Zakladki od najswiezszej. */
export function listBookmarks(): BibleBookmark[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function isBookmarked(osis: string, chapter: number, verse: number): boolean {
  return read().some((b) => sameVerse(b, osis, chapter, verse))
}

/** Zaznaczone wersety rozdzialu - jednym odczytem, zeby nie pytac o kazdy osobno. */
export function bookmarkedVerses(osis: string, chapter: number): Set<number> {
  const out = new Set<number>()
  for (const b of read()) if (b.osis === osis && b.chapter === chapter) out.add(b.verse)
  return out
}

/** Przelacza zakladke i zwraca stan po zmianie (bez zmiany, gdy zapis niemozliwy). */
export function toggleBookmark(input: Omit<BibleBookmark, 'id' | 'createdAt'>): boolean {
  const items = read()
  const i = items.findIndex((b) => sameVerse(b, input.osis, input.chapter, input.verse))
  if (i >= 0) {
    const next = items.filter((_, j) => j !== i)
    return write(next) ? false : true
  }
  const next = [{ ...input, id: newId(), createdAt: new Date().toISOString() }, ...items]
  return write(next) ? true : false
}

/** Zakladki dla kilku wersetow naraz - wspolna nazwa opisuje caly wybor. */
export function addBookmarks(list: Omit<BibleBookmark, 'id' | 'createdAt'>[]): boolean {
  const items = read()
  const now = new Date().toISOString()
  for (const input of list) {
    if (items.some((b) => sameVerse(b, input.osis, input.chapter, input.verse))) continue
    items.unshift({ ...input, id: newId(), createdAt: now })
  }
  return write(items)
}

/** Zdejmuje zakladki ze wskazanych wersetow jednego rozdzialu. */
export function removeBookmarksAt(osis: string, chapter: number, verses: number[]): boolean {
  const set = new Set(verses)
  return write(read().filter((b) => !(b.osis === osis && b.chapter === chapter && set.has(b.verse))))
}

/** Nazwa zakladki - pusta wraca do samego odnosnika. */
export function renameBookmark(id: string, name: string): boolean {
  const clean = name.trim()
  return write(read().map((b) => (b.id === id ? { ...b, name: clean || undefined } : b)))
}

export function removeBookmark(id: string): boolean {
  return write(read().filter((b) => b.id !== id))
}

export const exportBookmarks = () => exportJson('bookmarks', listBookmarks())

/** Wczytanie kopii zapasowej - dopisuje to, czego jeszcze nie ma. */
export function importBookmarks(json: string): number {
  const list = parseBackup(json, 'bookmarks') as BibleBookmark[]
  const items = read()
  let added = 0
  for (const b of list) {
    if (!b?.osis || !b.chapter || !b.verse) continue
    if (items.some((x) => sameVerse(x, b.osis, b.chapter, b.verse))) continue
    items.push({ ...b, id: b.id || newId(), createdAt: b.createdAt || new Date().toISOString() })
    added += 1
  }
  if (added) write(items)
  return added
}

// --- ostatnio czytane --------------------------------------------------------
// Jedno miejsce, do ktorego wraca sie jednym kliknieciem („Czytaj dalej").

const LAST = 'zywe-slowo:bible-last:v1'
export interface LastRead { translation: string; osis: string; chapter: number; ref: string }

export function saveLastRead(x: LastRead): void {
  try {
    localStorage.setItem(LAST, JSON.stringify(x))
  } catch {
    /* prywatne okno - trudno */
  }
}

export function getLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(LAST)
    if (!raw) return null
    const x = JSON.parse(raw)
    return x?.osis && x?.chapter ? (x as LastRead) : null
  } catch {
    return null
  }
}
