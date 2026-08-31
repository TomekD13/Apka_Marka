import type { BibleBookMeta, BibleBookText, BibleIndex, BibleTranslations } from '../types'
import { getInstalledBook, getInstalledIndex, listInstalled } from './bibleStore'
import { parseSqliteModule } from './sqliteModule'
import { pickFromZip } from './unzip'

// Dostep do tekstu Pisma dla czytnika `/pl/biblia`.
// Dwa zrodla, ten sam ksztalt danych:
//   - przeklady lezace na serwerze  -> `content/{lang}/bible/{KOD}/{Osis}.json`
//   - moduly doinstalowane lokalnie -> IndexedDB (lib/bibleStore.ts)
// Wszystko trzymane po ksiegach: czytelnik pobiera 3-225 KB zamiast calych 3,9 MB.

const BASE = import.meta.env.BASE_URL
const memory = new Map<string, unknown>()

/**
 * Biblia Gdańska jest częścią wydania aplikacji, podobnie jak UBG. Trzymamy ją jako
 * jeden moduł MyBible, aby nie powielać 66 plików, a przy pierwszym użyciu czytamy go
 * lokalnie w przeglądarce. Plik trafia również do cache'u PWA podczas instalacji.
 */
async function loadBundledBG(lang: string) {
  const key = `bundled:${lang}:BG`
  const hit = memory.get(key)
  if (hit) return hit as { index: BibleIndex; books: Record<string, string[][]> }

  const res = await fetch(`${BASE}content/${lang}/bible/BG.bbl.mybible.zip`.replace(/\/{2,}/g, '/'))
  if (!res.ok) throw new Error(`Nie udało się wczytać: Biblia Gdańska (${res.status})`)
  const archive = await res.arrayBuffer()
  const picked = await pickFromZip(archive, ['.sqlite3', '.sqlite', '.mybible'])
  if (!picked) throw new Error('zip-empty')
  const template = await loadBibleIndex(lang, 'UBG')
  const module = parseSqliteModule(picked.data, template, {
    code: 'BG',
    name: 'Biblia Gdańska (1881)',
  })
  memory.set(key, module)
  return module
}

