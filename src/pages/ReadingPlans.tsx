import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { useSetPlace } from '../place'
import { loadReadingPlans } from '../content'
import { loadBibleIndex } from '../lib/bible'
import {
  allChapters,
  chapterKey,
  formatChapters,
  getUserPlan,
  listUserPlans,
  markChapters,
  progress,
  readingDates,
  recalcPlan,
  removePlan,
  schedule,
  startPlan,
  today,
  type PlanDay,
  type UserPlan,
} from '../lib/readingPlans'
import type { BibleBookMeta, ReadingPlanDef } from '../types'

// Plany czytania Biblii (na razie tylko beta - BETA w lib/beta.ts).
// Najpierw wybor planu, potem parametry: start, dlugosc, dni tygodnia.
// Tempo mozna zmienic w kazdej chwili - przeczytane zostaje, reszta sie przelicza.

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60'
const btnMain = `${btn} bg-brand text-white hover:bg-brand/90 dark:bg-sky-500 dark:hover:bg-sky-400`
const btnLine = `${btn} border border-slate-300 text-slate-700 hover:border-brand dark:border-slate-600 dark:text-slate-100 dark:hover:border-sky-300`
const chip = (on: boolean) =>
  `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand/10 text-brand dark:border-sky-300 dark:bg-sky-300/10 dark:text-sky-200' : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300'}`

/** Definicje planow i ksiegi (liczby wersetow) - jedno wczytanie na strone. */
function usePlanData(lang: string) {
  const [defs, setDefs] = useState<ReadingPlanDef[] | null>(null)
  const [books, setBooks] = useState<BibleBookMeta[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    Promise.all([loadReadingPlans(lang), loadBibleIndex(lang, 'UBG')])
      .then(([f, idx]) => {
        setDefs(f.plans)
        setBooks(idx.books)
      })
      .catch(() => setFailed(true))
  }, [lang])
  return { defs, books, failed }
}

function useDateLabel() {
  const { lang } = useI18n()
  return (iso: string, long = false) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(lang, long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' })
  }
}

function Status({ failed }: { failed: boolean }) {
  const { t } = useI18n()
  return <p className="mt-6 text-slate-500 dark:text-slate-400">{failed ? t('plans.unavailable', 'Plany są chwilowo niedostępne.') : t('common.loading', 'Wczytywanie…')}</p>
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div className="h-full rounded-full bg-brand dark:bg-sky-400" style={{ width: `${percent}%` }} />
    </div>
  )
}

// --- lista: moje plany + katalog ------------------------------------------------

