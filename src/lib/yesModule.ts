import type { BibleBookMeta, BibleIndex, BibleModuleFile } from '../types'
import { findBook } from './bible'

// Czytanie modulow `.yes` (Alkitab Bible Study) wprost w przegladarce - dzieki temu
// przeklad wgrywa sie tak samo na komputerze i na telefonie, bez Pythona.
// Odpowiednik `tools/yes_bible.py`; ten sam format, opisany tam dokladniej:
//
//   naglowek 8B, potem sekcje: nazwa (12B ASCII dopelniona '_') + dlugosc (4B BE) + dane
//   `infoEdisi`  – pola przekladu: nama (kod), judul (tytul), keterangan (nota/copyright)
//   `infoKitab`  – pola ksiegi: nama (nazwa natywna), npasal (4B BE), nayat (npasal bajtow)
//   `teks`       – caly tekst UTF-8, wersety oddzielone '\n', w kolejnosci kanonicznej
//
// Nowsza odmiana formatu (sekcje `versionInfo`, `booksInfo`, `text`) nie jest obslugiwana –
// tak samo jak w `yes_bible.py`. Rozpoznajemy ja i mowimy o tym wprost.

const SECTION_NAME = /^[A-Za-z][A-Za-z0-9]*$/

function sections(data: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const out = new Map<string, Uint8Array>()
  let pos = 8
  while (pos + 16 <= data.length) {
    const raw = new TextDecoder('ascii').decode(data.subarray(pos, pos + 12)).replace(/_+$/, '')
    if (!SECTION_NAME.test(raw)) break
    const len = view.getUint32(pos + 12)
    out.set(raw, data.subarray(pos + 16, pos + 16 + len))
    pos += 16 + len
  }
  return out
}

/** Nazwa pola: 1B dlugosci + UTF-16BE. */
function readName(body: Uint8Array, pos: number): { text: string; next: number } {
  const n = body[pos]
  const text = new TextDecoder('utf-16be').decode(body.subarray(pos + 1, pos + 1 + 2 * n))
  return { text, next: pos + 1 + 2 * n }
}

/** Zakodowana postac nazwy pola - tak jej szukamy w sekcji. */
function encodedName(name: string): Uint8Array {
  const out = new Uint8Array(1 + 2 * name.length)
  out[0] = name.length
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    out[1 + 2 * i] = code >> 8
    out[2 + 2 * i] = code & 0xff
  }
  return out
}

function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

/**
 * Wartosc pola tekstowego. Krotkie pola maja dlugosc na 1B, dlugie (np. `keterangan`)
 * na 4B - typ nie jest zapisany, wiec bierzemy ten odczyt, ktory daje sensowny tekst.
 */
function readValue(body: Uint8Array, pos: number): string {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const short = body[pos]
  if (short > 0 && short < 64 && pos + 1 + 2 * short <= body.length) {
    const text = new TextDecoder('utf-16be').decode(body.subarray(pos + 1, pos + 1 + 2 * short))
    if ([...text].every((ch) => ch.charCodeAt(0) >= 32)) return text
  }
  if (pos + 4 <= body.length) {
    const long = view.getUint32(pos)
    if (long > 0 && long < 4096 && pos + 4 + 2 * long <= body.length) {
      return new TextDecoder('utf-16be').decode(body.subarray(pos + 4, pos + 4 + 2 * long))
    }
  }
  return ''
}

function field(body: Uint8Array, name: string): string {
  const at = indexOfBytes(body, encodedName(name))
  return at < 0 ? '' : readValue(body, at + 1 + 2 * name.length)
}

/** Ksiegi z `infoKitab`: nazwa natywna i liczba wersetow w kazdym rozdziale. */
function books(body: Uint8Array): { name: string; verses: number[] }[] {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const K_NAMA = encodedName('nama')
  const K_NPASAL = encodedName('npasal')
  const K_NAYAT = encodedName('nayat')
  const out: { name: string; verses: number[] }[] = []
  let pos = 0
  for (;;) {
    const i = indexOfBytes(body, K_NAMA, pos)
    if (i < 0) break
    const { text: name, next } = readName(body, i + K_NAMA.length)
    const j = indexOfBytes(body, K_NPASAL, next)
    if (j < 0) break
    const chapters = view.getUint32(j + K_NPASAL.length)
    const k = indexOfBytes(body, K_NAYAT, j)
    if (k < 0) break
    const start = k + K_NAYAT.length
    out.push({ name, verses: Array.from(body.subarray(start, start + chapters)) })
    pos = start + chapters
  }
  return out
}

