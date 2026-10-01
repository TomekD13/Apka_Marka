import { beforeEach, describe, expect, it } from 'vitest'
import index from '../../public/content/pl/bible/UBG/index.json'
import plans from '../../public/content/pl/reading-plans.json'
import type { BibleBookMeta, ReadingPlanDef } from '../types'
import {
  CANON, allChapters, chapterKey, distribute, expandStream, formatChapters, getUserPlan,
  markChapters, progress, readingDates, recalcPlan, schedule, startPlan,
} from './readingPlans'

const books = (index as { books: BibleBookMeta[] }).books
const defs = (plans as { plans: ReadingPlanDef[] }).plans
const canonKeys = expandStream(['Gen-Rev'], books).map(chapterKey)

beforeEach(() => localStorage.clear())

describe('definicje planow', () => {
  it('jest 10 planow i zaden rozdzial nie powtarza sie w planie', () => {
    expect(defs).toHaveLength(10)
    for (const def of defs) {
      const keys = allChapters(def, books).map(chapterKey)
      expect(new Set(keys).size, def.id).toBe(keys.length)
    }
  })

  it('tylko 66 ksiag kanonu - bez apokryfow', () => {
    expect(CANON).toHaveLength(66)
    expect(canonKeys).toHaveLength(1189)
    for (const def of defs) for (const k of allChapters(def, books).map(chapterKey)) expect(CANON).toContain(k.split('.')[0])
  })

  it('plany calej Biblii obejmuja kazdy z 1189 rozdzialow', () => {
    for (const id of ['cala-biblia', 'chronologicznie', 'st-i-nt', 'cztery-czytania']) {
      const def = defs.find((d) => d.id === id)!
      expect(new Set(allChapters(def, books).map(chapterKey)), id).toEqual(new Set(canonKeys))
    }
  })
})

describe('harmonogram', () => {
  it('rozklada wszystko na zadana liczbe dni, bez dziur i bez dubli', () => {
    const ch = expandStream(['Matt-Rev'], books)
    const days = distribute(ch, 90)
    expect(days).toHaveLength(90)
    expect(days.flat()).toEqual(ch)
    expect(days.every((d) => d.length > 0)).toBe(true)
  })

  it('liczy dni czytania tylko w wybrane dni tygodnia', () => {
    // 2026-10-05 to poniedzialek; dwa tygodnie, tylko pn-pt
    const d = readingDates('2026-10-05', 14, [1, 2, 3, 4, 5])
    expect(d).toHaveLength(10)
    expect(d[0]).toBe('2026-10-05')
    expect(d).not.toContain('2026-10-10')
  })

  it('rok, pol roku i dwa lata - zawsze caly plan', () => {
    const def = defs.find((x) => x.id === 'cala-biblia')!
    for (const span of [182, 365, 730]) {
      const days = schedule(def, books, { start: '2026-01-01', span, weekdays: [], base: [] })
      expect(days).toHaveLength(span)
      expect(days.flatMap((d) => d.chapters)).toHaveLength(1189)
    }
  })

  it('zapis odcinkow jest czytelny', () => {
    expect(formatChapters(expandStream(['Gen.1-3', 'Matt.5'], books), books)).toBe('Rdz 1–3; Mt 5')
  })
})

describe('plan czytelnika', () => {
  it('nowe tempo zostawia przeczytane i rozklada reszte od nowa', () => {
    const def = defs.find((x) => x.id === 'ewangelie')!
    const p = startPlan(def.id, '2026-01-01', 30, [])!
    const first = schedule(def, books, p)[0].chapters.map(chapterKey)
    markChapters(p.id, first, true)
    recalcPlan(p.id, '2026-02-01', 10, [])
    const after = getUserPlan(p.id)!
    const days = schedule(def, books, after)
    expect(days).toHaveLength(10)
    const keys = days.flatMap((d) => d.chapters.map(chapterKey))
    expect(keys.some((k) => first.includes(k))).toBe(false)
    expect(keys.length + first.length).toBe(89)
    expect(progress(days, after.done, 89, '2026-02-01').behind).toBe(0)
  })

  it('zalegle dni sa liczone do dzisiaj', () => {
    const def = defs.find((x) => x.id === 'psalmy-i-przyslowia')!
    const p = startPlan(def.id, '2026-03-01', 31, [])!
    const st = progress(schedule(def, books, p), p.done, 181, '2026-03-04')
    expect(st.behind).toBe(3)
    expect(st.next).toBe(0)
  })
})
