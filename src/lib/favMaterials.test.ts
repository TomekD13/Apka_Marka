import { beforeEach, describe, expect, it } from 'vitest'
import { isFavMaterial, listFavMaterials, toggleFavMaterial } from './favMaterials'
import { isRead, listRead, setRead } from './progress'
import { getKeyMeta, isSyncedKey } from './syncMeta'

beforeEach(() => localStorage.clear())

describe('przeczytane i ulubione materialy', () => {
  it('stare znaczniki przeczytanego przechodza do nowej listy', () => {
    localStorage.setItem('zywe-slowo:read:v1', JSON.stringify({ 'pray40:3': '2026-09-01T00:00:00Z', 'edu:2': '2026-09-02T00:00:00Z' }))
    expect(isRead('pray40', 3)).toBe(true)
    expect(listRead('edu')).toEqual(new Set(['2']))
    expect(JSON.parse(localStorage.getItem('zywe-slowo:read:v2') || '[]')).toHaveLength(2)
  })

  it('przeczytane i ulubione jada z kontem', () => {
    expect(isSyncedKey('zywe-slowo:read:v2')).toBe(true)
    expect(isSyncedKey('zywe-slowo:fav-materials:v1')).toBe(true)
    setRead('group', 'PK-01', true)
    expect(Object.keys(getKeyMeta('zywe-slowo:read:v2').s)).toEqual(['group:PK-01'])
    setRead('group', 'PK-01', false)
    expect(Object.keys(getKeyMeta('zywe-slowo:read:v2').d)).toEqual(['group:PK-01'])
  })

  it('serduszko przelacza ulubiony materiał', () => {
    expect(toggleFavMaterial('study', 'nadzieja', 'Nadzieja', 's/nadzieja')).toBe(true)
    expect(isFavMaterial('study', 'nadzieja')).toBe(true)
    expect(listFavMaterials()[0]).toMatchObject({ id: 'study:nadzieja', path: 's/nadzieja' })
    expect(toggleFavMaterial('study', 'nadzieja', 'Nadzieja', 's/nadzieja')).toBe(false)
    expect(listFavMaterials()).toEqual([])
  })
})
