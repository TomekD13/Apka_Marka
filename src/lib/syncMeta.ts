// Zaplecze synchronizacji, ktore nie potrzebuje Firebase: znaczniki czasu zmian
// i nagrobki usunietych pozycji. Kazdy zapis przez writeList() zostawia tu slad,
// zeby po zalogowaniu dalo sie scalic dwa urzadzenia bez gubienia czegokolwiek:
// dla kazdej pozycji wygrywa nowsza wersja, a usuniecie jest tez wersja (nagrobek).
// Sam modul Firebase (lib/account.ts) laduje sie dopiero przy logowaniu.

const PREFIX = 'zywe-slowo:'
const META = 'zywe-slowo:sync:meta:v1'
const TOMB_TTL = 365 * 24 * 3600 * 1000

/** Listy, ktore jada do chmury: notatki, dziennik, zakladki, ulubione, plany czytania, przeczytane. */
export function isSyncedKey(key: string): boolean {
  return (
    key === 'zywe-slowo:notes:v1' ||
    key === 'zywe-slowo:reading-plans:v1' ||
    key === 'zywe-slowo:read:v2' ||
    key === 'zywe-slowo:fav-materials:v1' ||
    key === 'zywe-slowo:prayers:v1' ||
    key === 'zywe-slowo:bible-bookmarks:v1' ||
    /^zywe-slowo:fav:[^:]+:v1$/.test(key)
  )
}

/** Nazwa dokumentu w Firestore - klucz localStorage bez przedrostka aplikacji. */
export const docIdOf = (key: string) => key.slice(PREFIX.length)
export const keyOfDoc = (id: string) => PREFIX + id

/** Tozsamosc pozycji. Zakladka to werset (dwa urzadzenia nadaja jej rozne id). */
export function idOf(key: string, item: unknown): string {
  if (typeof item === 'number' || typeof item === 'string') return String(item)
  const o = item as Record<string, unknown>
  if (key === 'zywe-slowo:bible-bookmarks:v1') return `${o.osis}.${o.chapter}.${o.verse}`
  return String(o?.id ?? '')
}

export interface KeyMeta {
  /** id -> chwila ostatniej zmiany (ms) */
  s: Record<string, number>
  /** id -> chwila usuniecia (ms) */
  d: Record<string, number>
}
type Meta = Record<string, KeyMeta>

function readMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META) || '{}') as Meta
  } catch {
    return {}
  }
}

export function getKeyMeta(key: string): KeyMeta {
  const m = readMeta()[key]
  return { s: { ...(m?.s || {}) }, d: { ...(m?.d || {}) } }
}

export function setKeyMeta(key: string, meta: KeyMeta): void {
  try {
    const all = readMeta()
    all[key] = meta
    localStorage.setItem(META, JSON.stringify(all))
  } catch {
    /* brak miejsca - synchronizacja oprze sie na datach z samych pozycji */
  }
}

// --- zmiany lokalne ---------------------------------------------------------

type Listener = (key: string) => void
const listeners = new Set<Listener>()

/** Modul konta slucha tu zmian, zeby wyslac je w tle. */
export function onLocalChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Wolane przez writeList() z poprzednia i nowa zawartoscia listy. */
export function recordWrite(key: string, prevRaw: string | null, next: unknown[]): void {
  if (!isSyncedKey(key)) return
  let prev: unknown[] = []
  try {
    const p = prevRaw ? JSON.parse(prevRaw) : []
    if (Array.isArray(p)) prev = p
  } catch {
    /* uszkodzony wpis - traktujemy jak pusty */
  }
  const before = new Map(prev.map((x) => [idOf(key, x), JSON.stringify(x)]))
  const after = new Map(next.map((x) => [idOf(key, x), JSON.stringify(x)]))
  const meta = getKeyMeta(key)
  const now = Date.now()
  let changed = false
  for (const [id, json] of after) {
    if (before.get(id) !== json) {
      meta.s[id] = now
      delete meta.d[id]
      changed = true
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) {
      meta.d[id] = now
      delete meta.s[id]
      changed = true
    }
  }
  if (!changed) return
  setKeyMeta(key, meta)
  for (const fn of listeners) fn(key)
}

// --- scalanie ---------------------------------------------------------------

/** Dokument w Firestore: pozycje z chwila zmiany i nagrobki usunietych. */
export interface RemoteList {
  items: Record<string, { v: unknown; t: number }>
  d: Record<string, number>
}

/** Pozycje sprzed synchronizacji nie maja znacznika - bierzemy ich wlasne daty. */
function ownTime(item: unknown): number {
  const o = item as Record<string, unknown> | null
  const raw = (o && typeof o === 'object' && (o.updatedAt || o.answeredAt || o.createdAt)) || ''
  const t = Date.parse(String(raw))
  return Number.isFinite(t) ? t : 0
}

export interface MergeResult {
  items: unknown[]
  meta: KeyMeta
  remote: RemoteList
}

/**
 * Scala liste z urzadzenia z dokumentem z chmury. Dla kazdej pozycji wygrywa
 * najnowsze zdarzenie (zapis albo usuniecie); przy remisie zostaje pozycja.
 * Pierwsze logowanie daje wiec sume obu stron - nic nie ginie.
 */
export function mergeList(key: string, local: unknown[], meta: KeyMeta, remote: RemoteList | null, now = Date.now()): MergeResult {
  type Win = { t: number; v?: unknown; dead: boolean }
  const win = new Map<string, Win>()
  const offer = (id: string, w: Win) => {
    if (!id) return
    const cur = win.get(id)
    if (!cur || w.t > cur.t || (w.t === cur.t && cur.dead && !w.dead)) win.set(id, w)
  }

  for (const item of local) {
    const id = idOf(key, item)
    offer(id, { t: meta.s[id] ?? ownTime(item), v: item, dead: false })
  }
  for (const [id, t] of Object.entries(meta.d)) offer(id, { t, dead: true })
  if (remote) {
    for (const [id, e] of Object.entries(remote.items || {})) offer(id, { t: e.t, v: e.v, dead: false })
    for (const [id, t] of Object.entries(remote.d || {})) offer(id, { t, dead: true })
  }

  const live = [...win.entries()].filter(([, w]) => !w.dead).sort((a, b) => b[1].t - a[1].t)
  const out: MergeResult = { items: [], meta: { s: {}, d: {} }, remote: { items: {}, d: {} } }
  for (const [id, w] of live) {
    out.items.push(w.v)
    out.meta.s[id] = w.t
    out.remote.items[id] = { v: w.v, t: w.t }
  }
  for (const [id, w] of win) {
    if (!w.dead || now - w.t > TOMB_TTL) continue
    out.meta.d[id] = w.t
    out.remote.d[id] = w.t
  }
  return out
}

/** JSON z posortowanymi kluczami - do porownania, czy cos sie naprawde zmienilo. */
export function stableJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableJson).join(',')}]`
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(x) ?? 'null'
}

// --- wspolne urzadzenie ----------------------------------------------------------

/**
 * Usuwa z tego urzadzenia wszystko, co jedzie do chmury (i slady zmian).
 * Wolane, gdy loguje sie INNE konto niz poprzednio albo czytelnik wylogowuje sie
 * z cudzego urzadzenia - inaczej notatki jednej osoby scalilyby sie z kontem drugiej.
 */
export function clearSyncedLocal(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && isSyncedKey(k)) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
    localStorage.removeItem(META)
  } catch {
    /* brak dostepu do localStorage - nie ma czego czyscic */
  }
}
