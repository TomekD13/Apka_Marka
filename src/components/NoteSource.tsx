import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadBibleIndex, parseRef } from '../lib/bible'
import { safePath } from '../lib/safePath'
import type { NoteSource as Source } from '../types'

// „Zrodlo” notatki zamiast recznie wpisywanego odnosnika: klikalne miejsce, z ktorego
// notatka powstala. Material -> ta sama strona i przewiniecie do cytatu,
// werset -> rozdzial Biblii. Stara notatka z samym odnosnikiem -> rozdzial z odnosnika.

export function NoteSource({ source: raw, refText }: { source?: Source; refText?: string }) {
  // dane z synchronizacji albo starej kopii - sciezka musi byc wewnetrzna
  const source = raw && safePath(raw.path) ? raw : undefined
  const { lang, t } = useI18n()
  const [bibleLink, setBibleLink] = useState('')

  useEffect(() => {
    if (source || !refText) return
    loadBibleIndex(lang, 'UBG')
      .then((idx) => {
        const r = parseRef(refText, idx.books)
        if (r) setBibleLink(`/${lang}/biblia/${r.book.osis}/${r.chapter}`)
      })
      .catch(() => {})
  }, [source, refText, lang])

  const box = 'mb-4 flex items-center gap-3 rounded-xl border px-3 py-2.5'
  const label = <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('notes.sourceLabel', 'Źródło')}</span>

  if (source || bibleLink) {
    const to = source?.path || bibleLink
    return (
      <Link to={to} state={source?.quote ? { highlight: source.quote } : undefined} className={`${box} border-brand/40 bg-brand/5 hover:border-brand dark:border-sky-300/40 dark:bg-sky-300/5`}>
        {label}
        <span className="min-w-0 flex-1 truncate font-semibold text-brand dark:text-sky-300">{source?.label || refText}</span>
        <span className="text-xl text-brand dark:text-sky-300" aria-hidden>›</span>
      </Link>
    )
  }
  return (
    <div className={`${box} border-slate-300 dark:border-slate-600`}>
      {label}
      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{refText || t('notes.sourceOwn', 'notatka własna')}</span>
    </div>
  )
}

/** Po wejsciu ze „Zrodla” notatki: przewija do akapitu z cytatem i na chwile go podswietla. */
export function HighlightOnArrival() {
  const location = useLocation()
  const quote = (location.state as { highlight?: string } | null)?.highlight

  useEffect(() => {
    if (!quote) return
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
    const needle = norm(quote).slice(0, 40)
    let tries = 0
    // tresc doczytuje sie z sieci - probujemy przez kilka sekund
    const timer = setInterval(() => {
      tries++
      const main = document.querySelector('main')
      const hits = main ? [...main.querySelectorAll<HTMLElement>('p, li, blockquote, h2, h3, td')].filter((el) => norm(el.textContent || '').includes(needle)) : []
      if (hits.length || tries > 25) clearInterval(timer)
      const el = hits[0]
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.add('note-flash')
      setTimeout(() => el.classList.remove('note-flash'), 3500)
    }, 200)
    return () => clearInterval(timer)
  }, [quote, location.key])

  return null
}
