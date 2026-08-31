import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBibleBook, loadBibleIndex } from './bible'

const bgArchive = readFileSync('public/content/pl/bible/BG.bbl.mybible.zip')
const ubgIndex = readFileSync('public/content/pl/bible/UBG/index.json', 'utf8')

describe('wbudowana Biblia Gdańska 1881', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('otwiera lokalny moduł bez ręcznego pobierania', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('/content/pl/bible/BG.bbl.mybible.zip')) {
        const bytes = bgArchive.buffer.slice(bgArchive.byteOffset, bgArchive.byteOffset + bgArchive.byteLength) as ArrayBuffer
        return Promise.resolve(new Response(bytes))
      }
      if (url.endsWith('/content/pl/bible/UBG/index.json')) {
        return Promise.resolve(new Response(ubgIndex, { headers: { 'content-type': 'application/json' } }))
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }))

    const index = await loadBibleIndex('pl', 'BG')
    const genesis = await loadBibleBook('pl', 'BG', 'Gen')

    expect(index.translation).toBe('BG')
    expect(index.books).toHaveLength(66)
    expect(genesis[0][0]).not.toBe('')
  })
})
