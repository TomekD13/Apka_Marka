import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { downloadModule, loadLangs } from '../content'
import { collapseAllBars } from './MenuBar'
import type { LangMeta } from '../types'

export function Header() {
  const { lang, t } = useI18n()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [dl, setDl] = useState<'idle' | 'busy' | 'done'>('idle')
  const [langs, setLangs] = useState<LangMeta[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // zamykanie rozwijanej listy języków: klik poza obszarem lub Escape
  useEffect(() => {
    if (!langOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLangOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  // przełącznik języków sterowany danymi: dodanie wpisu w langs.json wystarczy
  useEffect(() => { loadLangs().then((l) => setLangs(l.languages)).catch(() => {}) }, [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    if (q.trim()) nav(`/${lang}/search?q=${encodeURIComponent(q.trim())}`)
  }

  async function onDownload() {
    setDl('busy')
    try { await downloadModule(lang); setDl('done') } catch { setDl('idle') }
  }

  const dlLabel = dl === 'busy' ? t('home.downloading', 'Pobieranie…')
    : dl === 'done' ? t('home.offlineReady', 'Dostępne offline')
    : t('home.downloadOffline', 'Pobierz do trybu offline')

  return (
    <header className="no-print border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-3">
        <Link
          to={`/${lang}`}
          onClick={collapseAllBars}
          className="shrink-0 inline-flex items-center justify-center min-w-[9.1rem] sm:min-w-[10.5rem] rounded-lg bg-brand text-white px-3 sm:px-4 py-2 text-sm font-bold shadow-sm hover:bg-brand-light"
        >
          {t('nav.topics', 'Lista tematów')}
        </Link>
        {/* Desktop: pole zawsze widoczne. Komórka: lupa rozwijająca pole po kliknięciu. */}
        <form onSubmit={onSearch} className="hidden sm:block min-w-0">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('home.searchPlaceholder', 'Szukaj…')}
            aria-label={t('nav.search', 'Szukaj')}
            className="w-full max-w-[12rem] rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-1.5 text-sm"
          />
        </form>
        <div className={`sm:hidden ${searchOpen ? 'flex-1 min-w-0' : ''}`}>
          {searchOpen ? (
            <form onSubmit={onSearch}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => { if (!q.trim()) setSearchOpen(false) }}
                autoFocus
                placeholder={t('home.searchPlaceholder', 'Szukaj…')}
                aria-label={t('nav.search', 'Szukaj')}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-1.5 text-sm"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t('nav.search', 'Szukaj')}
              title={t('nav.search', 'Szukaj')}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 p-1.5 text-slate-500 hover:text-brand"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2 text-sm shrink-0">
          <button
            onClick={onDownload}
            disabled={dl !== 'idle'}
            title={dlLabel}
            aria-label={dlLabel}
            className="inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-auto sm:gap-1 rounded-md border border-slate-300 dark:border-slate-600 sm:border-brand text-slate-500 sm:text-brand-light px-0 sm:px-2.5 text-xs hover:bg-brand/10 disabled:opacity-60"
          >
            <span aria-hidden>{dl === 'done' ? '✓' : '↓'}</span>
            <span className="hidden sm:inline">{dlLabel}</span>
          </button>
          <Link
            to={`/${lang}/konto`}
            title={t('nav.signIn', 'Zaloguj')}
            aria-label={t('nav.signIn', 'Zaloguj')}
            className="inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-auto sm:gap-1 rounded-md border border-slate-300 dark:border-slate-600 sm:border-brand px-0 sm:px-2.5 text-xs text-slate-500 sm:text-brand-light hover:bg-brand/10"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3.5 17a6.5 6.5 0 1113 0 .75.75 0 01-.75.75H4.25A.75.75 0 013.5 17z" />
            </svg>
            <span className="hidden sm:inline">{t('nav.signIn', 'Zaloguj')}</span>
          </Link>
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={t('home.language', 'Język')}
              title={t('home.language', 'Język')}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-2 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="sm:hidden">{lang.toUpperCase()}</span>
              <span className="hidden sm:inline">{langs.find((l) => l.code === lang)?.name ?? lang.toUpperCase()}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70" aria-hidden>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </button>
            {langOpen && (
              <ul
                role="listbox"
                className="absolute right-0 z-20 mt-1 max-h-72 w-44 overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg"
              >
                {langs.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={l.code === lang}
                      onClick={() => { setLangOpen(false); nav(`/${l.code}`) }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${l.code === lang ? 'font-semibold text-brand' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <span className="w-6 shrink-0 text-xs uppercase text-slate-400">{l.code}</span>
                      <span>{l.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            to={`/${lang}/about`}
            title={t('nav.about')}
            aria-label={t('nav.about')}
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-auto rounded-lg bg-brand text-white px-0 sm:px-2.5 text-sm font-bold shadow-sm hover:bg-brand-light"
          >
            ?
          </Link>
        </nav>
      </div>
    </header>
  )
}
