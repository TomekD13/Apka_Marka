import { beforeEach, describe, expect, it } from 'vitest'
import { importNotes, listNotes, saveNote } from './notes'
import { safePath } from './safePath'
import { clearSyncedLocal, getKeyMeta } from './syncMeta'
import { setRead } from './progress'

beforeEach(() => localStorage.clear())

describe('bezpieczenstwo danych czytelnika', () => {
  it('sciezka zrodla musi byc wewnatrz aplikacji', () => {
    expect(safePath('/pl/40-dni/3')).toBe('/pl/40-dni/3')
    for (const bad of ['javascript:alert(1)', 'https://evil.example/', '//evil.example', '/' + String.fromCharCode(92) + 'evil.example', 'data:text/html,x', '', null, 5])
      expect(safePath(bad), String(bad)).toBe('')
  })

  it('wczytana kopia z podstawionym zrodlem traci je, notatka zostaje', () => {
    importNotes(JSON.stringify({ notes: [
      { title: 'a', body: 'b', source: { label: 'Kliknij', path: 'javascript:alert(document.domain)' } },
      { title: 'c', body: 'd', source: { label: 'Dzień 3', path: '/pl/40-dni/3', quote: 'x' } },
    ] }))
    const notes = listNotes()
    expect(notes).toHaveLength(2)
    expect(notes.find((n) => n.title === 'a')!.source).toBeUndefined()
    expect(notes.find((n) => n.title === 'c')!.source).toEqual({ label: 'Dzień 3', path: '/pl/40-dni/3', quote: 'x' })
    expect(saveNote({ title: 'e', body: 'f', source: { label: 'z', path: 'https://evil.example' } })!.source).toBeUndefined()
  })

  it('czyszczenie urzadzenia usuwa listy z konta, a ustawienia zostawia', () => {
    saveNote({ title: 'moja', body: 'notatka' })
    setRead('edu', 4, true)
    localStorage.setItem('zywe-slowo:theme', 'dark')
    clearSyncedLocal()
    expect(listNotes()).toEqual([])
    expect(localStorage.getItem('zywe-slowo:read:v2')).toBeNull()
    expect(getKeyMeta('zywe-slowo:notes:v1')).toEqual({ s: {}, d: {} })
    expect(localStorage.getItem('zywe-slowo:theme')).toBe('dark')
  })
})
