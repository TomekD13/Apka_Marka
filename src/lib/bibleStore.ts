import type { BibleIndex, BibleModuleFile } from '../types'
import { parseSqliteModule } from './sqliteModule'
import { pickFromZip } from './unzip'
import { parseYesModule } from './yesModule'

// Moduly przekladow doinstalowane przez czytelnika. Caly przeklad to 3-5 MB,
// czyli grubo ponad limit localStorage - dlatego IndexedDB. Zadnego backendu:
// plik modulu wczytuje sam czytelnik ze swojego dysku albo z podanego adresu,
// i lezy on wylacznie w tej przegladarce.
//
// Ksztalt bazy:
//   store 'modules' : klucz = kod przekladu, wartosc = { index, installedAt }
//   store 'books'   : klucz = 'KOD/Osis',   wartosc = { chapters }

const DB = 'zywe-slowo-bible'
const VERSION = 1
const MODULES = 'modules'
const BOOKS = 'books'

export interface InstalledMeta {
  index: BibleIndex
  installedAt: string
  /** przyblizona waga w KB - pokazywana przy usuwaniu */
  sizeKB: number
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-indexeddb'))
      return
    }
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(MODULES)) db.createObjectStore(MODULES)
      if (!db.objectStoreNames.contains(BOOKS)) db.createObjectStore(BOOKS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('idb-open'))
  })
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error || new Error('idb-tx'))
        t.oncomplete = () => db.close()
      })
  )
}

/** Zainstalowane moduly - pusta lista takze wtedy, gdy przegladarka nie daje IndexedDB. */
export async function listInstalled(): Promise<InstalledMeta[]> {
  try {
    const all = await tx<InstalledMeta[]>(MODULES, 'readonly', (s) => s.getAll())
    return (all || []).filter((m) => m && m.index)
  } catch {
    return []
  }
}

export async function getInstalledIndex(code: string): Promise<BibleIndex | null> {
  try {
    const meta = await tx<InstalledMeta | undefined>(MODULES, 'readonly', (s) => s.get(code))
    return meta?.index ?? null
  } catch {
    return null
  }
}

export async function getInstalledBook(code: string, osis: string): Promise<string[][] | null> {
  try {
    const row = await tx<{ chapters: string[][] } | undefined>(BOOKS, 'readonly', (s) =>
      s.get(`${code}/${osis}`)
    )
    return row?.chapters ?? null
  } catch {
    return null
  }
}

/** Rzuca czytelnym kodem bledu: 'bad-format' | 'no-indexeddb' | 'quota'. */
export async function installModule(file: BibleModuleFile): Promise<InstalledMeta> {
  const index = file?.index
  const books = file?.books
  if (!index?.translation || !Array.isArray(index.books) || !books || typeof books !== 'object') {
    throw new Error('bad-format')
  }
  // indeks moze isc bez tekstu wszystkich ksiag (modul czesciowy), ale nie odwrotnie
  const known = new Set(index.books.map((b) => b.osis))
  for (const osis of Object.keys(books)) {
    if (!known.has(osis)) throw new Error('bad-format')
  }

  const sizeKB = Math.round(JSON.stringify(file).length / 1024)
  const meta: InstalledMeta = { index, installedAt: new Date().toISOString(), sizeKB }

  const db = await open().catch(() => {
    throw new Error('no-indexeddb')
  })
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([MODULES, BOOKS], 'readwrite')
    t.objectStore(MODULES).put(meta, index.translation)
    const store = t.objectStore(BOOKS)
    for (const [osis, chapters] of Object.entries(books)) {
      store.put({ chapters }, `${index.translation}/${osis}`)
    }
    t.oncomplete = () => {
      db.close()
      resolve()
    }
    t.onerror = () => {
      db.close()
      reject(new Error(t.error?.name === 'QuotaExceededError' ? 'quota' : 'idb-write'))
    }
  })
  return meta
}

export async function removeModule(code: string): Promise<void> {
  const index = await getInstalledIndex(code)
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([MODULES, BOOKS], 'readwrite')
    t.objectStore(MODULES).delete(code)
    const store = t.objectStore(BOOKS)
    for (const b of index?.books || []) store.delete(`${code}/${b.osis}`)
    t.oncomplete = () => {
      db.close()
      resolve()
    }
    t.onerror = () => {
      db.close()
      reject(t.error || new Error('idb-delete'))
    }
  })
}

/** Pierwsze bajty mowia, co to za plik - adres pobrania czesto nie ma rozszerzenia. */
function sniff(data: ArrayBuffer): 'zip' | 'sqlite' | 'json' | 'yes' {
  const head = new Uint8Array(data.slice(0, 16))
  const ascii = new TextDecoder('ascii').decode(head)
  if (head[0] === 0x50 && head[1] === 0x4b) return 'zip'              // „PK" – archiwum
  if (ascii.startsWith('SQLite format 3')) return 'sqlite'
  const first = ascii.trim()[0]
  if (first === '{' || first === '[') return 'json'
  return 'yes'
}

/**
 * Wczytuje modul z danych: nasz `.json`, `.yes` (Alkitab), baza SQLite (MyBible, MySword)
 * albo `.zip` z jednym z powyzszych w srodku. Format rozpoznajemy po zawartosci, a nazwa
 * pliku sluzy juz tylko za skrot przekladu, gdy modul sam go nie niesie.
 */
export async function installFromBuffer(
  data: ArrayBuffer,
  template?: BibleIndex,
  name = ''
): Promise<InstalledMeta> {
  let kind = sniff(data)
  let label = name

  // repozytoria wydaja moduly spakowane - rozpakowujemy sami, zeby na telefonie
  // nie trzeba bylo szukac programu do ZIP-a
  if (kind === 'zip') {
    const picked = await pickFromZip(data, ['.sqlite3', '.sqlite', '.mybible', '.yes', '.json'])
    if (!picked) throw new Error('zip-empty')
    data = picked.data
    label = picked.name
    kind = sniff(data)
  }

  if (kind === 'sqlite') {
    if (!template) throw new Error('bad-format')
    // nazwa pliku bywa jedynym miejscem, gdzie stoi skrot przekladu
    const fallbackCode = label
      .replace(/\.(bbl\.)?(sqlite3?|mybible)$/i, '')
      .split(/[\/]/)
      .pop()
    return installModule(parseSqliteModule(data, template, { fallbackCode }))
  }
  if (kind === 'json') {
    let parsed: BibleModuleFile
    try {
      parsed = JSON.parse(new TextDecoder().decode(data))
    } catch {
      throw new Error('bad-format')
    }
    return installModule(parsed)
  }
  if (!template) throw new Error('bad-format')
  return installModule(parseYesModule(data, template))
}

/** Wczytuje modul z pliku wybranego przez czytelnika. */
export async function installFromFile(file: File, template?: BibleIndex): Promise<InstalledMeta> {
  return installFromBuffer(await file.arrayBuffer(), template, file.name)
}

/**
 * Wczytuje modul spod adresu. Wymaga, zeby serwer zrodlowy oddawal CORS - repozytoria
 * modulow (ph4.org, mysword.info) tego nie robia, wiec stamtad plik pobiera sie recznie.
 */
export async function installFromUrl(url: string, template?: BibleIndex): Promise<InstalledMeta> {
  const res = await fetch(url).catch(() => {
    throw new Error('network')
  })
  if (!res.ok) throw new Error('network')
  return installFromBuffer(await res.arrayBuffer(), template, url.split('/').pop() || '')
}
