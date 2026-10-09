import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { loadLangs, loadUi } from './content'
import { fixLangPath } from './lib/langPath'
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

export function I18nProvider({ lang, sections, children }: { lang: string; sections: string[]; children: ReactNode }) {
  const location = useLocation()
  const [ui, setUi] = useState<Ui>({})
  const [langMeta, setLangMeta] = useState<LangMeta | undefined>()
  const [ready, setReady] = useState(false)
  // przekierowanie pamieta, dla jakiego jezyka powstalo - po zmianie adresu juz nie dziala
  const [redirect, setRedirect] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    let alive = true
    setReady(false)
    setRedirect(null)
    // napisy pobieramy od razu, rownolegle z lista jezykow; przy adresie bez kodu
    // jezyka (/edukacja) ich blad nas nie obchodzi - przekierowujemy
    const uiReady = loadUi(lang)
    uiReady.catch(() => {})
    loadLangs()
      .then((langs) => {
        const meta = langs.languages.find((l) => l.code === lang)
        const fallback = langs.default || langs.languages[0]?.code
        const to = !meta && fallback ? fixLangPath(location.pathname, langs.languages.map((l) => l.code), fallback, sections) : null
        if (to) {
          if (alive) setRedirect({ from: lang, to: to + location.search + location.hash })
          return
        }
        return uiReady.then((u) => {
          if (!alive) return
          setUi(u)
          setLangMeta(meta)
          document.documentElement.lang = lang
          document.documentElement.dir = meta?.dir || 'ltr'
          setReady(true)
        })
      })
      .catch(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [lang])

  const t = (path: string, fallback = '') => pick(ui, path) ?? fallback ?? path
  if (redirect?.from === lang) return <Navigate to={redirect.to} replace />
  if (!ready) return <div className="p-8 text-slate-400">…</div>
  return <Ctx.Provider value={{ lang, ui, langMeta, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n poza I18nProvider')
  return c
}
