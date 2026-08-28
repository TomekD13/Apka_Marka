import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { fallbackUrl, findCurrentLesson, type CurrentLesson } from '../lib/sabbathSchool'
import { AppIcon } from '../components/AppNavigation'

function SabbathSchoolCard() {
  const { lang, t } = useI18n()
  const [lesson, setLesson] = useState<CurrentLesson | null>(null)

  useEffect(() => {
    let alive = true
    findCurrentLesson(lang).then((value) => alive && setLesson(value)).catch(() => alive && setLesson(null))
    return () => { alive = false }
  }, [lang])

  const external = lesson?.url || fallbackUrl(lang)
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{t('home.sabbathSchool', 'Szkoła Sobotnia')}</p><h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{lesson?.lessonTitle || t('home.sabbathTitle', 'Bieżąca lekcja')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{lesson?.quarterTitle || t('home.sabbathDesc', 'Bieżąca lekcja i materiały do studium.')}</p></div></div>
    <a href={external} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-400/50 dark:text-sky-200 dark:hover:bg-sky-400/10">{t('home.openLesson', 'Otwórz lekcję')} <span className="ml-1" aria-hidden>↗</span></a>
  </article>
}

function ContinueCard({ to, icon, title, desc }: { to: string; icon: 'book' | 'notes' | 'memory'; title: string; desc: string }) {
  return <Link to={to} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-300/60"><span className="rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name={icon} className="h-6 w-6"/></span><span><span className="block font-semibold text-slate-900 dark:text-white">{title}</span><span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{desc}</span></span></Link>
}

export function Home() {
  const { lang, t } = useI18n()
  const base = `/${lang}`
  return <div className="mx-auto max-w-xl">
    <section>
      <p className="text-sm font-semibold text-brand dark:text-sky-300">Żywe Słowo</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('home.readings', 'Czytania')}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{t('home.readingsIntro', 'Znajdź materiał na dziś i wróć do tego, co już rozpoczęte.')}</p>
    </section>

    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg">
      <img src={`${import.meta.env.BASE_URL}jestnadzieja-brand.png`} alt="#JestNadzieja" className="block w-full" />
      <div className="p-5 text-white"><p className="text-sm font-semibold text-cyan-200">{t('home.currentReading', 'Bieżący materiał')}</p><h2 className="mt-1 text-2xl font-bold">{t('home.pray40', '40 dni modlitwy')}</h2><p className="mt-2 text-sm text-slate-200">{t('home.pray40Desc', 'Codzienny materiał w ramach #JestNadzieja. W tym miejscu pojawią się też kolejne materiały edukacyjne.')}</p><Link to={`${base}/40-dni/1`} className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">{t('home.openToday', 'Otwórz dzisiejszy materiał')} <span className="ml-1" aria-hidden>→</span></Link></div>
    </section>

    <section className="mt-4"><SabbathSchoolCard /></section>

    <section className="mt-8"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('home.continue', 'Kontynuuj')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('home.continueDesc', 'Twoje osobiste narzędzia do codziennego wzrostu.')}</p></div></div><div className="space-y-3"><ContinueCard to={`${base}/biblia`} icon="book" title={t('home.readBible', 'Czytaj Biblię')} desc={t('home.readBibleDesc', 'Księgi, rozdziały, wyszukiwanie i zakładki.')} /><ContinueCard to={`${base}/notatki`} icon="notes" title={t('notes.title', 'Moje notatki biblijne')} desc={t('home.notesDesc', 'Zapisz myśl i wróć do niej później.')} /><ContinueCard to={`${base}/fiszki`} icon="memory" title={t('flashcards.cta', 'Ucz się wersetów na pamięć')} desc={t('home.memoryDesc', 'Fiszki i powtórki ważnych tekstów.')} /></div></section>

    <section id="poznaj-boga" className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-5 dark:border-slate-700 dark:bg-slate-800"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('home.bars.studies', 'Poznaj Boga i Biblię')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('home.studiesDesc', 'Lekcje i materiały do samodzielnego studiowania Biblii.')}</p><Link to={`${base}/edukacja`} className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline dark:text-sky-300">{t('home.openStudies', 'Przejdź do materiałów')} →</Link></section>
  </div>
}