async function getJSON<T>(path: string): Promise<T> {
  const url = `${BASE}content/${path}`.replace(/\/{2,}/g, '/')
  const hit = memory.get(url)
  if (hit) return hit as T
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nie udało się wczytać: ${url} (${res.status})`)
  const data = (await res.json()) as T
  memory.set(url, data)
  return data
}

export const loadTranslations = (lang: string) =>
  getJSON<BibleTranslations>(`${lang}/bible/translations.json`)

/** Spis ksiag przekladu - najpierw szukamy w modulach czytelnika, potem na serwerze. */
export async function loadBibleIndex(lang: string, code: string): Promise<BibleIndex> {
  const key = `idx:${lang}:${code}`
  const hit = memory.get(key)
  if (hit) return hit as BibleIndex
  const bundled = code === 'BG' ? await loadBundledBG(lang) : null
  const installed = bundled ? null : await getInstalledIndex(code)
  const index = bundled?.index || installed || (await getJSON<BibleIndex>(`${lang}/bible/${code}/index.json`))
  memory.set(key, index)
  return index
}

export async function loadBibleBook(lang: string, code: string, osis: string): Promise<string[][]> {
  const key = `book:${lang}:${code}:${osis}`
  const hit = memory.get(key)
  if (hit) return hit as string[][]
  const bundled = code === 'BG' ? await loadBundledBG(lang) : null
  const installed = bundled ? null : await getInstalledBook(code, osis)
  const chapters = bundled?.books[osis] || installed || (await getJSON<BibleBookText>(`${lang}/bible/${code}/${osis}.json`)).chapters
  memory.set(key, chapters)
  return chapters
}

/** Wszystkie przeklady do wyboru: te z serwera plus doinstalowane. */
export async function listTranslations(lang: string) {
  const [server, installed] = await Promise.all([
    loadTranslations(lang).catch(() => null),
    listInstalled(),
  ])
  const out = (server?.translations || []).map((t) => ({ ...t, installed: false }))
  for (const m of installed) {
    if (m.index.lang && m.index.lang !== lang) continue
    const entry = {
      code: m.index.translation,
      name: m.index.name,
      license: m.index.license,
      source: m.index.source,
      sizeKB: m.sizeKB,
      installed: true,
    }
    // modul o tym samym kodzie co przeklad z serwera przeslania go przy czytaniu
    // (loadBibleIndex pyta najpierw IndexedDB) - lista ma pokazywac to, co czytelnik
    // naprawde czyta, a nie wpis z serwera
    const clash = out.findIndex((t) => t.code === entry.code)
    if (clash >= 0) out[clash] = entry
    else out.push(entry)
  }
  return { default: server?.default || out[0]?.code || 'UBG', translations: out }
}

/** Pobiera caly przeklad do cache przegladarki (service worker zachowa go offline). */
export async function downloadTranslation(
  lang: string,
  code: string,
  onProgress?: (done: number, total: number) => void
) {
  const index = await loadBibleIndex(lang, code)
  let done = 0
  const total = index.books.length
  for (const b of index.books) {
    await loadBibleBook(lang, code, b.osis).catch(() => undefined)
    done += 1
    onProgress?.(done, total)
  }
  return total
}

// --- odnosniki ---------------------------------------------------------------

/** Porownanie bez ogonkow i bez kropek: „1 kor", „1Kor", „I Kor" maja sie zejsc. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[.\s'’-]/g, '')
}

// Skroty spoza indeksu, ktore czytelnik moze wpisac z nawyku - zwlaszcza numeracja
// „1 Moj"/„I Moj" (Gdanska) i formy z innych przekladow polskich.
const ALIASES: Record<string, string[]> = {
  Gen: ['1moj', '1mojzeszowa', 'rdz', 'rodz', 'genesis', 'i moj'],
  Exod: ['2moj', '2mojzeszowa', 'wj', 'wyj', 'exodus'],
  Lev: ['3moj', '3mojzeszowa', 'kpl', 'kapl', 'lev'],
  Num: ['4moj', '4mojzeszowa', 'lb', 'liczb'],
  Deut: ['5moj', '5mojzeszowa', 'pwt', 'powt'],
  Josh: ['joz', 'jozue'],
  Judg: ['sdz', 'sedz'],
  Ruth: ['rt', 'rut'],
  '1Sam': ['1sm', '1sam', 'isam'],
  '2Sam': ['2sm', '2sam', 'iisam'],
  '1Kgs': ['1krl', '1krol', '1kr'],
  '2Kgs': ['2krl', '2krol', '2kr'],
  '1Chr': ['1krn', '1kron'],
  '2Chr': ['2krn', '2kron'],
  Ezra: ['ezd', 'ezdr'],
  Neh: ['ne', 'neh'],
  Esth: ['est', 'ester'],
  Job: ['hi', 'hiob', 'job'],
  Ps: ['ps', 'psalm', 'psalmy', 'psalmow'],
  Prov: ['prz', 'przyp', 'przyslow'],
  Eccl: ['koh', 'kohelet', 'kazn', 'kaznodziei', 'ekl'],
  Song: ['pnp', 'piesn', 'piesninadpiesniami'],
  Isa: ['iz', 'izaj'],
  Jer: ['jr', 'jer'],
  Lam: ['lm', 'tren', 'treny', 'lam'],
  Ezek: ['ez', 'ezech'],
  Dan: ['dn', 'dan'],
  Hos: ['oz', 'ozeasz'],
  Joel: ['jl', 'joel', 'lj'],   // 'LJ' - tak Joela nazywaja moduly .yes
  Amos: ['am', 'amos'],
  Obad: ['ab', 'abd', 'abdiasz'],
  Jonah: ['jon', 'jonasz'],
  Mic: ['mi', 'mich'],
  Nah: ['na', 'nah'],
  Hab: ['ha', 'hab'],
  Zeph: ['so', 'sof'],
  Hag: ['ag', 'agg'],
  Zech: ['za', 'zach'],
  Mal: ['ml', 'mal'],
  Matt: ['mt', 'mat', 'mateusz'],
  Mark: ['mk', 'mar', 'marek'],
  Luke: ['lk', 'luk', 'lukasz'],
  John: ['j', 'jan', 'jn', 'ew jana'],
  Acts: ['dz', 'dzieje', 'dzap'],
  Rom: ['rz', 'rzym'],
  '1Cor': ['1kor', 'ikor'],
  '2Cor': ['2kor', 'iikor'],
  Gal: ['ga', 'gal'],
  Eph: ['ef', 'efez'],
  Phil: ['flp', 'fil', 'filip'],
  Col: ['kol', 'kolos'],
  '1Thess': ['1tes', '1tess'],
  '2Thess': ['2tes', '2tess'],
  '1Tim': ['1tm', '1tym'],
  '2Tim': ['2tm', '2tym'],
  Titus: ['tt', 'tyt'],
  Phlm: ['flm', 'filem'],
  Heb: ['hbr', 'hebr'],
  Jas: ['jk', 'jak', 'jakuba'],
  '1Pet': ['1p', '1ptr', '1piotra'],
  '2Pet': ['2p', '2ptr', '2piotra'],
  '1John': ['1j', '1jana'],
  '2John': ['2j', '2jana'],
  '3John': ['3j', '3jana'],
  Jude: ['jud', 'judy'],
  Rev: ['ap', 'obj', 'objawienie', 'apok'],
}

/**
 * Dopasowuje nazwe ksiegi (skrot, pelna nazwa, forma z nawyku) do spisu ksiag.
 * Uzywa tego i parser odnosnikow, i wczytywanie modulow `.yes`, gdzie nazwy ksiag
 * sa natywne dla przekladu („RDZ", „JAN").
 */
export function findBook(name: string, books: BibleBookMeta[]): BibleBookMeta | null {
  const wanted = fold(name)
  if (!wanted) return null
  const score = (b: BibleBookMeta): number => {
    const names = [fold(b.abbr), fold(b.name), ...(ALIASES[b.osis] || []).map(fold)]
    // nazwa ksiegi bez slowa „Ksiega"/„Ewangelia"/„List do” – czytelnik ich nie wpisuje
    names.push(fold(b.name.replace(/^(Księga|Ewangelia|List do|List|Pieśń)\s+/i, '')))
    if (names.includes(wanted)) return 3
    if (names.some((n) => n.startsWith(wanted) && wanted.length >= 2)) return 2
    if (names.some((n) => n.includes(wanted) && wanted.length >= 3)) return 1
    return 0
  }
  let best: BibleBookMeta | null = null
  let bestScore = 0
  for (const b of books) {
    const s = score(b)
    if (s > bestScore) {
      best = b
      bestScore = s
    }
  }
  return bestScore > 0 ? best : null
}

export interface ParsedRef {
  book: BibleBookMeta
  chapter: number
  verse?: number
  /** koniec zakresu, gdy podany („J 3,16-18") */
  verseTo?: number
}

/**
 * Rozbiera to, co czytelnik wpisal w pole odnosnika: „J 3,16", „Jan 3:16-18",
 * „1 Kor 13", „Ps 23", „Rodzaju 1,1". Zwraca null, gdy ksiegi nie da sie rozpoznac.
 */
export function parseRef(input: string, books: BibleBookMeta[]): ParsedRef | null {
  const raw = input.trim()
  if (!raw) return null
  // ksiega = wszystko do pierwszej liczby, ktora nie jest czescia nazwy („1 Kor")
  const m = raw.match(/^\s*((?:[1-3IV]+\s*)?[^\d]+?)\s*(\d+)?\s*(?:[,:.\s]\s*(\d+))?\s*(?:-\s*(\d+))?\s*$/u)
  if (!m) return null
  const [, namePart, chapterPart, versePart, verseToPart] = m

  const best = findBook(namePart, books)
  if (!best) return null

  const chapter = Math.min(Math.max(1, Number(chapterPart || 1)), best.chapters.length)
  const verseCount = best.chapters[chapter - 1] || 0
  const verse = versePart ? Math.min(Number(versePart), verseCount) : undefined
  const verseTo = verse && verseToPart ? Math.min(Number(verseToPart), verseCount) : undefined
  return { book: best, chapter, verse, verseTo }
}

/** Odnosnik do pokazania: „J 3,16", „J 3,16-18", „Ps 23". */
export function formatRef(book: BibleBookMeta, chapter: number, verse?: number, verseTo?: number): string {
  const head = `${book.abbr} ${chapter}`
  if (!verse) return head
  return verseTo && verseTo > verse ? `${head},${verse}-${verseTo}` : `${head},${verse}`
}

/** Klucz osis - ten sam, ktorym posluguja sie studia. */
export function osisKey(osis: string, chapter: number, verse: number): string {
  return `${osis}.${chapter}.${verse}`
}

// --- wyszukiwanie ------------------------------------------------------------

export interface SearchHit {
  osis: string
  bookName: string
  abbr: string
  chapter: number
  verse: number
  text: string
}
export type SearchScope = 'all' | 'ot' | 'nt' | 'book'

/**
 * Przeszukuje przeklad ksiega po ksiedze, oddajac trafienia partiami – czytelnik
 * widzi pierwsze wyniki, zanim sciagnie sie cala Biblia. `stop()` przerywa.
 */
export async function searchBible(
  lang: string,
  code: string,
  query: string,
  opts: {
    books: BibleBookMeta[]
    scope?: SearchScope
    bookOsis?: string
    limit?: number
    onBatch: (hits: SearchHit[], done: number, total: number) => void
    shouldStop?: () => boolean
  }
): Promise<number> {
  const needle = fold(query)
  if (needle.length < 3) return 0
  const scope = opts.scope || 'all'
  const pool = opts.books.filter((b) =>
    scope === 'all' ? true : scope === 'book' ? b.osis === opts.bookOsis : b.testament === scope
  )
  const limit = opts.limit ?? 300
  let found = 0
  let done = 0

  for (const book of pool) {
    if (opts.shouldStop?.()) break
    let chapters: string[][]
    try {
      chapters = await loadBibleBook(lang, code, book.osis)
    } catch {
      done += 1
      opts.onBatch([], done, pool.length)
      continue
    }
    const hits: SearchHit[] = []
    for (let ci = 0; ci < chapters.length && found + hits.length < limit; ci++) {
      const verses = chapters[ci]
      for (let vi = 0; vi < verses.length; vi++) {
        const text = verses[vi]
        if (!text) continue
        if (fold(stripTags(text)).includes(needle)) {
          hits.push({
            osis: book.osis,
            bookName: book.name,
            abbr: book.abbr,
            chapter: ci + 1,
            verse: vi + 1,
            text,
          })
          if (found + hits.length >= limit) break
        }
      }
    }
    found += hits.length
    done += 1
    opts.onBatch(hits, done, pool.length)
    if (found >= limit) break
  }
  return found
}

/** Tekst bez znacznikow - do szukania, kopiowania i udostepniania. */
export function stripTags(text: string): string {
  return text.replace(/<\/?[ib]>/g, '')
}

// --- wybor przekladu ---------------------------------------------------------
// Wybor czytelnika zostaje na stale w tej przegladarce, jak ulubione piesni.

const CHOICE = 'zywe-slowo:bible-translation:v1'

export function getChosenTranslation(fallback = 'UBG'): string {
  try {
    return localStorage.getItem(CHOICE) || fallback
  } catch {
    return fallback
  }
}

export function setChosenTranslation(code: string): void {
  try {
    localStorage.setItem(CHOICE, code)
  } catch {
    /* prywatne okno - wybor zyje tylko do konca sesji */
  }
}

// --- czytanie dwoch przekladow naraz ------------------------------------------
// Drugi przeklad i kierunek podzialu ekranu (decyzja autora 2026-08-25).
// Pusty drugi przeklad znaczy: czytamy jeden, tak jak dotad.

const SECOND = 'zywe-slowo:bible-second:v1'
const SPLIT = 'zywe-slowo:bible-split:v1'

/** „pion" to dwie kolumny obok siebie, „poziom" to jeden tekst pod drugim. */
export type BibleSplit = 'pion' | 'poziom'

export function getSecondTranslation(): string {
  try {
    return localStorage.getItem(SECOND) || ''
  } catch {
    return ''
  }
}

export function setSecondTranslation(code: string): void {
  try {
    if (code) localStorage.setItem(SECOND, code)
    else localStorage.removeItem(SECOND)
  } catch {
    /* prywatne okno - wybor zyje tylko do konca sesji */
  }
}

export function getBibleSplit(): BibleSplit {
  try {
    return localStorage.getItem(SPLIT) === 'poziom' ? 'poziom' : 'pion'
  } catch {
    return 'pion'
  }
}

export function setBibleSplit(v: BibleSplit): void {
  try {
    localStorage.setItem(SPLIT, v)
  } catch {
    /* prywatne okno - wybor zyje tylko do konca sesji */
  }
}
