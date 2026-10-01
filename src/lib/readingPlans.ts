import type { BibleBookMeta, ReadingPlanDef } from '../types'
import { newId, readList, writeList } from './localStore'

// Plany czytania Biblii. Definicja planu (reading-plans.json) mowi tylko, CO czytac
// i w jakiej kolejnosci. Harmonogram liczy sie tutaj z parametrow czytelnika:
// data startu, dlugosc w dniach kalendarzowych i dni tygodnia, w ktore czyta.
// Rozdzialy rozkladamy wedlug liczby wersetow, zeby dni byly mniej wiecej rowne.

/** 66 ksiag kanonu protestanckiego - bez ksiag deuterokanonicznych (apokryfow). */
export const CANON = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam',
  'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech',
  'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col',
  '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John',
  '3John', 'Jude', 'Rev',
]

export interface PlanChapter {
  osis: string
  ch: number
  /** liczba wersetow - waga przy rozkladaniu na dni */
  w: number
}
export const chapterKey = (c: { osis: string; ch: number }) => `${c.osis}.${c.ch}`

/** Rozwija odcinki strumienia („Gen”, „Gen-Deut”, „Gen.12-50”) w liste rozdzialow. */
export function expandStream(segments: string[], books: BibleBookMeta[]): PlanChapter[] {
  const byOsis = new Map(books.map((b) => [b.osis, b]))
  const out: PlanChapter[] = []
  const push = (osis: string, from = 1, to?: number) => {
    const book = byOsis.get(osis)
    if (!book) throw new Error(`plan: nieznana ksiega ${osis}`)
    const last = Math.min(to ?? book.chapters.length, book.chapters.length)
    for (let ch = from; ch <= last; ch++) out.push({ osis, ch, w: book.chapters[ch - 1] || 1 })
  }
  for (const seg of segments) {
    const dot = seg.indexOf('.')
    if (dot > 0) {
      const [a, b] = seg.slice(dot + 1).split('-').map(Number)
      push(seg.slice(0, dot), a, b ?? a)
    } else if (seg.includes('-')) {
      const [a, b] = seg.split('-')
      const i = CANON.indexOf(a)
      const j = CANON.indexOf(b)
      if (i < 0 || j < i) throw new Error(`plan: zly zakres ${seg}`)
      for (const osis of CANON.slice(i, j + 1)) push(osis)
    } else push(seg)
  }
  return out
}

/** Rozklada rozdzialy na n dni wedlug wagi: rozdzial trafia tam, gdzie wypada jego srodek. */
export function distribute(chapters: PlanChapter[], n: number): PlanChapter[][] {
  const out: PlanChapter[][] = Array.from({ length: Math.max(1, n) }, () => [])
  const total = chapters.reduce((s, c) => s + c.w, 0) || 1
  let acc = 0
  for (const c of chapters) {
    const mid = acc + c.w / 2
    out[Math.min(out.length - 1, Math.floor((mid / total) * out.length))].push(c)
    acc += c.w
  }
  return out
}

// --- daty --------------------------------------------------------------------

