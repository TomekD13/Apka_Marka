import { loadBibleBook, loadBibleIndex, loadTranslations } from './lib/bible'
import type { Bible, EduIndex, EduItem, Flashcards, IndexFile, LangsFile, Occasions, Pray40Day, Pray40Index, SongCollection, SongsFile, Study, Ui } from './types'

const BASE = import.meta.env.BASE_URL // np. '/'
const cache = new Map<string, unknown>()

async function getJSON<T>(path: string): Promise<T> {
  const url = `${BASE}content/${path}`.replace(/\/{2,}/g, '/')
  if (cache.has(url)) return cache.get(url) as T
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nie udało się wczytać: ${url} (${res.status})`)
  const data = (await res.json()) as T
  cache.set(url, data)
  return data
}

export const loadLangs = () => getJSON<LangsFile>('langs.json')
export const loadIndex = (lang: string) => getJSON<IndexFile>(`${lang}/index.json`)
export const loadUi = (lang: string) => getJSON<Ui>(`${lang}/ui.json`)
export const loadStudy = (lang: string, id: string) => getJSON<Study>(`${lang}/studies/${id}.json`)
export const loadBible = (lang: string, translation: string) =>
  getJSON<Bible>(`${lang}/bibles/${translation}.json`)
export const loadFlashcards = (lang: string) => getJSON<Flashcards>(`${lang}/flashcards.json`)
export const loadOccasions = (lang: string) => getJSON<Occasions>(`${lang}/occasions.json`)
const SONG_FILES: Record<SongCollection, string> = {
  hymnal: 'songs.json',
  youth: 'songs-youth.json'
}
export const loadSongs = (lang: string, collection: SongCollection = 'hymnal') =>
  getJSON<SongsFile>(`${lang}/${SONG_FILES[collection]}`)
export const loadPray40 = (lang: string) => getJSON<Pray40Index>(`${lang}/pray40/index.json`)
export const loadPray40Day = (lang: string, day: number) =>
  getJSON<Pray40Day>(`${lang}/pray40/${String(day).padStart(2, '0')}.json`)
export const loadEdu = (lang: string) => getJSON<EduIndex>(`${lang}/edu/index.json`)
export const loadEduItem = (lang: string, nr: number) =>
  getJSON<EduItem>(`${lang}/edu/${String(nr).padStart(2, '0')}.json`)

/**
 * Pobiera cały moduł językowy do cache (service worker zachowa go offline).
 * Decyzja autora 2026-08-25: idą też czytanki „40 dni", materiały edukacyjne
 * i pełne przekłady czytnika Biblii - czyli wszystko, co czytelnik może otworzyć
 * bez zasięgu.
 */
export async function downloadModule(lang: string, onProgress?: (done: number, total: number) => void) {
  const idx = await loadIndex(lang)
  const langs = await loadLangs()
  const meta = langs.languages.find((l) => l.code === lang)
  const translation = meta?.defaultTranslation || 'DEMO'

  // spisy trzeba mieć najpierw - to one mówią, ile jest do pobrania
  const [pray, edu, bibles] = await Promise.all([
    loadPray40(lang).catch(() => null),
    loadEdu(lang).catch(() => null),
    loadTranslations(lang).catch(() => null)
  ])
  const reader = bibles?.translations ?? []

  // dodatki (śpiewnik, okazje, fiszki, czytanki) są opcjonalne - język bez nich ma działać dalej
  const optional = [
    loadSongs(lang, 'hymnal'),
    loadSongs(lang, 'youth'),
    loadOccasions(lang),
    loadFlashcards(lang),
    ...(pray?.days ?? []).map((d) => loadPray40Day(lang, d.day)),
    ...(edu?.items ?? []).map((i) => loadEduItem(lang, i.nr)),
    // wersety do studiów w pozostałych przekładach, nie tylko domyślnym
    ...reader.filter((r) => r.code !== translation).map((r) => loadBible(lang, r.code))
  ].map((p) => p.catch(() => undefined))

  const tasks: Promise<unknown>[] = [
    loadUi(lang),
    loadBible(lang, translation),
    ...idx.studies.map((s) => loadStudy(lang, s.id)),
    ...optional
  ]

  // pełny tekst Pisma leży po księgach, więc każda liczy się do postępu osobno
  const indexes = await Promise.all(reader.map((r) => loadBibleIndex(lang, r.code).catch(() => null)))
  const books = indexes.flatMap((ix, i) =>
    (ix?.books ?? []).map((b) => ({ code: reader[i].code, osis: b.osis }))
  )

  let done = 0
  const total = tasks.length + books.length
  const bump = () => {
    done += 1
    onProgress?.(done, total)
  }

  await Promise.all(tasks.map((task) => task.then(bump)))
  // księgi po kolei - równoległe 66 pobrań tylko zapycha łącze
  for (const b of books) {
    await loadBibleBook(lang, b.code, b.osis).catch(() => undefined)
    bump()
  }
  return { lang, total }
}
