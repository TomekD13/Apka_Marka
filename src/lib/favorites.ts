import { readList, writeList } from './localStore'

// Ulubione piesni - jak notatki, zostaja w tej przegladarce. Osobna lista na kazdy
// spiewnik, bo numery w obu kolekcjach zaczynaja sie od 1 i inaczej by sie zderzyly.
const KEY = (collection: string) => `zywe-slowo:fav:${collection}:v1`

export function listFavorites(collection: string): number[] {
  return readList<number>(KEY(collection)).filter((n) => typeof n === 'number')
}

export function isFavorite(collection: string, nr: number): boolean {
  return listFavorites(collection).includes(nr)
}

/** Przelacza ulubiona i zwraca stan po zmianie (bez zmiany, gdy zapis niemozliwy). */
export function toggleFavorite(collection: string, nr: number): boolean {
  const current = listFavorites(collection)
  const next = current.includes(nr) ? current.filter((n) => n !== nr) : [nr, ...current]
  return writeList(KEY(collection), next) ? next.includes(nr) : current.includes(nr)
}
