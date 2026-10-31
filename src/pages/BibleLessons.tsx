import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSetPlace } from '../place'
import { loadSabbathExtra } from '../content'
import { currentExtraId, fallbackUrl, findCurrentLesson, type CurrentLesson } from '../lib/sabbathSchool'
import { AppIcon } from '../components/AppNavigation'
import { BackLink } from '../components/BackLink'
import { FontScale } from '../components/FontScale'
import { PageHeading } from '../components/PageHeading'
import type { SabbathExtra, SabbathExtraItem } from '../types'

// Hash, pod ktorym blok „Materialy dodatkowe” jest od razu rozwiniety -
// powrot ze strony tematu nie zwija listy, z ktorej czytelnik przyszedl.
const EXTRA_HASH = '#materialy'

function useSabbathExtra() {
  const { lang } = useI18n()
  const [data, setData] = useState<SabbathExtra | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setData(null)
    setFailed(false)
    loadSabbathExtra(lang).then(setData).catch(() => setFailed(true))
  }, [lang])
  return { data, failed }
}

export function BibleLessons() {
  const { lang, t } = useI18n()
  const [lesson, setLesson] = useState<CurrentLesson | null>(null)

  useEffect(() => {
    let alive = true
    findCurrentLesson(lang).then((value) => alive && setLesson(value)).catch(() => alive && setLesson(null))
    return () => { alive = false }
  }, [lang])

  return <section className="mx-auto max-w-xl">
    <BackLink to={`/${lang}/biblia`} className="mb-4">Biblia</BackLink>
    <PageHeading icon="lesson" title={t('sabbathSchool.title', 'Szkoła Biblijna')} />
    <p className="mt-3 text-slate-600 dark:text-slate-300">{t('sabbathSchool.intro', 'Bieżąca lekcja wraz z materiałami do studium.')}</p>
    <article className="gradient-panel mt-6 rounded-2xl border p-5">
      {/* kwartal // tydzien z datami // temat dnia (decyzja autora 2026-10-16) */}
      <p className="text-sm font-semibold text-brand dark:text-sky-300">{lesson?.quarterTitle || t('home.sabbathTitle', 'Bieżąca lekcja')}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{lesson?.lessonTitle || t('home.sabbathTitle', 'Bieżąca lekcja')}</h2>
      {lesson?.weekRange && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{lesson.weekRange}</p>}
      {lesson?.dayTitle && (
        <p className="mt-3 text-slate-700 dark:text-slate-200">
          <span className="font-semibold">{t('sabbathSchool.today', 'Dzisiaj')}:</span> {lesson.dayTitle}
        </p>
      )}
      <a href={lesson?.url || fallbackUrl(lang)} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light dark:bg-sky-300 dark:text-slate-950">{t('home.openLesson', 'Otwórz lekcję')} <span className="ml-1" aria-hidden>↗</span></a>
    </article>
    <ExtraBlock />
  </section>
}

