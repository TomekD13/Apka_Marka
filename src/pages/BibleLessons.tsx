import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { fallbackUrl, findCurrentLesson, type CurrentLesson } from '../lib/sabbathSchool'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'

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
    <PageHeading icon="lesson" title={t('sabbathSchool.title', 'Lekcje biblijne')} />
    <p className="mt-3 text-slate-600 dark:text-slate-300">Bieżąca lekcja Szkoły Sobotniej wraz z materiałami do studium.</p>
    <article className="gradient-panel mt-6 rounded-2xl border p-5">
      <p className="text-sm font-semibold text-brand dark:text-sky-300">{t('home.sabbathSchool', 'Szkoła Sobotnia')}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{lesson?.lessonTitle || t('home.sabbathTitle', 'Bieżąca lekcja')}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{lesson?.quarterTitle || t('home.sabbathDesc', 'Bieżąca lekcja i materiały do studium.')}</p>
      <a href={lesson?.url || fallbackUrl(lang)} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light dark:bg-sky-300 dark:text-slate-950">{t('home.openLesson', 'Otwórz lekcję')} <span className="ml-1" aria-hidden>↗</span></a>
    </article>
  </section>
}