export function ReadingPlansPage() {
  const { lang, t } = useI18n()
  useSetPlace(t('plans.title', 'Plany czytania'))
  const { defs, books, failed } = usePlanData(lang)
  const mine = listUserPlans()

  return (
    <section className="mx-auto max-w-xl">
      <BackLink to={`/${lang}/biblia`} className="mb-4">{t('bible.title', 'Biblia')}</BackLink>
      <PageHeading icon="book" title={t('plans.title', 'Plany czytania')} />
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t('plans.intro', '')}</p>

      {!defs || !books ? (
        <Status failed={failed} />
      ) : (
        <>
          {mine.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('plans.mine', 'Moje plany')}</h2>
              {mine.map((p) => {
                const def = defs.find((d) => d.id === p.planId)
                if (!def) return null
                const days = schedule(def, books, p)
                const st = progress(days, p.done, allChapters(def, books).length)
                return (
                  <Link key={p.id} to={`/${lang}/biblia/plany/moje/${p.id}`} className={`${card} block hover:border-brand dark:hover:border-sky-300`}>
                    <span className="block font-semibold text-slate-900 dark:text-white">{def.name}</span>
                    <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                      {st.finished
                        ? t('plans.finished', 'Plan ukończony.')
                        : `${t('plans.next', 'Następne czytanie')}: ${formatChapters(days[st.next].chapters, books)}`}
                    </span>
                    {st.behind > 0 && <span className="mt-1 block text-sm text-amber-700 dark:text-amber-300">{t('plans.behindShort', 'Zaległe dni')}: {st.behind}</span>}
                    <span className="mt-2 block"><Bar percent={st.percent} /></span>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('plans.choose', 'Wybierz plan')}</h2>
            {defs.map((def) => {
              const n = allChapters(def, books).length
              return (
                <Link key={def.id} to={`/${lang}/biblia/plany/nowy/${def.id}`} className={`${card} flex items-center gap-3 hover:border-brand dark:hover:border-sky-300`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900 dark:text-white">{def.name}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-300">{def.desc}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{n} {t('plans.chapters', 'rozdziałów')}</span>
                  </span>
                  <span className="text-xl text-brand dark:text-sky-300" aria-hidden>›</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

// --- parametry: nowy plan albo nowe tempo -------------------------------------

const PRESETS: [number, string, string][] = [
  [30, 'plans.p1m', '1 miesiąc'],
  [90, 'plans.p3m', '3 miesiące'],
  [182, 'plans.p6m', '6 miesięcy'],
  [365, 'plans.p1y', '1 rok'],
  [730, 'plans.p2y', '2 lata'],
]
// poniedzialek na poczatku tygodnia, jak w polskim kalendarzu
const WEEK: [number, string, string][] = [
  [1, 'plans.mon', 'Pn'], [2, 'plans.tue', 'Wt'], [3, 'plans.wed', 'Śr'], [4, 'plans.thu', 'Cz'],
  [5, 'plans.fri', 'Pt'], [6, 'plans.sat', 'Sb'], [0, 'plans.sun', 'Nd'],
]

export function ReadingPlanSetup() {
  const { lang, t } = useI18n()
  const { planId = '' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const dateLabel = useDateLabel()
  const { defs, books, failed } = usePlanData(lang)
  const existing = search.get('zmien') ? getUserPlan(search.get('zmien') || '') : undefined
  const def = defs?.find((d) => d.id === (existing?.planId || planId))
  useSetPlace(def?.name || t('plans.title', 'Plany czytania'))

  const [start, setStart] = useState(today())
  const [span, setSpan] = useState<number | null>(null)
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays.length ? existing.weekdays : [0, 1, 2, 3, 4, 5, 6])
  const days = span ?? def?.days ?? 365

  const base = existing ? existing.done : []
  const plan = useMemo(
    () => (def && books ? schedule(def, books, { start, span: days, weekdays, base }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, books, start, days, weekdays.join(), existing?.id]
  )

  if (!def || !books || !plan) {
    return (
      <section className="mx-auto max-w-xl">
        <BackLink to={`/${lang}/biblia/plany`} className="mb-4">{t('plans.title', 'Plany czytania')}</BackLink>
        {defs && books ? <p className="text-slate-500">{t('plans.notFound', 'Nie ma takiego planu.')}</p> : <Status failed={failed} />}
      </section>
    )
  }

  const left = plan.reduce((s, d) => s + d.chapters.length, 0)
  const readingDays = plan.length
  const perDay = readingDays ? left / readingDays : 0
  const verses = plan.reduce((s, d) => s + d.chapters.reduce((a, c) => a + c.w, 0), 0)
  const allDates = readingDates(start, days, weekdays)
  const end = allDates[allDates.length - 1] || start

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? (w.length > 1 ? w.filter((x) => x !== d) : w) : [...w, d].sort()))
  }

  function save() {
    if (!def) return
    if (existing) {
      recalcPlan(existing.id, start, days, weekdays)
      navigate(`/${lang}/biblia/plany/moje/${existing.id}`, { replace: true })
    } else {
      const p = startPlan(def.id, start, days, weekdays)
      if (p) navigate(`/${lang}/biblia/plany/moje/${p.id}`, { replace: true })
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <BackLink to={existing ? `/${lang}/biblia/plany/moje/${existing.id}` : `/${lang}/biblia/plany`} className="mb-4">
        {existing ? def.name : t('plans.title', 'Plany czytania')}
      </BackLink>
      <PageHeading icon="book" eyebrow={existing ? t('plans.recalcTitle', 'Nowe tempo') : t('plans.setupTitle', 'Ustaw swój plan')} title={def.name} />
      <p className="mt-3 text-slate-600 dark:text-slate-300">{existing ? t('plans.recalcIntro', 'To, co już przeczytane, zostaje. Pozostałe rozdziały rozłożą się od nowa.') : def.desc}</p>

      <div className={`${card} mt-5 space-y-5`}>
        <div>
          <p className="mb-2 font-semibold text-slate-900 dark:text-white">{t('plans.howLong', 'W jakim czasie?')}</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([n, key, label]) => (
              <button key={n} type="button" onClick={() => setSpan(n)} className={chip(days === n)}>{t(key, label)}</button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            {t('plans.customDays', 'albo liczba dni:')}
            <input type="number" min={1} max={3650} value={days} onChange={(e) => setSpan(Math.max(1, Math.min(3650, Number(e.target.value) || 1)))} className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" />
          </label>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900 dark:text-white">{t('plans.whichDays', 'W które dni czytasz?')}</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map(([d, key, label]) => (
              <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={weekdays.includes(d)} className={chip(weekdays.includes(d))}>{t(key, label)}</button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block font-semibold text-slate-900 dark:text-white">{existing ? t('plans.fromWhen', 'Od kiedy nowe tempo?') : t('plans.startDate', 'Początek')}</span>
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm text-slate-700 dark:border-sky-300/30 dark:bg-sky-300/5 dark:text-slate-200">
        <p>{t('plans.sumDays', 'Dni czytania')}: <strong>{readingDays}</strong> · {t('plans.sumEnd', 'koniec')}: <strong>{dateLabel(end, true)}</strong></p>
        <p className="mt-1">
          {t('plans.sumPerDay', 'Średnio dziennie')}: <strong>{perDay.toLocaleString(lang, { maximumFractionDigits: 1 })}</strong> {t('plans.chaptersShort', 'rozdz.')}
          {' '}({Math.round(verses / Math.max(1, readingDays))} {t('plans.versesShort', 'wersetów')})
        </p>
        {perDay < 1 && <p className="mt-1 text-slate-500 dark:text-slate-400">{t('plans.sparse', 'Rozdziałów jest mniej niż dni – w niektóre dni nie będzie czytania.')}</p>}
        <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
          {plan.filter((d) => d.chapters.length).slice(0, 3).map((d) => (
            <li key={d.date}><span className="text-slate-500 dark:text-slate-400">{dateLabel(d.date)}:</span> {formatChapters(d.chapters, books)}</li>
          ))}
          <li className="text-slate-400">…</li>
        </ul>
      </div>

      <button type="button" onClick={save} disabled={!left} className={`${btnMain} mt-5 w-full`}>
        {existing ? t('plans.saveRecalc', 'Zapisz nowe tempo') : t('plans.start', 'Rozpocznij plan')}
      </button>
    </section>
  )
}

// --- moj plan -------------------------------------------------------------------

function ChapterRow({ planId, c, books, done, onChange }: { planId: string; c: PlanDay['chapters'][number]; books: BibleBookMeta[]; done: boolean; onChange: () => void }) {
  const { lang, t } = useI18n()
  return (
    <li className="flex items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => { markChapters(planId, [chapterKey(c)], e.target.checked); onChange() }}
        aria-label={t('plans.markRead', 'Przeczytane')}
        className="h-5 w-5"
      />
      <Link to={`/${lang}/biblia/${c.osis}/${c.ch}`} className={`flex-1 font-medium ${done ? 'text-slate-400 line-through' : 'text-brand hover:underline dark:text-sky-300'}`}>
        {formatChapters([c], books)}
      </Link>
    </li>
  )
}

export function ReadingPlanView() {
  const { lang, t } = useI18n()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dateLabel = useDateLabel()
  const { defs, books, failed } = usePlanData(lang)
  const [, setTick] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const refresh = () => setTick((n) => n + 1)
  const p: UserPlan | undefined = getUserPlan(id)
  const def = defs?.find((d) => d.id === p?.planId)
  useSetPlace(def?.name || t('plans.title', 'Plany czytania'))

  // zmiana z innego urzadzenia (konto) - przelicz widok
  useEffect(() => {
    window.addEventListener('zywe-slowo:synced', refresh)
    return () => window.removeEventListener('zywe-slowo:synced', refresh)
  }, [])

  if (!p || !def || !books) {
    return (
      <section className="mx-auto max-w-xl">
        <BackLink to={`/${lang}/biblia/plany`} className="mb-4">{t('plans.title', 'Plany czytania')}</BackLink>
        {defs && books ? <p className="text-slate-500">{t('plans.notFound', 'Nie ma takiego planu.')}</p> : <Status failed={failed} />}
      </section>
    )
  }

  const days = schedule(def, books, p)
  const st = progress(days, p.done, allChapters(def, books).length)
  const doneSet = new Set(p.done)
  const current = st.finished ? null : days[st.next]

  function markDay(d: PlanDay, on: boolean) {
    markChapters(p!.id, d.chapters.map(chapterKey), on)
    refresh()
  }

  function remove() {
    if (!window.confirm(t('plans.removeConfirm', 'Usunąć ten plan razem z zaznaczonymi postępami?'))) return
    removePlan(p!.id)
    navigate(`/${lang}/biblia/plany`, { replace: true })
  }

  return (
    <section className="mx-auto max-w-xl">
      <BackLink to={`/${lang}/biblia/plany`} className="mb-4">{t('plans.title', 'Plany czytania')}</BackLink>
      <PageHeading icon="book" eyebrow={t('plans.title', 'Plany czytania')} title={def.name} />

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>{t('plans.progress', 'Przeczytane')}: {st.percent}%</span>
          <span>{t('plans.endsOn', 'Koniec')}: {dateLabel(days[days.length - 1]?.date || p.start)}</span>
        </div>
        <Bar percent={st.percent} />
      </div>

      {st.behind > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100">
          <p>{t('plans.behind', 'Zaległe dni czytania')}: <strong>{st.behind}</strong>. {t('plans.behindHint', 'Możesz nadrobić albo przeliczyć plan od dziś – nic z przeczytanego nie przepadnie.')}</p>
          <Link to={`/${lang}/biblia/plany/nowy/${def.id}?zmien=${p.id}`} className="mt-2 inline-block font-semibold underline">{t('plans.recalcNow', 'Przelicz od dziś')}</Link>
        </div>
      )}

      {current ? (
        <div className={`${card} mt-4`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {current.date === today() ? t('plans.today', 'Dzisiaj') : current.date < today() ? t('plans.overdue', 'Do nadrobienia') : t('plans.upcoming', 'Następne czytanie')} · {dateLabel(current.date)}
          </p>
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {current.chapters.map((c) => (
              <ChapterRow key={chapterKey(c)} planId={p.id} c={c} books={books} done={doneSet.has(chapterKey(c))} onChange={refresh} />
            ))}
          </ul>
          <button type="button" onClick={() => markDay(current, true)} className={`${btnMain} mt-3`}>{t('plans.markDay', 'Przeczytane – cały dzień')}</button>
        </div>
      ) : (
        <p className={`${card} mt-4 font-semibold text-slate-900 dark:text-white`}>{t('plans.finishedLong', 'Plan ukończony. Chwała Bogu za każdy przeczytany rozdział!')}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowAll(!showAll)} className={btnLine}>{showAll ? t('plans.hideAll', 'Ukryj harmonogram') : t('plans.showAll', 'Cały harmonogram')}</button>
        <Link to={`/${lang}/biblia/plany/nowy/${def.id}?zmien=${p.id}`} className={btnLine}>{t('plans.recalc', 'Zmień tempo')}</Link>
        <button type="button" onClick={remove} className={`${btn} border border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300`}>{t('plans.remove', 'Usuń plan')}</button>
      </div>

      {showAll && (
        <ol className="mt-4 space-y-1">
          {days.map((d, i) => {
            if (!d.chapters.length) return null
            const done = st.isDone(d)
            return (
              <li key={d.date} className={`flex items-start gap-3 rounded-lg px-2 py-1.5 ${i === st.todayIndex ? 'bg-brand/10 dark:bg-sky-300/10' : ''}`}>
                <input type="checkbox" checked={done} onChange={(e) => markDay(d, e.target.checked)} aria-label={t('plans.markRead', 'Przeczytane')} className="mt-0.5 h-5 w-5" />
                <span className="w-28 shrink-0 text-sm text-slate-500 dark:text-slate-400">{dateLabel(d.date)}</span>
                <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{formatChapters(d.chapters, books)}</span>
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">{t('plans.reminderSoon', 'Przypomnienia o czytaniu pojawią się razem z kontem.')}</p>
    </section>
  )
}
