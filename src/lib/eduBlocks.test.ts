import { describe, expect, it } from 'vitest'
import index from '../../public/content/pl/edu/index.json'
import { eduBlocks, openByDefault } from './eduBlocks'

const it_ = (nr: number, date: string) => ({ nr, title: `m${nr}`, ref: '', date })

describe('Czlowiek Nadziei - bloki w spisie', () => {
  it('wstep 1-10 i tygodnie po 7 z index.json', () => {
    const b = eduBlocks(index.items, index.blocks)
    expect(b[0]).toMatchObject({ from: 1, to: 10, title: 'Zaprojektowani z sensem' })
    expect(b[0].items).toHaveLength(10)
    expect(b[1]).toMatchObject({ from: 11, to: 17 })
    expect(b.flatMap((x) => x.items)).toHaveLength(index.items.length)
  })

  it('materialy za ostatnim blokiem ida po 7, bez nazwy', () => {
    const items = Array.from({ length: 12 }, (_, i) => it_(i + 1, `2026-01-${String(i + 1).padStart(2, '0')}`))
    const b = eduBlocks(items, [{ from: 1, to: 3, title: 'A' }])
    expect(b.map((x) => [x.from, x.to, x.title])).toEqual([[1, 3, 'A'], [4, 10, undefined], [11, 17, undefined]])
    expect(b[2].items.map((x) => x.nr)).toEqual([11, 12])
  })

  it('rozwiniety jest biezacy blok i bloki jeszcze zamkniete', () => {
    const items = [it_(1, '2026-01-01'), it_(2, '2026-01-02'), it_(3, '2026-01-03'), it_(4, '2026-01-04'), it_(5, '2026-01-05')]
    const b = eduBlocks(items, [{ from: 1, to: 2, title: 'A' }, { from: 3, to: 4, title: 'B' }, { from: 5, to: 6, title: 'C' }])
    // 4 stycznia: otwarte 1-4, biezacy blok B, blok C (piatka jutro) tez widoczny
    expect([...openByDefault(b, new Date('2026-01-04T10:00:00'))].sort()).toEqual([3, 5])
    expect([...openByDefault(b, new Date('2026-01-05T10:00:00'))]).toEqual([5])
  })
})
