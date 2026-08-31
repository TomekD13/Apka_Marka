import type { BibleCatalog, BibleIndex, BibleModuleFile, BibleSource, BibleSources } from '../types'
import { loadBibleIndex } from './bible'
import { installModule } from './bibleStore'

// Pobieranie przekladu wprost z cudzego serwera - u nas nie musi lezec nic.
// Warunkiem jest otwarty CORS po stronie zrodla; getbible.net i bolls.life
// oddaja `Access-Control-Allow-Origin: *`, wiec przegladarka moze siegnac tam sama.
// Pobrany tekst jest przerabiany na nasz format i ladowany do IndexedDB - tak samo,
// jakby czytelnik wgral plik z dysku.

const BASE = import.meta.env.BASE_URL

/**
 * Polski katalog MySword udostępnia moduły w formacie obsługiwanym przez aplikację.
 * Pokazujemy tu wyłącznie przekład z domeny publicznej; pozostałe moduły użytkownik
 * może samodzielnie znaleźć i dodać z pliku, po sprawdzeniu jego warunków licencji.
 */
const MYSWORD_POLAND_CATALOG: BibleCatalog = {
  name: 'MySword Polska — przekłady z domeny publicznej',
  url: 'https://mysword.com.pl/biblie-polskie/',
  formats: 'MySword (.bbl.mybible w archiwum .zip)',
  note: 'Udostępniamy wyłącznie przekład oznaczony jako domena publiczna. Inne moduły można dodać samodzielnie z własnego pliku.',
  items: [
    {
      code: 'PBGd-SJ',
      abbr: 'PBGd',
      name: 'Biblia Gdańska 1881',
      url: 'https://mysword.com.pl/wp-content/uploads/2025/03/PBG_SJ-BibliaGdanska.bbl.mybible_.zip',
      complete: true,
    },
  ],
}

/** Plik z katalogiem zrodel; brak pliku = brak katalogu, nie blad. */
async function loadSourcesFile(lang: string): Promise<BibleSources | null> {
  const url = `${BASE}content/${lang}/bible/sources.json`.replace(/\/{2,}/g, '/')
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as BibleSources
  } catch {
    return null
  }
}

/** Przeklady, ktore przegladarka sciagnie sama (serwer zrodlowy oddaje CORS). */
export async function loadSources(lang: string): Promise<BibleSource[]> {
  return (await loadSourcesFile(lang))?.sources || []
}

/** Strony z modulami do pobrania recznie - plik wskazuje sie potem w „Wczytaj plik modulu". */
export async function loadCatalogs(lang: string): Promise<BibleCatalog[]> {
  const catalogs = (await loadSourcesFile(lang))?.catalogs || []
  // Stary katalog ph4 pozostaje w pliku danych wyłącznie dla narzędzia odświeżającego,
  // ale nie jest już publikowany w interfejsie ani używany do pobierania.
  return [MYSWORD_POLAND_CATALOG, ...catalogs.filter((catalog) => !catalog.url.includes('ph4.'))]
}

/**
 * Nazwy, skroty i kolejnosc ksiag bierzemy z przekladu, ktory juz mamy - dzieki temu
 * nie powtarzamy tabeli kanonu w kodzie, a pobrany przeklad ma nazwy po polsku
 * niezaleznie od tego, jak nazywa je serwer zrodlowy.
 */
async function bookTemplate(lang: string, fallbackCode: string): Promise<BibleIndex> {
  return loadBibleIndex(lang, fallbackCode)
}

/** getbible.net v2: `{url}/{nr}.json` = jedna ksiega, `chapters[].verses[]`. */
async function fromGetbible(
  source: BibleSource,
  template: BibleIndex,
  onProgress?: (done: number, total: number) => void
): Promise<BibleModuleFile> {
  const books: Record<string, string[][]> = {}
  const index: BibleIndex = {
    translation: source.code,
    name: source.name,
    lang: template.lang,
    license: source.license,
    source: source.provider,
    books: [],
  }
  const total = template.books.length

  for (let i = 0; i < total; i++) {
    const meta = template.books[i]
    // numeracja ksiag w getbible idzie kolejnoscia kanonu, tak samo jak nasz indeks
    const res = await fetch(`${source.url}/${i + 1}.json`)
    if (!res.ok) throw new Error('network')
    const data = (await res.json()) as {
      chapters?: { chapter: number; verses?: { verse: number; text: string }[] }[]
    }
    const chapters: string[][] = []
    for (const ch of (data.chapters || []).sort((a, b) => a.chapter - b.chapter)) {
      const byNo = new Map<number, string>()
      for (const v of ch.verses || []) byNo.set(Number(v.verse), (v.text || '').trim())
      const top = byNo.size ? Math.max(...byNo.keys()) : 0
      const row: string[] = []
      for (let n = 1; n <= top; n++) row.push(byNo.get(n) || '')
      chapters.push(row)
    }
    if (chapters.length) {
      books[meta.osis] = chapters
      index.books.push({ ...meta, chapters: chapters.map((c) => c.length) })
    }
    onProgress?.(i + 1, total)
  }
  if (!index.books.length) throw new Error('bad-format')
  return { index, books }
}

/** Nasz format modulu pod adresem - jeden plik JSON. */
async function fromModuleUrl(source: BibleSource): Promise<BibleModuleFile> {
  const res = await fetch(source.url)
  if (!res.ok) throw new Error('network')
  return (await res.json()) as BibleModuleFile
}

/**
 * Sciaga przeklad ze zrodla i zapisuje jako modul czytelnika.
 * Rzuca: 'network' | 'bad-format' | 'quota' | 'no-indexeddb'.
 */
export async function installFromSource(
  lang: string,
  source: BibleSource,
  templateCode: string,
  onProgress?: (done: number, total: number) => void
) {
  const file =
    source.kind === 'getbible'
      ? await fromGetbible(source, await bookTemplate(lang, templateCode), onProgress)
      : await fromModuleUrl(source)
  return installModule(file)
}
