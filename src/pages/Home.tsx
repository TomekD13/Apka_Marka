import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadPray40 } from '../content'
import { fallbackUrl, findCurrentLesson, type CurrentLesson } from '../lib/sabbathSchool'
import { AppIcon } from '../components/AppNavigation'
import { DailyOccasionVerse } from '../components/DailyOccasionVerse'
import { PageHeading } from '../components/PageHeading'
import { Pray40Actions } from '../components/Pray40Actions'
import type { Pray40Index } from '../types'

function SabbathSchoolCard() {
  const { lang, t } = useI18n()
  const [lesson, setLesson] = useState<CurrentLesson | null>(null)

  useEffect(() => {
    let alive = true
    findCurrentLesson(lang).then((value) => alive && setLesson(value)).catch(() => alive && setLesson(null))
    return () => { alive = false }
  }, [lang])

  const external = lesson?.url || fallbackUrl(lang)
  return <article className="gradient-panel rounded-2xl border p-4">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{t('home.sabbathSchool', 'Szkoła Sobotnia')}</p><h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{lesson?.lessonTitle || t('home.sabbathTitle', 'Bieżąca lekcja')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{lesson?.quarterTitle || t('home.sabbathDesc', 'Bieżąca lekcja i materiały do studium.')}</p></div></div>
    <a href={external} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-400/50 dark:text-sky-200 dark:hover:bg-sky-400/10">{t('home.openLesson', 'Otwórz lekcję')} <span className="ml-1" aria-hidden>↗</span></a>
  </article>
}

function ContinueCard({ to, icon, title, desc }: { to: string; icon: 'book' | 'notes' | 'memory'; title: string; desc: string }) {
  return <Link to={to} className="gradient-panel flex gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md dark:hover:border-sky-300/60"><span className="rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name={icon} className="h-6 w-6"/></span><span><span className="block font-semibold text-slate-900 dark:text-white">{title}</span><span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{desc}</span></span></Link>
}

export function Home() {
  const { lang, t } = useI18n()
  const base = `/${lang}`
  const [pray40, setPray40] = useState<Pray40Index | null>(null)

  useEffect(() => {
    setPray40(null)
    loadPray40(lang).then(setPray40).catch(() => undefined)
  }, [lang])

  return <div className="mx-auto max-w-xl">
    <section>
      <PageHeading icon="lesson" eyebrow={t('home.projectTitle', '#JestNadzieja')} title={t('home.readings', 'Coś na dzisiaj')} />
      <p className="mt-2 text-slate-600 dark:text-slate-300">{t('home.readingsIntro', 'Znajdź materiał na dziś i wróć do tego, co już rozpoczęte.')}</p>
    </section>

    <section className="hope-reading-card mt-6 overflow-hidden rounded-2xl">
      <div className="hope-reading-card__frame p-5 text-slate-900 dark:text-white"><DailyOccasionVerse /><div className="pt-4"><p className="text-sm font-semibold text-brand dark:text-cyan-200">{t('home.currentReading', 'Bieżący materiał')}</p><h2 className="mt-1 text-2xl font-bold">{t('home.pray40', '40 dni modlitwy')}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-200">{t('home.pray40Desc', 'Codzienny materiał w ramach #JestNadzieja. W tym miejscu pojawią się też kolejne materiały edukacyjne.')}</p><Pray40Actions index={pray40} lang={lang} /></div></div>
    </section>

    <section className="mt-4"><SabbathSchoolCard /></section>

    <section className="mt-8"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('home.continue', 'Kontynuuj')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('home.continueDesc', 'Twoje osobiste narzędzia do codziennego wzrostu.')}</p></div></div><div className="space-y-3"><ContinueCard to={`${base}/biblia/czytaj`} icon="book" title={t('home.readBible', 'Czytaj Biblię')} desc={t('home.readBibleDesc', 'Księgi, rozdziały, wyszukiwanie i zakładki.')} /><ContinueCard to={`${base}/notatki`} icon="notes" title={t('notes.title', 'Moje notatki biblijne')} desc={t('home.notesDesc', 'Zapisz myśl i wróć do niej później.')} /><ContinueCard to={`${base}/fiszki`} icon="memory" title={t('flashcards.cta', 'Ucz się wersetów na pamięć')} desc={t('home.memoryDesc', 'Fiszki i powtórki ważnych tekstów.')} /></div></section>

    <section id="poznaj-boga" className="gradient-panel mt-8 rounded-2xl border p-5"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('home.bars.studies', 'Poznaj Boga i Biblię')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">5 serii po 7 lekcji do samodzielnego studiowania Biblii.</p><Link to={`${base}/poznaj-boga-i-biblie`} className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline dark:text-sky-300">{t('home.openStudies', 'Otwórz lekcje')} →</Link></section>
  </div>
}
