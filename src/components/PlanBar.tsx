import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadReadingPlans } from '../content'
import { loadBibleIndex } from '../lib/bible'
import { BETA } from '../lib/beta'
import {
  chapterKey,
  formatChapters,
  getBarPlan,
  getUserPlan,
  markChapters,
  progress,
  schedule,
  setBarPlan,
  allChapters,
} from '../lib/readingPlans'
import type { BibleBookMeta, ReadingPlanDef } from '../types'

// Pasek planu czytania na stronie rozdzialu Biblii. Pojawia sie, gdy czytelnik
// otworzy rozdzial z planu: pokazuje rozdzialy tego dnia, pozwala odhaczyc
// przeczytany i przejsc do nastepnego fragmentu. X zamyka pasek (plan zostaje).

const CHAPTER = /\/biblia\/([^/]+)\/(\d+)\/?$/
const HEIGHT = '7.5rem'

export function PlanBar() {
  const { lang, t } = useI18n()
  const { pathname } = useLocation()
  const [, setTick] = useState(0)
  const [defs, setDefs] = useState<ReadingPlanDef[] | null>(null)
  const [books, setBooks] = useState<BibleBookMeta[] | null>(null)
  const refresh = () => setTick((n) => n + 1)

  const barId = BETA ? getBarPlan() : ''
  const m = pathname.match(CHAPTER)
  const up = barId ? getUserPlan(barId) : undefined
  const active = !!(m && up)

  useEffect(() => {
    if (!active || defs) return
    Promise.all([loadReadingPlans(lang), loadBibleIndex(lang, 'UBG')])
      .then(([f, idx]) => {
        setDefs(f.plans)
        setBooks(idx.books)
      })
      .catch(() => {})
  }, [active, defs, lang])

  useEffect(() => {
    window.addEventListener('zywe-slowo:synced', refresh)
    return () => window.removeEventListener('zywe-slowo:synced', refresh)
  }, [])

  const def = defs?.find((d) => d.id === up?.planId)
  const visible = !!(active && def && books)

  // przycisk szybkiej notatki podnosi sie nad pasek
  useEffect(() => {
    const root = document.documentElement
    if (visible) root.style.setProperty('--plan-bar-h', HEIGHT)
    else root.style.removeProperty('--plan-bar-h')
    return () => {
      root.style.removeProperty('--plan-bar-h')
    }
  }, [visible])

  if (!visible || !m || !up || !def || !books) return null

  const days = schedule(def, books, up)
  const done = new Set(up.done)
  const flat = days.flatMap((d) => d.chapters)
  const here = flat.findIndex((c) => c.osis === m[1] && c.ch === Number(m[2]))
  const st = progress(days, up.done, allChapters(def, books).length)
  const dayIndex = here >= 0 ? days.findIndex((d) => d.chapters.some((c) => c.osis === m[1] && c.ch === Number(m[2]))) : st.next
  const day = dayIndex >= 0 ? days[dayIndex] : null
  const prev = here > 0 ? flat[here - 1] : null
  const next = here >= 0 ? flat[here + 1] || null : null
  const link = (c: { osis: string; ch: number }) => `/${lang}/biblia/${c.osis}/${c.ch}`
  const planUrl = `/${lang}/biblia/plany/moje/${up.id}`

  function close() {
    setBarPlan('')
    refresh()
  }

  const nav = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand dark:border-slate-600 dark:text-slate-100 dark:hover:border-sky-300'

  return (
    <>
      <div aria-hidden style={{ height: HEIGHT }} />
      <div className="no-print fixed inset-x-0 z-30 px-2 bottom-[calc(4.4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-2">
            <Link to={planUrl} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white">
              {def.name}
            </Link>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{st.percent}%</span>
            <button type="button" onClick={close} aria-label={t('plans.barClose', 'Zamknij pasek planu')} className="shrink-0 rounded-md px-2 text-lg leading-none text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">×</button>
          </div>

          {day ? (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {day.chapters.map((c) => {
                const k = chapterKey(c)
                const cur = here >= 0 && k === chapterKey(flat[here])
                return (
                  <Link key={k} to={link(c)} aria-current={cur ? 'page' : undefined} className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cur ? 'border-brand bg-brand text-white dark:border-sky-400 dark:bg-sky-500' : done.has(k) ? 'border-slate-200 text-slate-400 line-through dark:border-slate-700' : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}>
                    {done.has(k) && !cur ? '✓ ' : ''}{formatChapters([c], books)}
                  </Link>
                )
              })}
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            {here >= 0 ? (
              <label className="flex flex-1 items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={done.has(chapterKey(flat[here]))}
                  onChange={(e) => { markChapters(up.id, [chapterKey(flat[here])], e.target.checked); refresh() }}
                />
                {t('plans.markRead', 'Przeczytane')}
              </label>
            ) : (
              <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">{t('plans.barOutside', 'Ten rozdział nie należy do planu.')}</span>
            )}
            {prev && <Link to={link(prev)} className={nav} aria-label={t('plans.barPrev', 'Wstecz')}>‹</Link>}
            {next ? (
              <Link
                to={link(next)}
                className={`${nav} border-brand bg-brand text-white hover:bg-brand/90 dark:border-sky-500 dark:bg-sky-500`}
              >
                {t('plans.barNext', 'Dalej')} › {formatChapters([next], books)}
              </Link>
            ) : here < 0 && day ? (
              <Link to={link(day.chapters.find((c) => !done.has(chapterKey(c))) || day.chapters[0])} className={nav}>{t('plans.next', 'Następne czytanie')} ›</Link>
            ) : (
              <Link to={planUrl} className={nav}>{t('plans.barBackToPlan', 'Plan')}</Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
