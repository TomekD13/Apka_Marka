import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSetPlace } from '../place'
import { loadGroupItem, loadGroups } from '../content'
import { AppIcon } from '../components/AppNavigation'
import { BackLink } from '../components/BackLink'
import { FontScale } from '../components/FontScale'
import { LEVEL_STYLES, LevelToggle } from '../components/LevelToggle'
import { PageHeading } from '../components/PageHeading'
import type { GroupBlock, GroupElement, GroupItem, GroupLevel, GroupsIndex, Level } from '../types'

// „Grupy Nadziei" - studia dla grup domowych. Uklad jak w „Poznaj Boga i Biblie":
// harmonijka serii -> lista tematow -> czytnik z trzema addytywnymi poziomami.
// Zrodlo tresci: tools/extract_groups.py (one27/GrupyBiblijne).

const LEVEL_KEY = 'zywe-slowo:groups:level'
const LEADER_KEY = 'zywe-slowo:groups:leader'
const OPTIONAL_KEY = 'zywe-slowo:groups:optional'

const LEVELS: Level[] = ['base', 'extended', 'advanced']
const toRank = (l: Level): GroupLevel => (LEVELS.indexOf(l) + 1) as GroupLevel
const toLevel = (n: GroupLevel): Level => LEVELS[n - 1]

function remembered(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // tryb prywatny - ustawienie zyje tylko do zamkniecia karty
  }
}

/** Pogrubienie, kursywa i `transliteracja` z markdowna zrodlowego - nic wiecej w tresci nie ma. */
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <em key={i} className="font-semibold not-italic tracking-wide">{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

function useGroupsIndex() {
  const { lang } = useI18n()
  const [data, setData] = useState<GroupsIndex | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setData(null)
    setFailed(false)
    loadGroups(lang).then(setData).catch(() => setFailed(true))
  }, [lang])
  return { data, failed }
}

export function Groups() {
  const { lang, t } = useI18n()
  const { data, failed } = useGroupsIndex()
  const [openSeries, setOpenSeries] = useState<string | null>(null)

  return <section className="mx-auto max-w-xl">
    <BackLink to={`/${lang}/jest-nadzieja`} className="mb-4">#JestNadzieja</BackLink>
    <PageHeading icon="lesson" title={t('groups.title', 'Grupy Nadziei')} />
    <p className="mt-3 text-slate-600 dark:text-slate-300">{t('groups.intro', 'Gotowe spotkania dla grup domowych. Czytacie fragment, rozmawiacie, czytacie następny. Każdy temat ma trzy poziomy, a prowadzący nie potrzebuje przygotowania teologicznego.')}</p>
    {failed ? <p className="mt-6 text-slate-500 dark:text-slate-400">{t('groups.unavailable', 'Materiały są chwilowo niedostępne.')}</p> : !data ? <p className="mt-6 text-slate-500 dark:text-slate-400">{t('common.loading', 'Wczytywanie…')}</p> : <div className="mt-6 space-y-3">{data.serie.map((serie) => {
      const open = openSeries === serie.prefiks
      return <section key={serie.prefiks} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => setOpenSeries(open ? null : serie.prefiks)} aria-expanded={open} className="gradient-panel flex w-full items-center gap-3 p-4 text-left transition hover:border-brand/60 dark:hover:border-sky-300/60">
          <span className="rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-base font-bold text-slate-900 dark:text-white">{serie.tytul}</span><span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{serie.items.length} {t('groups.meetings', 'spotkań')}</span></span>
          <span className={`text-xl text-brand transition-transform dark:text-sky-300 ${open ? 'rotate-90' : ''}`} aria-hidden>›</span>
        </button>
        {open && <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <p className="px-1 pb-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{serie.opis}</p>
          {serie.items.map((item, i) => <Link key={item.id} to={`/${lang}/grupy-nadziei/${item.id}`} viewTransition className="gradient-panel flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm dark:border-slate-700 dark:text-white">
            <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1"><span className="block font-medium leading-snug">{item.tytul}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.teksty}</span></span>
          </Link>)}
        </div>}
      </section>
    })}</div>}
    {data?.note && <p className="mt-8 text-xs text-slate-500">{data.note}</p>}
  </section>
}