/** Dzisiejsza data jako RRRR-MM-DD w czasie lokalnym. */
export function today(): string {
  const d = new Date()
  return iso(d)
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Dni czytania: od startu przez `span` dni kalendarzowych, tylko w wybrane dni tygodnia (0 = niedziela). */
export function readingDates(start: string, span: number, weekdays: number[]): string[] {
  const days = new Set(weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6])
  const d = parse(start)
  const out: string[] = []
  for (let i = 0; i < Math.max(1, span); i++) {
    if (days.has(d.getDay())) out.push(iso(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

// --- plany czytelnika ------------------------------------------------------------

/** Plan rozpoczety przez czytelnika. Zyje w localStorage, z kontem synchronizuje sie. */
export interface UserPlan {
  id: string
  planId: string
  /** poczatek obecnego tempa (RRRR-MM-DD) */
  start: string
  /** dlugosc w dniach kalendarzowych liczona od `start` */
  span: number
  /** dni tygodnia, w ktore czytelnik czyta (0 = niedziela) */
  weekdays: number[]
  /** rozdzialy przeczytane przed ustaleniem obecnego tempa - nie wchodza do harmonogramu */
  base: string[]
  /** wszystkie przeczytane rozdzialy („Gen.1”) */
  done: string[]
  createdAt: string
  updatedAt: string
}

export interface PlanDay {
  date: string
  chapters: PlanChapter[]
}

/** Harmonogram planu: kazdy strumien rozlozony osobno na te same dni czytania. */
export function schedule(def: ReadingPlanDef, books: BibleBookMeta[], p: Pick<UserPlan, 'start' | 'span' | 'weekdays' | 'base'>): PlanDay[] {
  const dates = readingDates(p.start, p.span, p.weekdays)
  const skip = new Set(p.base)
  const days: PlanDay[] = dates.map((date) => ({ date, chapters: [] }))
  for (const stream of def.streams) {
    const left = expandStream(stream, books).filter((c) => !skip.has(chapterKey(c)))
    distribute(left, dates.length).forEach((part, i) => days[i].chapters.push(...part))
  }
  return days
}

export const allChapters = (def: ReadingPlanDef, books: BibleBookMeta[]) =>
  def.streams.flatMap((s) => expandStream(s, books))

/** Rozdzialy w postaci do czytania: „Rdz 1–3; Mt 1”. */
export function formatChapters(chapters: PlanChapter[], books: BibleBookMeta[]): string {
  const abbr = new Map(books.map((b) => [b.osis, b.abbr]))
  const parts: string[] = []
  let i = 0
  while (i < chapters.length) {
    let j = i
    while (j + 1 < chapters.length && chapters[j + 1].osis === chapters[i].osis && chapters[j + 1].ch === chapters[j].ch + 1) j++
    const a = chapters[i]
    parts.push(`${abbr.get(a.osis) || a.osis} ${a.ch}${j > i ? `–${chapters[j].ch}` : ''}`)
    i = j + 1
  }
  return parts.join('; ')
}

const KEY = 'zywe-slowo:reading-plans:v1'
const read = () => readList<UserPlan>(KEY)
const write = (items: UserPlan[]) => writeList(KEY, items)

export const listUserPlans = () => read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
export const getUserPlan = (id: string) => read().find((p) => p.id === id)

export function startPlan(planId: string, start: string, span: number, weekdays: number[]): UserPlan | null {
  const now = new Date().toISOString()
  const plan: UserPlan = { id: newId(), planId, start, span, weekdays, base: [], done: [], createdAt: now, updatedAt: now }
  return write([plan, ...read()]) ? plan : null
}

function patch(id: string, fn: (p: UserPlan) => UserPlan): boolean {
  const items = read()
  const i = items.findIndex((p) => p.id === id)
  if (i < 0) return false
  items[i] = { ...fn(items[i]), updatedAt: new Date().toISOString() }
  return write(items)
}

/** Zaznacza albo odznacza rozdzialy jako przeczytane. */
export function markChapters(id: string, keys: string[], on: boolean): boolean {
  return patch(id, (p) => {
    const done = new Set(p.done)
    for (const k of keys) {
      if (on) done.add(k)
      else done.delete(k)
    }
    return { ...p, done: [...done] }
  })
}

/** Nowe tempo: to, co juz przeczytane, zostaje; reszta rozklada sie od nowa od `start`. */
export function recalcPlan(id: string, start: string, span: number, weekdays: number[]): boolean {
  return patch(id, (p) => ({ ...p, start, span, weekdays, base: [...p.done] }))
}

export function removePlan(id: string): boolean {
  return write(read().filter((p) => p.id !== id))
}

/** Stan planu na dzis: ktory dzien czytania, ile zaleglych dni, ile procent przeczytane. */
export function progress(days: PlanDay[], done: string[], total: number, on = today()) {
  const doneSet = new Set(done)
  const isDone = (d: PlanDay) => d.chapters.every((c) => doneSet.has(chapterKey(c)))
  let todayIndex = days.findIndex((d) => d.date >= on)
  if (todayIndex < 0) todayIndex = days.length
  const behind = days.slice(0, todayIndex).filter((d) => d.chapters.length && !isDone(d)).length
  const next = days.findIndex((d) => d.chapters.length > 0 && !isDone(d))
  return {
    todayIndex,
    behind,
    next,
    isDone,
    percent: total ? Math.round((doneSet.size / total) * 100) : 0,
    finished: next < 0,
  }
}

// --- pasek planu przy czytaniu ------------------------------------------------
// Klikniecie rozdzialu w planie otwiera Biblie, a pasek na dole trzyma plan pod reka.
// Ktory plan pokazuje pasek - tylko to urzadzenie, bez synchronizacji.

const BAR = 'zywe-slowo:plan-bar:v1'

export function getBarPlan(): string {
  try {
    return localStorage.getItem(BAR) || ''
  } catch {
    return ''
  }
}

export function setBarPlan(id: string): void {
  try {
    if (id) localStorage.setItem(BAR, id)
    else localStorage.removeItem(BAR)
  } catch {
    /* prywatne okno - pasek po prostu sie nie pokaze */
  }
}
