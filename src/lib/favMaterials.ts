import { readList, writeList } from './localStore'
import type { ReadKind } from './progress'

// Ulubione materialy (czytanki, Czlowiek Nadziei, Grupy Nadziei, Lekcje Biblijne).
// Ulubione piesni maja osobne listy (lib/favorites.ts), zakladki w Biblii tez.
// Z kontem synchronizuje sie (lib/syncMeta.ts).

const KEY = 'zywe-slowo:fav-materials:v1'

export interface FavMaterial {
  /** `rodzaj:numer` */
  id: string
  kind: ReadKind
  title: string
  /** sciezka w aplikacji bez jezyka, np. `40-dni/3` */
  path: string
  addedAt: string
}

const key = (kind: ReadKind, id: number | string) => `${kind}:${id}`

export const listFavMaterials = () =>
  readList<FavMaterial>(KEY).sort((a, b) => b.addedAt.localeCompare(a.addedAt))

export const isFavMaterial = (kind: ReadKind, id: number | string) =>
  readList<FavMaterial>(KEY).some((f) => f.id === key(kind, id))

/** Przelacza ulubiony i zwraca stan po zmianie (bez zmiany, gdy zapis niemozliwy). */
export function toggleFavMaterial(kind: ReadKind, id: number | string, title: string, path: string): boolean {
  const k = key(kind, id)
  const items = readList<FavMaterial>(KEY)
  const was = items.some((f) => f.id === k)
  const next = was ? items.filter((f) => f.id !== k) : [{ id: k, kind, title, path, addedAt: new Date().toISOString() }, ...items]
  return writeList(KEY, next) ? !was : was
}