/** „Materiały dodatkowe” - zwinięty kafelek; po rozwinięciu wszystkie tematy kwartału, bieżący podświetlony. */
function ExtraBlock() {
  const { lang, t } = useI18n()
  const { hash } = useLocation()
  const { data } = useSabbathExtra()
  const [open, setOpen] = useState(hash === EXTRA_HASH)
  const [thread, setThread] = useState<string | null>(null)

  // bez pliku dla tego jezyka bloku po prostu nie ma
  if (!data?.items.length) return null

  const current = currentExtraId(data.items)
  const picked = data.threads.find((th) => th.id === thread)
  const items = picked ? data.items.filter((it) => it.no !== undefined && picked.lessons.includes(it.no)) : data.items

  return <section id="materialy" className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="gradient-panel flex w-full items-center gap-3 p-4 text-left transition hover:border-brand/60 dark:hover:border-sky-300/60">
      <span className="rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-slate-900 dark:text-white">{t('sabbathSchool.extra', 'Materiały dodatkowe')}</span>
        <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{data.title}{data.subtitle ? ` · ${data.subtitle}` : ''}</span>
      </span>
      <span className={`text-xl text-brand transition-transform dark:text-sky-300 ${open ? 'rotate-90' : ''}`} aria-hidden>›</span>
    </button>
    {open && <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
      {data.lead && <p className="px-1 pb-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.lead}</p>}
      {data.threads.length > 0 && <div className="flex flex-wrap gap-1.5 px-1 pb-1" role="group" aria-label={t('sabbathSchool.threads', 'Wątki kwartału')}>
        {data.threads.map((th) => {
          const on = th.id === thread
          return <button key={th.id} type="button" aria-pressed={on} onClick={() => setThread(on ? null : th.id)} className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-brand bg-brand/15 font-semibold text-brand dark:border-sky-300 dark:text-sky-300' : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{th.title}</button>
        })}
      </div>}
      {items.map((it) => {
        const now = it.id === current
        return <Link key={it.id} to={`/${lang}/lekcje-biblijne/${data.quarter}/${it.id}`} viewTransition aria-current={now ? 'true' : undefined} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm dark:text-white ${now ? 'border-brand bg-brand/10 ring-1 ring-brand dark:border-sky-300 dark:bg-sky-400/10 dark:ring-sky-300' : 'gradient-panel border-slate-200 dark:border-slate-700'}`}>
          <span className="w-8 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{it.no ?? '★'}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">{it.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{it.no === undefined ? it.label : it.range}</span>
          </span>
          {now && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[0.7rem] font-semibold text-white dark:bg-sky-300 dark:text-slate-950">{t('sabbathSchool.thisWeek', 'Na ten tydzień')}</span>}
        </Link>
      })}
    </div>}
  </section>
}

/** Dzisiejszy dzien lekcji (0 = sobota rozpoczynajaca tydzien) albo -1 poza jej tygodniem. */
function todayIndex(start: string | undefined, count: number, now = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start || '')
  if (!m) return -1
  const diff = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400000)
  return diff >= 0 && diff < count ? diff : -1
}

const H2 = 'border-b border-slate-200 pb-1 text-[1.15em] font-semibold text-brand dark:border-slate-700 dark:text-brand-light'

function VerseBox({ verse }: { verse: { text: string; ref: string } }) {
  const { t } = useI18n()
  return <blockquote className="mt-4 rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 dark:bg-sky-400/10">
    <p className="text-[0.7em] font-bold uppercase tracking-wide text-brand dark:text-sky-300">{t('sabbathSchool.verse', 'Werset przewodni')}</p>
    <p className="mt-1 text-[1.05em] font-medium leading-relaxed">„{verse.text}”</p>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{verse.ref}</p>
  </blockquote>
}

function Questions({ items }: { items: string[] }) {
  const { t } = useI18n()
  if (!items.length) return null
  return <section className="mt-8">
    <h2 className={H2}>{t('sabbathSchool.questions', 'Pytania do rozmowy')}</h2>
    <ol className="mt-3 space-y-3">{items.map((q, i) => <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <span className="shrink-0 font-semibold tabular-nums text-brand dark:text-sky-300">{i + 1}.</span>
      <span className="leading-relaxed">{q}</span>
    </li>)}</ol>
  </section>
}

/** Podsumowanie jako zwykly tekst, ciekawostki w osobnych kartach - jak w wydruku lekcji. */
function Sections({ items }: { items: { label: string; text: string }[] }) {
  return <>{items.map((s, i) => s.label === 'Ciekawostka'
    ? <aside key={i} className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-slate-800">
        <p className="text-[0.7em] font-bold uppercase tracking-wide text-amber-800">{s.label}</p>
        {s.text.split('\n\n').map((p, j) => <p key={j} className="mt-1.5 leading-relaxed">{p}</p>)}
      </aside>
    : <section key={i} className="mt-8">
        <h2 className={H2}>{s.label}</h2>
        {s.text.split('\n\n').map((p, j) => <p key={j} className="mt-3 leading-relaxed">{p}</p>)}
      </section>)}</>
}

/** Lekcja dzien po dniu: przelacznik dni (dzisiejszy podswietlony i otwarty na start) i tresc wybranego dnia. */
function LessonDays({ item }: { item: SabbathExtraItem }) {
  const { t } = useI18n()
  const days = item.days ?? []
  const today = todayIndex(item.start, days.length)
  const [pick, setPick] = useState(today >= 0 ? today : 0)
  const day = days[pick]
  if (!day) return null
  const go = (i: number) => {
    setPick(i)
    document.getElementById('dzien')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <>
    <nav id="dzien" className="no-print mt-5 flex scroll-mt-20 flex-wrap gap-1.5" aria-label={t('sabbathSchool.days', 'Dni lekcji')}>
      {days.map((d, i) => {
        const on = i === pick
        const now = i === today
        return <button key={i} type="button" onClick={() => setPick(i)} aria-pressed={on} aria-current={now ? 'date' : undefined}
          className={`rounded-full border px-3 py-1 text-sm transition ${on ? 'border-brand bg-brand font-semibold text-white dark:border-sky-300 dark:bg-sky-300 dark:text-slate-950' : now ? 'border-brand text-brand ring-1 ring-brand dark:border-sky-300 dark:text-sky-300 dark:ring-sky-300' : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          {d.when.split(/[ ,]/)[0]}
        </button>
      })}
    </nav>

    <section className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-sky-300">{day.when}{day.kind ? ` · ${day.kind}` : ''}</p>
      <h2 className="mt-1 text-[1.3em] font-bold leading-tight">{day.title}</h2>
      {pick === today && <p className="mt-2"><span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-sky-300 dark:text-slate-950">{t('sabbathSchool.today', 'Dzisiaj')}</span></p>}
      {day.texts && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{t('sabbathSchool.texts', 'Teksty')}:</span> {day.texts}</p>}
      {day.verse && <VerseBox verse={day.verse} />}
      <Sections items={day.sections} />
      <Questions items={day.questions} />
    </section>

    <nav className="no-print mt-8 flex items-center justify-between gap-3 text-sm">
      {pick > 0 ? <button type="button" onClick={() => go(pick - 1)} className="text-left text-brand-light hover:underline">‹ {days[pick - 1].when.split(',')[0]}</button> : <span />}
      {pick < days.length - 1 ? <button type="button" onClick={() => go(pick + 1)} className="text-right text-brand-light hover:underline">{days[pick + 1].when.split(',')[0]} ›</button> : <span />}
    </nav>
  </>
}

export function SabbathExtraPage() {
  const { quarter = '', id = '' } = useParams()
  const { lang, t } = useI18n()
  const { data, failed } = useSabbathExtra()
  const item = data?.quarter === quarter ? data.items.find((it) => it.id === id) : undefined

  useSetPlace(item?.title)

  const backTo = `/${lang}/lekcje-biblijne${EXTRA_HASH}`
  const back = <BackLink to={backTo}>{t('sabbathSchool.title', 'Szkoła Biblijna')}</BackLink>
  if (!data && !failed) return <p className="text-slate-400">{t('common.loading', '…')}</p>
  if (!data || !item) return <div><p className="text-slate-400">{t('sabbathSchool.missing', 'Nie ma takiego materiału. Możliwe, że należy do poprzedniego kwartału.')}</p><div className="mt-3">{back}</div></div>

  const pos = data.items.indexOf(item)
  const prev = pos > 0 ? data.items[pos - 1] : null
  const next = pos < data.items.length - 1 ? data.items[pos + 1] : null
  const now = item.id === currentExtraId(data.items)
  const href = (it: SabbathExtraItem) => `/${lang}/lekcje-biblijne/${data.quarter}/${it.id}`
  const sources = item.sources?.length ? item.sources : data.sources
  const note = item.note || data.note
  const hasDays = (item.days?.length ?? 0) > 0

  return <article className="reading">
    {back}

    <header className="mb-4 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-sky-300">{data.title} · {item.label}{item.range ? ` · ${item.range}` : ''}</p>
      <h1 className="mt-1 text-[1.5em] font-bold leading-tight">{item.title}</h1>
      {now && <p className="mt-2"><span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-sky-300 dark:text-slate-950">{t('sabbathSchool.thisWeek', 'Na ten tydzień')}</span></p>}
      {hasDays && item.lead && <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">{item.lead}</p>}
    </header>

    <div className="no-print flex justify-end"><FontScale /></div>

    {hasDays
      ? <LessonDays key={item.id} item={item} />
      : <>
          {item.verse && <VerseBox verse={item.verse} />}
          <Sections items={item.sections} />
          <Questions items={item.questions} />
        </>}

    <nav className="no-print mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
      {prev ? <Link to={href(prev)} className="text-brand-light hover:underline">‹ {prev.title}</Link> : <span />}
      {next ? <Link to={href(next)} className="text-right text-brand-light hover:underline">{next.title} ›</Link> : <span />}
    </nav>

    <div className="no-print mt-6 flex justify-center">{back}</div>
    {(sources.length > 0 || note) && <div className="mt-8 space-y-1 text-xs text-slate-500">
      {sources.map((s, i) => <p key={i}>{t('sabbathSchool.source', 'Źródło')}: {s}</p>)}
      {note && <p>{note}</p>}
    </div>}
  </article>
}
