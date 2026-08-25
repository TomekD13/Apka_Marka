import type { BibleBookMeta, BibleIndex, BibleModuleFile } from '../types'
import { findBook } from './bible'
import { readTables, type SqlValue } from './sqliteReader'

// Moduly biblijne trzymane w bazie SQLite - MyBible (`*.SQLite3`), MySword (`*.bbl.mybible`)
// i pokrewne. Czytamy je wprost w przegladarce (lib/sqliteReader.ts), bez sql.js.
//
// Dwa uklady tabel, oba obslugiwane:
//   MyBible  `verses(book_number, chapter, verse, text)` + `books(book_number, short_name,
//            long_name)` + `info(name, value)`
//   MySword  `Bible(Book, Chapter, Verse, Scripture)` + `Details(Title, Abbreviation, …)`
//
// Ksiegi dopasowujemy po nazwie z tabeli ksiag (`findBook`), a gdy jej nie ma albo nazwy sa
// w nieznanym jezyku - po numerze. Numeracja MyBible (10, 20, … 730) nie pokrywa sie
// z kolejnoscia kanonu protestanckiego w Nowym Testamencie, dlatego numery sa tabela,
// a nie wyliczeniem. Ksiag, ktorych nie da sie rozpoznac, po prostu nie bierzemy -
// i mowimy, ile ich bylo.

const TABLES = ['verses', 'books', 'books_all', 'info', 'bible', 'details']

// Numery ksiag MyBible. Stary Testament i Ewangelie z Dziejami numeruja sie tak samo
// we wszystkich modulach; od 520 w gore sa DWA uklady i roznia sie miedzy modulami:
//   A) kolejnosc protestancka  - 520 Rz, 530 1 Kor … 720 Jud, 730 Ap  (tak ma UBG z ph4.org)
//   B) kolejnosc wschodnia     - 520 Jk, 530 1 P … 720 Hbr, 730 Ap
// Uklad rozpoznajemy po liczbie rozdzialow ksiegi 520 (Rzymian ma 16, Jakuba 5), a i tak
// numer jest tylko zapasem - pierwsze zdanie ma nazwa ksiegi z tabeli `books`.
const OT_NUMBERS: Record<number, string> = {
  10: 'Gen', 20: 'Exod', 30: 'Lev', 40: 'Num', 50: 'Deut', 60: 'Josh', 70: 'Judg', 80: 'Ruth',
  90: '1Sam', 100: '2Sam', 110: '1Kgs', 120: '2Kgs', 130: '1Chr', 140: '2Chr', 150: 'Ezra',
  160: 'Neh', 190: 'Esth', 220: 'Job', 230: 'Ps', 240: 'Prov', 250: 'Eccl', 260: 'Song',
  290: 'Isa', 300: 'Jer', 310: 'Lam', 330: 'Ezek', 340: 'Dan', 350: 'Hos', 360: 'Joel',
  370: 'Amos', 380: 'Obad', 390: 'Jonah', 400: 'Mic', 410: 'Nah', 420: 'Hab', 430: 'Zeph',
  440: 'Hag', 450: 'Zech', 460: 'Mal',
  470: 'Matt', 480: 'Mark', 490: 'Luke', 500: 'John', 510: 'Acts',
}
const NT_PROTESTANT: Record<number, string> = {
  520: 'Rom', 530: '1Cor', 540: '2Cor', 550: 'Gal', 560: 'Eph', 570: 'Phil', 580: 'Col',
  590: '1Thess', 600: '2Thess', 610: '1Tim', 620: '2Tim', 630: 'Titus', 640: 'Phlm',
  650: 'Heb', 660: 'Jas', 670: '1Pet', 680: '2Pet', 690: '1John', 700: '2John', 710: '3John',
  720: 'Jude', 730: 'Rev',
}
const NT_EASTERN: Record<number, string> = {
  520: 'Jas', 530: '1Pet', 540: '2Pet', 550: '1John', 560: '2John', 570: '3John', 580: 'Jude',
  590: 'Rom', 600: '1Cor', 610: '2Cor', 620: 'Gal', 630: 'Eph', 640: 'Phil', 650: 'Col',
  660: '1Thess', 670: '2Thess', 680: '1Tim', 690: '2Tim', 700: 'Titus', 710: 'Phlm',
  720: 'Heb', 730: 'Rev',
}

