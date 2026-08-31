import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPray40 } from '../content'
import { useI18n } from '../i18n'
import { AppIcon } from '../components/AppNavigation'
import { BackLink } from '../components/BackLink'
import { Pray40Actions } from '../components/Pray40Actions'
import type { Pray40Index } from '../types'

export function Hope() {
  const { lang, t } = useI18n()
  const [index, setIndex] = useState<Pray40Index | null>(null)

  useEffect(() => {
    setIndex(null)
    loadPray40(lang).then(setIndex).catch(() => undefined)
  }, [lang])

  return <section className="mx-auto max-w-xl">
    <BackLink to={`/${lang}`} className="mb-4">{t('nav.topics', 'Menu główne')}</BackLink>
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 shadow-lg dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"><img src={`${import.meta.env.BASE_URL}jestnadzieja-transparent-small.png`} alt="#JestNadzieja" className="block w-full" /></div>
    <p className="mt-5 text-slate-600 dark:text-slate-300">{t('hope.intro', 'Czytania, modlitwa i materiały, które pomagają dzielić się nadzieją.')}</p>

    <div className="mt-6 space-y-3">
      <section className="gradient-panel rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand/10 p-3 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="prayer" className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-slate-900 dark:text-white">40 dni modlitwy</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Codzienna droga przez historie nadziei — wybierz materiał zgodny z kalendarzem albo przejdź do całego spisu.</p></div>
        </div>
        <Pray40Actions index={index} lang={lang} />
      </section>

      <Link to={`/${lang}/edukacja`} viewTransition className="gradient-panel flex items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md dark:hover:border-sky-300/60">
        <span className="rounded-xl bg-brand/10 p-3 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name="lesson" className="h-7 w-7" /></span>
        <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-slate-900 dark:text-white">Materiały edukacyjne</span><span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-300">Przejdź do listy materiałów i wybierz temat, który chcesz otworzyć.</span></span>
        <span className="text-xl text-brand dark:text-sky-300" aria-hidden>›</span>
      </Link>
    </div>
  </section>
}
