import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { Pray40List } from './Pray40'
import { EduList } from './Edu'

export function Hope() {
  const { lang, t } = useI18n()
  return <section className="mx-auto max-w-xl">
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg"><img src={`${import.meta.env.BASE_URL}jestnadzieja-brand.png`} alt="#JestNadzieja" className="block w-full" /></div>
    <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">#JestNadzieja</h1>
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('hope.intro', 'Czytania, modlitwa i materiały, które pomagają dzielić się nadzieją.')}</p>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand dark:text-sky-300">{t('home.currentReading', 'Bieżący materiał')}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{t('home.pray40', '40 dni modlitwy')}</h2></div><Link to={`/${lang}/40-dni/1`} className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light">{t('home.openToday', 'Otwórz dziś')}</Link></div>
      <div className="mt-4"><Pray40List limit={5} /></div>
    </div>
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('home.futureEdu', 'Materiały edukacyjne')}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('hope.eduDesc', 'Kolejne materiały będą dostępne w tej sekcji.')}</p><div className="mt-4"><EduList limit={5} /></div></div>
  </section>
}
