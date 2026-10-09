import { describe, expect, it } from 'vitest'
import { fixLangPath } from './langPath'

describe('adres bez kodu jezyka', () => {
  const sections = ['biblia', 'edukacja', '40-dni', 'grupy-nadziei', 's', 'c']
  const fix = (p: string) => fixLangPath(p, ['pl'], 'pl', sections)

  it('znany jezyk zostaje bez zmian', () => {
    expect(fix('/pl')).toBeNull()
    expect(fix('/pl/edukacja')).toBeNull()
    expect(fix('/')).toBeNull()
  })
  it('sama nazwa dzialu dostaje /pl', () => {
    expect(fix('/edukacja')).toBe('/pl/edukacja')
    expect(fix('/edukacja/')).toBe('/pl/edukacja/')
    expect(fix('/40-dni')).toBe('/pl/40-dni')
  })
  it('dzial z numerem albo rozdzialem dostaje /pl', () => {
    expect(fix('/edukacja/3')).toBe('/pl/edukacja/3')
    expect(fix('/biblia/Gen/1')).toBe('/pl/biblia/Gen/1')
    expect(fix('/s/abc')).toBe('/pl/s/abc')
  })
  it('podwojony dzial z menu (/edukacja/edukacja) wraca do dzialu', () => {
    expect(fix('/edukacja/edukacja')).toBe('/pl/edukacja')
    expect(fix('/edukacja/biblia')).toBe('/pl/biblia')
  })
  it('nieznany kod jezyka zamieniamy na domyslny', () => {
    expect(fix('/en')).toBe('/pl/')
    expect(fix('/en/biblia/Gen/1')).toBe('/pl/biblia/Gen/1')
  })
})
