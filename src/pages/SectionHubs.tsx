import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadIndex } from '../content'
import { AppIcon, type IconName } from '../components/AppNavigation'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { StudyCard } from '../components/StudyCard'
import type { IndexFile } from '../types'

function SectionTile({ to, href, icon, title, description }: { to?: string; href?: string; icon: IconName; title: string; description: string }) {
  const content = <><span className="rounded-xl bg-brand/10 p-3 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name={icon} className="h-7 w-7" /></span><span className="min-w-0 flex-1"><span className="block text-lg font-bold text-slate-900 dark:text-white">{title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</span></span><span className="text-xl text-brand dark:text-sky-300" aria-hidden>›</span></>
  const className = 'gradient-panel flex items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md dark:hover:border-sky-300/60'
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={className}>{content}</a>
  return <Link to={to || '#'} className={className}>{content}</Link>
}

function Hub({ icon, title, intro, children }: { icon: IconName; title: string; intro: string; children: ReactNode }) {
  const { lang, t } = useI18n()
  return <section className="mx-auto max-w-xl">
    <BackLink to={`/${lang}`} className="mb-4">{t('nav.topics', 'Menu główne')}</BackLink>
    <PageHeading icon={icon} title={title} />
    <p className="mt-3 text-slate-600 dark:text-slate-300">{intro}</p>
    <div className="mt-6 space-y-3">{children}</div>
  </section>
}

export function BibleHub() {
  const { lang } = useI18n()
  return <Hub icon="book" title="Biblia" intro="Wybierz, w jaki sposób chcesz dziś spotkać się ze Słowem.">
    <SectionTile to={`/${lang}/biblia/czytaj`} icon="book" title="Biblia" description="Księgi, rozdziały, wyszukiwanie, zakładki i przekłady." />
    <SectionTile to={`/${lang}/poznaj-boga-i-biblie`} icon="lesson" title="Poznaj Boga i Biblię" description="5 serii po 7 lekcji biblijnych do samodzielnego studiowania." />
    <SectionTile to={`/${lang}/lekcje-biblijne`} icon="lesson" title="Lekcje biblijne" description="Bieżąca lekcja Szkoły Sobotniej." />
    <SectionTile to={`/${lang}/notatki`} icon="notes" title="Moje notatki biblijne" description="Zapisuj myśli i wracaj do nich później." />
    <SectionTile to={`/${lang}/fiszki`} icon="memory" title="Ucz się wersetów na pamięć" description="Fiszki i powtórki ważnych tekstów." />
    <SectionTile to={`/${lang}/okazje`} icon="occasion" title="Teksty na różne okazje" description="Dobierz fragment Pisma do konkretnej sytuacji." />
  </Hub>
}

export function SongsHub() {
  const { lang } = useI18n()
  return <Hub icon="music" title="Pieśni" intro="Wybierz śpiewnik albo otwórz pieśni z muzyką i tekstem.">
    <SectionTile to={`/${lang}/spiewnik`} icon="music" title="Śpiewnik" description="Pieśni ze śpiewnika „Śpiewajmy Panu”." />
    <SectionTile to={`/${lang}/piesni-mlodziezowe`} icon="music" title="Pieśni młodzieżowe" description="Pieśni z campów i zjazdów młodzieżowych." />
    <SectionTile href="https://www.youtube.com/@UwielbieniezTekstem" icon="music" title="Pieśni z muzyką i tekstem" description="Kanał „Uwielbienie z Tekstem” w YouTube." />
  </Hub>
}

export function PrayerHub() {
  const { lang } = useI18n()
  return <Hub icon="prayer" title="Modlitwa" intro="Zapisuj prośby i odpowiedzi na modlitwy w swoim prywatnym dzienniku.">
    <SectionTile to={`/${lang}/modlitwy`} icon="prayer" title="Dziennik modlitw" description="Twoja osobista lista modlitewna, zapisana tylko na tym urządzeniu." />
  </Hub>
}

export function BibleStudies() {
  const { lang } = useI18n()
  const [index, setIndex] = useState<IndexFile | null>(null)
  const [failed, setFailed] = useState(false)
  const [openSeries, setOpenSeries] = useState<string | null>(null)

  useEffect(() => {
    setIndex(null)
    setFailed(false)
    loadIndex(lang).then(setIndex).catch(() => setFailed(true))
  }, [lang])

  const series = index ? [...index.series].sort((a, b) => a.order - b.order) : []
  return <section className="mx-auto max-w-xl">
    <BackLink to={`/${lang}/biblia`} className="mb-4">Biblia</BackLink>
    <PageHeading icon="lesson" title="Poznaj Boga i Biblię" />
    <p className="mt-3 text-slate-600 dark:text-slate-300">Pięć serii po siedem lekcji prowadzi przez najważniejsze tematy wiary i Biblii.</p>
    {failed ? <p className="mt-6 text-slate-500 dark:text-slate-400">Materiały są chwilowo niedostępne.</p> : !index ? <p className="mt-6 text-slate-500 dark:text-slate-400">Wczytywanie…</p> : <div className="mt-6 space-y-3">{series.map((entry) => {
      const studies = index.studies.filter((study) => study.seriesId === entry.id).sort((a, b) => a.order - b.order)
      const open = openSeries === entry.id
      return <section key={entry.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => setOpenSeries(open ? null : entry.id)} aria-expanded={open} className="gradient-panel flex w-full items-center gap-3 p-4 text-left transition hover:border-brand/60 dark:hover:border-sky-300/60">
          <span className="rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-base font-bold text-slate-900 dark:text-white">{entry.title}</span><span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{studies.length} tematów</span></span>
          <span className={`text-xl text-brand transition-transform dark:text-sky-300 ${open ? 'rotate-90' : ''}`} aria-hidden>›</span>
        </button>
        {open && <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">{studies.map((study) => <StudyCard key={study.id} study={study} tile="gradient-panel border-slate-200 hover:border-brand dark:border-slate-700 dark:text-white" />)}</div>}
      </section>
    })}</div>}
  </section>
}
