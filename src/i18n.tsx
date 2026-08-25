import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadLangs, loadUi } from './content'
import type { LangMeta, Ui } from './types'

interface I18n {
  lang: string
  ui: Ui
  langMeta?: LangMeta
  t: (path: string, fallback?: string) => string
}
const Ctx = createContext<I18n | null>(null)

function pick(obj: Ui, path: string): string | undefined {
  return path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj)
}

export function I18nProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const [ui, setUi] = useState<Ui>({})
  const [langMeta, setLangMeta] = useState<LangMeta | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    setReady(false)
    Promise.all([loadUi(lang), loadLangs()])
      .then(([u, langs]) => {
        if (!alive) return
        setUi(u)
        const meta = langs.languages.find((l) => l.code === lang)
        setLangMeta(meta)
        document.documentElement.lang = lang
        document.documentElement.dir = meta?.dir || 'ltr'
        setReady(true)
      })
      .catch(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [lang])

  const t = (path: string, fallback = '') => pick(ui, path) ?? fallback ?? path
  if (!ready) return <div className="p-8 text-slate-400">…</div>
  return <Ctx.Provider value={{ lang, ui, langMeta, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n poza I18nProvider')
  return c
}