// MySword numeruje ksiegi po prostu kolejnoscia kanonu protestanckiego (1-66).
const CANON_ORDER = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
]

const TAGS = /<[^>]*>/g
// wszystkie znaczniki poza <i> i <b> - te dwa niesie nasz render (components/VerseText.tsx):
// kursywa to slowa dopowiedziane przez tlumaczy, pogrubienie to nadpis psalmu
const OTHER_TAGS = /<\/?(?![ib]>)[a-zA-Z][a-zA-Z0-9]*[^>]*>/g
const STRONG = /\{[^}]*\}|\[[0-9]+\]/g

/** Tekst wersetu bez aparatu: numery Stronga, przypisy, tytuly srodtekstowe. */
function clean(raw: string): string {
  return raw
    .replace(/<S>[^<]*<\/S>/gi, '')
    .replace(/<f>[\s\S]*?<\/f>/gi, '')
    .replace(/<t>[\s\S]*?<\/t>/gi, '')
    .replace(OTHER_TAGS, '')
    .replace(STRONG, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const num = (v: SqlValue): number => (typeof v === 'number' ? v : Number(v ?? 0))
const str = (v: SqlValue): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

function column(columns: string[], ...names: string[]): number {
  for (const name of names) {
    const i = columns.findIndex((c) => c.toLowerCase() === name.toLowerCase())
    if (i >= 0) return i
  }
  return -1
}

export interface SqliteModuleResult extends BibleModuleFile {
  /** ksiegi z modulu, ktorych nie udalo sie rozpoznac (nazwa albo numer) */
  skipped: string[]
}

/**
 * Przerabia modul SQLite (MyBible / MySword) na modul aplikacji.
 * Rzuca 'not-sqlite' (to nie baza), 'bad-format' (baza bez tabeli wersetow)
 * albo 'no-books' (zadnej ksiegi nie dalo sie rozpoznac).
 */
export function parseSqliteModule(
  buffer: ArrayBuffer,
  template: BibleIndex,
  override?: { code?: string; name?: string; fallbackCode?: string }
): SqliteModuleResult {
  const tables = readTables(buffer, TABLES)
  const verses = tables.get('verses') || tables.get('bible')
  if (!verses || !verses.rows.length) throw new Error('bad-format')

  const mySword = !tables.has('verses')
  const cBook = column(verses.columns, 'book_number', 'book')
  const cChapter = column(verses.columns, 'chapter')
  const cVerse = column(verses.columns, 'verse')
  const cText = column(verses.columns, 'text', 'scripture')
  if (cBook < 0 || cChapter < 0 || cVerse < 0 || cText < 0) throw new Error('bad-format')

  // --- nazwy ksiag z modulu (jesli sa)
  const booksTable = tables.get('books') || tables.get('books_all')
  const names = new Map<number, string>()
  if (booksTable) {
    const bNum = column(booksTable.columns, 'book_number', 'book')
    const bShort = column(booksTable.columns, 'short_name', 'abbreviation')
    const bLong = column(booksTable.columns, 'long_name', 'name')
    for (const row of booksTable.rows) {
      if (bNum < 0) continue
      const n = num(row[bNum])
      const label = str(row[bLong] ?? '') || str(row[bShort] ?? '')
      if (n && label) names.set(n, label)
    }
  }

  // --- opis przekladu
  const info = tables.get('info')
  const meta = new Map<string, string>()
  if (info) {
    const iName = column(info.columns, 'name')
    const iValue = column(info.columns, 'value')
    for (const row of info.rows) meta.set(str(row[iName]).toLowerCase(), str(row[iValue]))
  }
  const details = tables.get('details')
  if (details) {
    for (let i = 0; i < details.columns.length; i++) {
      const value = details.rows[0]?.[i]
      if (value != null) meta.set(details.columns[i].toLowerCase(), str(value))
    }
  }

  // ile rozdzialow ma ksiega 520 - po tym poznajemy uklad Nowego Testamentu
  let chaptersOf520 = 0
  for (const row of verses.rows) {
    if (num(row[cBook]) === 520) chaptersOf520 = Math.max(chaptersOf520, num(row[cChapter]))
  }
  const NT_NUMBERS = chaptersOf520 > 0 && chaptersOf520 <= 8 ? NT_EASTERN : NT_PROTESTANT

  /** Ksiega z modulu -> ksiega w naszym spisie: najpierw po nazwie, potem po numerze. */
  const resolve = (n: number): BibleBookMeta | null => {
    const byName = names.has(n) ? findBook(names.get(n)!, template.books) : null
    if (byName) return byName
    const osis = mySword ? CANON_ORDER[n - 1] : OT_NUMBERS[n] || NT_NUMBERS[n]
    return osis ? template.books.find((b) => b.osis === osis) ?? null : null
  }

  // --- wersety w kubelki: ksiega -> rozdzial -> werset
  const buckets = new Map<string, Map<number, Map<number, string>>>()
  const skipped = new Set<string>()
  const resolved = new Map<number, BibleBookMeta | null>()

  for (const row of verses.rows) {
    const bookNo = num(row[cBook])
    if (!resolved.has(bookNo)) resolved.set(bookNo, resolve(bookNo))
    const book = resolved.get(bookNo)
    if (!book) {
      skipped.add(names.get(bookNo) || `#${bookNo}`)
      continue
    }
    const text = clean(str(row[cText]))
    if (!text) continue
    const chapter = num(row[cChapter])
    const verse = num(row[cVerse])
    if (chapter < 1 || verse < 1) continue
    let byChapter = buckets.get(book.osis)
    if (!byChapter) buckets.set(book.osis, (byChapter = new Map()))
    let byVerse = byChapter.get(chapter)
    if (!byVerse) byChapter.set(chapter, (byVerse = new Map()))
    byVerse.set(verse, text)
  }
  if (!buckets.size) throw new Error('no-books')

  // --- kubelki na tablice, kolejnoscia kanonu
  const out: Record<string, string[][]> = {}
  const index: BibleIndex = {
    // moduly MyBible czesto nie maja skrotu w `info` - wtedy bierzemy nazwe pliku
    // (UBG.SQLite3 -> UBG), bo to zwykle wlasnie skrot przekladu
    translation: (
      override?.code ||
      meta.get('abbreviation') ||
      meta.get('module_name') ||
      override?.fallbackCode ||
      'SQL'
    )
      .trim()
      .toUpperCase()
      .slice(0, 12),
    // MyBible trzyma nazwe przekladu w `description`, MySword w `Title`
    name: (override?.name || meta.get('title') || meta.get('description') || 'Moduł SQLite').trim(),
    lang: template.lang,
    license: (
      meta.get('detailed_info') ||
      meta.get('rights') ||
      meta.get('publisher') ||
      'Moduł wgrany przez czytelnika – kopia na własny użytek.'
    )
      .replace(TAGS, '')
      .trim(),
    source: mySword ? 'MySword (SQLite)' : 'MyBible (SQLite)',
    books: [],
  }

  for (const bookMeta of template.books) {
    const byChapter = buckets.get(bookMeta.osis)
    if (!byChapter) continue
    const top = Math.max(...byChapter.keys())
    const chapters: string[][] = []
    for (let c = 1; c <= top; c++) {
      const byVerse = byChapter.get(c)
      const last = byVerse && byVerse.size ? Math.max(...byVerse.keys()) : 0
      const row: string[] = []
      for (let v = 1; v <= last; v++) row.push(byVerse?.get(v) || '')
      chapters.push(row)
    }
    out[bookMeta.osis] = chapters
    index.books.push({ ...bookMeta, chapters: chapters.map((c) => c.length) })
  }

  return { index, books: out, skipped: [...skipped] }
}
