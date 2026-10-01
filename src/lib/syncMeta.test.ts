import { beforeEach, describe, expect, it } from 'vitest'
import { getKeyMeta, mergeList, onLocalChange, recordWrite, stableJson } from './syncMeta'
import { writeList } from './localStore'

const NOTES = 'zywe-slowo:notes:v1'
const FAV = 'zywe-slowo:fav:hymnal:v1'
const BM = 'zywe-slowo:bible-bookmarks:v1'
const empty = { s: {}, d: {} }

beforeEach(() => localStorage.clear())

describe('mergeList', () => {
  it('pierwsze logowanie daje sume obu stron', () => {
    const local = [{ id: 'a', title: 'A', updatedAt: '2026-09-01T00:00:00Z' }]
    const remote = { items: { b: { v: { id: 'b', title: 'B' }, t: 5 } }, d: {} }
    const m = mergeList(NOTES, local, empty, remote)
    expect(m.items.map((x) => (x as { id: string }).id).sort()).toEqual(['a', 'b'])
    expect(Object.keys(m.remote.items).sort()).toEqual(['a', 'b'])
  })

  it('nowsza wersja wygrywa, a nowszy nagrobek usuwa', () => {
    const local = [{ id: 'a', title: 'stara' }, { id: 'b', title: 'B' }]
    const meta = { s: { a: 10, b: 10 }, d: {} }
    const remote = { items: { a: { v: { id: 'a', title: 'nowa' }, t: 20 } }, d: { b: 30 } }
    const m = mergeList(NOTES, local, meta, remote, 40)
    expect(m.items).toEqual([{ id: 'a', title: 'nowa' }])
    expect(m.remote.d).toEqual({ b: 30 })
  })

  it('pozycja zapisana po usunieciu na innym urzadzeniu zostaje', () => {
    const m = mergeList(FAV, [12], { s: { '12': 50 }, d: {} }, { items: {}, d: { '12': 40 } }, 60)
    expect(m.items).toEqual([12])
    expect(m.remote.d).toEqual({})
  })

  it('zakladka to werset - dwa id tego samego wersetu daja jedna pozycje', () => {
    const a = { id: 'x1', osis: 'John', chapter: 3, verse: 16, createdAt: '2026-09-01T00:00:00Z' }
    const b = { ...a, id: 'y2', createdAt: '2026-09-02T00:00:00Z' }
    const m = mergeList(BM, [a], empty, { items: { 'John.3.16': { v: b, t: Date.parse(b.createdAt) } }, d: {} })
    expect(m.items).toEqual([b])
  })

  it('wynik scalenia z samym soba niczego nie zmienia', () => {
    const m1 = mergeList(NOTES, [{ id: 'a', t: 1 }], { s: { a: 3 }, d: { z: Date.now() } }, null)
    const m2 = mergeList(NOTES, m1.items, m1.meta, m1.remote)
    expect(stableJson(m2.remote)).toBe(stableJson(m1.remote))
    expect(m2.items).toEqual(m1.items)
  })
})

describe('recordWrite', () => {
  it('stempluje zmienione i nowe pozycje, a usuniete zamienia w nagrobki', () => {
    const seen: string[] = []
    const off = onLocalChange((k) => seen.push(k))
    writeList(NOTES, [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }])
    writeList(NOTES, [{ id: 'a', title: 'A2' }])
    off()
    const meta = getKeyMeta(NOTES)
    expect(Object.keys(meta.s)).toEqual(['a'])
    expect(Object.keys(meta.d)).toEqual(['b'])
    expect(seen).toEqual([NOTES, NOTES])
  })

  it('pomija listy, ktore nie jada do chmury', () => {
    recordWrite('zywe-slowo:inne:v1', null, [{ id: 'a' }])
    expect(getKeyMeta('zywe-slowo:inne:v1')).toEqual(empty)
  })
})