function LevelChip({ poziom }: { poziom: GroupLevel }) {
  const { t } = useI18n()
  if (poziom === 1) return null
  const level = toLevel(poziom)
  return <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[0.65em] font-semibold ${LEVEL_STYLES[level].chip}`}>{t(`reader.${level}`, level)}</span>
}

function Element({ el, leader, paper = false }: { el: GroupElement; leader: boolean; paper?: boolean }) {
  const { t } = useI18n()
  // na jasnej karcie poziomu 2 i 3 tekst pomocniczy musi byc ciemny w kazdym motywie
  const muted = paper ? 'text-slate-700' : 'text-slate-600 dark:text-slate-300'
  switch (el.typ) {
    case 'pismo':
      return <div className="verse-box rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">{el.fragmenty.map((f, i) => <div key={i} className={i ? 'mt-4' : ''}>
        <p className="text-[0.8em] font-bold uppercase tracking-wide text-brand">{f.odnosnik} <span className="font-medium text-slate-500">({f.przeklad})</span></p>
        {f.akapity.map((a, j) => <p key={j} className="mt-2 leading-relaxed">{inline(a)}</p>)}
      </div>)}</div>
    case 'pytanie': {
      const style = paper ? 'bg-white/80 border-white' : LEVEL_STYLES[toLevel(el.poziom)].card
      return <div className={`rounded-xl border p-3.5 text-slate-900 ${style} ${el.opcjonalne ? 'opacity-90' : ''}`}>
        {el.kluczowe && <p className="mb-1 text-[0.7em] font-bold uppercase tracking-wide text-emerald-700">{t('groups.key', 'Kluczowe')}</p>}
        {el.opcjonalne && <p className="mb-1 text-[0.7em] font-semibold uppercase tracking-wide text-slate-500">{t('groups.optional', 'Jeśli macie czas')}</p>}
        <p className="leading-relaxed">{inline(el.tekst)}</p>
      </div>
    }
    case 'notka':
      return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-slate-800"><p className="text-[0.7em] font-bold uppercase tracking-wide text-amber-800">{t('groups.note', 'Notka')}</p><p className="mt-1 leading-relaxed">{inline(el.tekst)}</p></div>
    case 'wyroznienie':
      return <blockquote className={`rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 text-[1.05em] font-medium leading-relaxed ${paper ? '' : 'dark:bg-sky-400/10'}`}>{inline(el.tekst)}</blockquote>
    case 'lacznik':
      return <p className={`italic leading-relaxed ${muted}`}>{inline(el.tekst)}</p>
    case 'uwaga-prowadzacego':
      if (!leader) return null
      return <p className={`no-print rounded-lg border border-dashed border-slate-400/60 px-3 py-2 text-[0.9em] leading-relaxed ${muted}`}><span className="font-semibold">{t('groups.leaderNote', 'Prowadzący')}: </span>{inline(el.tekst)}</p>
    case 'lista':
      return <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">{el.pozycje.map((p, i) => <li key={i}>{inline(p)}</li>)}</ul>
    default:
      return <p className="leading-relaxed">{inline(el.tekst)}</p>
  }
}

function LeaderBlock({ block }: { block: GroupBlock }) {
  const { t } = useI18n()
  return <details className="no-print mt-6 rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100">
    <summary className="cursor-pointer font-semibold">{block.tytul} <span className="ml-1 text-[0.75em] font-normal text-slate-500 dark:text-slate-400">{t('groups.leaderOnly', 'tylko dla prowadzącego')}</span></summary>
    <div className="mt-3 space-y-3">
      {block.typ === 'czerwone-flagi' && block.flagi?.length
        ? block.flagi.map((f, i) => <div key={i}><p className="font-semibold">{inline(f.sytuacja)}</p><p className="mt-1 leading-relaxed">{inline(f.odpowiedz)}</p></div>)
        : block.elementy.map((el, i) => <Element key={i} el={el} leader />)}
    </div>
  </details>
}

export function GroupItemPage() {
  const { id = '' } = useParams()
  const { lang, t } = useI18n()
  const { data: index } = useGroupsIndex()
  const [item, setItem] = useState<GroupItem | null>(null)
  const [failed, setFailed] = useState(false)
  const [level, setLevel] = useState<Level>(() => {
    const saved = remembered(LEVEL_KEY, 'base') as Level
    return LEVELS.includes(saved) ? saved : 'base'
  })
  const [leader, setLeader] = useState(() => remembered(LEADER_KEY, '0') === '1')
  const [optional, setOptional] = useState(() => remembered(OPTIONAL_KEY, '1') === '1')

  useEffect(() => {
    setItem(null)
    setFailed(false)
    loadGroupItem(lang, id).then(setItem).catch(() => setFailed(true))
  }, [lang, id])

  useSetPlace(item?.tytul)

  const backTo = `/${lang}/grupy-nadziei`
  if (failed) return <div><p className="text-slate-400">{t('groups.missing', 'Nie ma takiego materiału.')}</p><BackLink to={backTo} className="mt-3">{t('groups.backToList', 'Wróć do spisu Grup Nadziei')}</BackLink></div>
  if (!item) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const max = toRank(level)
  const minutes = item.dlugosc[`p${max}` as 'p1' | 'p2' | 'p3']
  const questions = item.liczbaPytan[`p${max}` as 'p1' | 'p2' | 'p3']
  const serie = index?.serie.find((s) => s.items.some((x) => x.id === item.id))
  const pos = serie ? serie.items.findIndex((x) => x.id === item.id) : -1
  const prev = serie && pos > 0 ? serie.items[pos - 1] : null
  const next = serie && pos >= 0 && pos < serie.items.length - 1 ? serie.items[pos + 1] : null

  const pick = (l: Level) => { setLevel(l); remember(LEVEL_KEY, l) }
  const toggleLeader = () => { setLeader((v) => { remember(LEADER_KEY, v ? '0' : '1'); return !v }) }
  const toggleOptional = () => { setOptional((v) => { remember(OPTIONAL_KEY, v ? '0' : '1'); return !v }) }
  const switchClass = (on: boolean) => `rounded-md border px-3 py-1.5 text-sm transition ${on ? 'border-brand bg-brand/15 font-semibold' : 'border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800'}`

  return <article className="reading">
    <BackLink to={backTo}>{t('groups.backToList', 'Wróć do spisu Grup Nadziei')}</BackLink>

    <header className="mb-4 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-sky-300">{item.seria}{serie && pos >= 0 ? ` · ${pos + 1} / ${serie.items.length}` : ''}</p>
      <h1 className="mt-1 text-[1.5em] font-bold leading-tight">{item.tytul}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{minutes ? `${t('groups.about', 'ok.')} ${minutes} ${t('reader.minutes', 'min')}` : ''}{questions ? ` · ${questions} ${t('groups.questions', 'pytań')}` : ''}{item.tagi.length ? ` · ${item.tagi.join(', ')}` : ''}</p>
    </header>

    <div className="no-print flex flex-wrap items-center gap-3">
      <div><span className="mr-2 text-xs text-slate-500 dark:text-slate-400">{t('reader.levels', 'Poziom')}</span><LevelToggle value={level} onChange={pick} /></div>
      <FontScale className="ml-auto" />
    </div>
    <div className="no-print mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={toggleLeader} aria-pressed={leader} className={switchClass(leader)}>{t('groups.leaderMode', 'Tryb prowadzącego')}</button>
      <button type="button" onClick={toggleOptional} aria-pressed={optional} className={switchClass(optional)}>{t('groups.showOptional', 'Pytania dodatkowe')}</button>
      <button type="button" onClick={() => window.print()} className={switchClass(false)}>{t('reader.print', 'Drukuj / PDF')}</button>
    </div>

    {item.bloki.map((block, i) => {
      if (block.poziom > max) return null
      if (block.zwijany) return leader ? <LeaderBlock key={i} block={block} /> : null
      const els = block.elementy.filter((el) => el.poziom <= max && (optional || el.typ !== 'pytanie' || !el.opcjonalne))
      if (block.typ === 'modlitwa') return <section key={i} className="mt-8"><h2 className="border-b border-slate-200 pb-1 text-[1.15em] font-semibold text-brand dark:border-slate-700 dark:text-brand-light">{block.tytul}</h2></section>
      if (els.length === 0) return null
      const nested = block.poziom > 1
      const title = block.typ === 'blok' && block.numer ? `${block.numer}. ${block.tytul}` : block.tytul
      return <section key={i} className={nested ? `mt-4 rounded-2xl border p-3.5 text-slate-900 ${LEVEL_STYLES[toLevel(block.poziom)].card}` : 'mt-8'}>
        {nested
          ? <h3 className="text-[1.02em] font-semibold">{title}<LevelChip poziom={block.poziom} /></h3>
          : <h2 className="border-b border-slate-200 pb-1 text-[1.15em] font-semibold text-brand dark:border-slate-700 dark:text-brand-light">{title}</h2>}
        <div className="mt-3 space-y-3">{els.map((el, j) => <Element key={j} el={el} leader={leader} paper={nested} />)}</div>
      </section>
    })}

    <nav className="no-print mt-8 flex items-center justify-between gap-3 text-sm">
      {prev ? <Link to={`/${lang}/grupy-nadziei/${prev.id}`} className="text-brand-light hover:underline">‹ {prev.tytul}</Link> : <span />}
      {next ? <Link to={`/${lang}/grupy-nadziei/${next.id}`} className="text-right text-brand-light hover:underline">{next.tytul} ›</Link> : <span />}
    </nav>

    <div className="no-print mt-6 flex justify-center"><BackLink to={backTo}>{t('groups.backToList', 'Wróć do spisu Grup Nadziei')}</BackLink></div>
    <p className="mt-8 text-xs text-slate-500">{t('groups.bibleNote', 'Cytaty: Biblia Warszawska, o ile nie oznaczono inaczej.')}</p>
  </article>
}