/**
 * Przerabia modul `.yes` na modul aplikacji.
 * Rzuca 'yes-new-format' (nowsza odmiana formatu) albo 'bad-format'.
 *
 * Ksiegi dopasowujemy do spisu z przekladu, ktory juz mamy: gdy modul ma tyle samo ksiag,
 * idziemy po kolejnosci kanonu, w przeciwnym razie po nazwie natywnej (moduly katolickie
 * maja 73 ksiegi, wiec pozycje sie rozjezdzaja - deuterokanoniczne po prostu odpadaja).
 */
export function parseYesModule(
  buffer: ArrayBuffer,
  template: BibleIndex,
  override?: { code?: string; name?: string }
): BibleModuleFile {
  const data = new Uint8Array(buffer)
  const secs = sections(data)
  if (!secs.has('teks') || !secs.has('infoKitab')) {
    // nowsza odmiana ma nazwy sekcji o zmiennej dlugosci, wiec `sections()` nic z niej
    // nie odczyta - rozpoznajemy ja po nazwach lezacych na poczatku pliku
    const head = new TextDecoder('ascii').decode(data.subarray(0, 512))
    throw new Error(/versionInfo|booksInfo/.test(head) ? 'yes-new-format' : 'bad-format')
  }

  const info = secs.get('infoEdisi') || new Uint8Array()
  const code = (override?.code || field(info, 'nama') || 'YES').trim().toUpperCase().slice(0, 12)
  const description = field(info, 'keterangan').trim()
  const title = (override?.name || description.split(/[.\n]/)[0] || field(info, 'judul') || code).trim()

  const lines = new TextDecoder('utf-8').decode(secs.get('teks')!).split('\n')
  const list = books(secs.get('infoKitab')!)
  if (!list.length) throw new Error('bad-format')

  const byPosition = list.length === template.books.length
  const out: Record<string, string[][]> = {}
  const index: BibleIndex = {
    translation: code,
    name: title,
    lang: template.lang,
    license: description || 'Moduł .yes wgrany przez czytelnika – kopia na własny użytek.',
    source: 'Alkitab (.yes)',
    books: [],
  }

  let cursor = 0 // pozycja pierwszego wersetu ksiegi w `teks`
  for (let i = 0; i < list.length; i++) {
    const entry = list[i]
    const total = entry.verses.reduce((a, b) => a + b, 0)
    const first = cursor
    cursor += total

    const meta: BibleBookMeta | null = byPosition
      ? template.books[i] ?? null
      : findBook(entry.name, template.books)
    if (!meta || out[meta.osis]) continue

    const chapters: string[][] = []
    let at = first
    for (const count of entry.verses) {
      const row: string[] = []
      for (let v = 0; v < count; v++) row.push((lines[at + v] || '').trim())
      chapters.push(row)
      at += count
    }
    out[meta.osis] = chapters
    index.books.push({ ...meta, chapters: chapters.map((c) => c.length) })
  }

  if (!index.books.length) throw new Error('bad-format')
  // spis ksiag musi isc kolejnoscia kanonu, niezaleznie od kolejnosci w module
  const order = new Map(template.books.map((b, i) => [b.osis, i]))
  index.books.sort((a, b) => (order.get(a.osis) ?? 0) - (order.get(b.osis) ?? 0))
  return { index, books: out }
}

/**
 * Ile rozdzialow ma inna liczbe wersetow niz przeklad, ktorego uzywamy jako wzorca.
 * Przeklady katolickie (Tysiaclecia, warszawsko-praska) licza nadpisy psalmow jako wersety
 * i maja dodatki deuterokanoniczne w Dn i Est - wtedy odnosnik ze studium trafia o werset
 * obok. Czytelnik ma o tym wiedziec, zanim zacznie porownywac.
 */
export function versificationGap(index: BibleIndex, template: BibleIndex): number {
  const wzor = new Map(template.books.map((b) => [b.osis, b.chapters]))
  let gap = 0
  for (const b of index.books) {
    const ref = wzor.get(b.osis)
    if (!ref) continue
    const n = Math.min(ref.length, b.chapters.length)
    for (let i = 0; i < n; i++) if (ref[i] !== b.chapters[i]) gap += 1
    gap += Math.abs(ref.length - b.chapters.length)
  }
  return gap
}
