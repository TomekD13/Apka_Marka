import { useI18n } from '../i18n'
import { useTheme, type Theme } from '../theme'
import { PageHeading } from '../components/PageHeading'

export function Settings() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()

  function option(value: Theme, title: string, desc: string) {
    const active = theme === value
    return <button type="button" onClick={() => setTheme(value)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-brand bg-brand/10 dark:border-sky-300 dark:bg-sky-300/10' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${value === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>{value === 'dark' ? '◐' : '☼'}</span>
      <span className="flex-1"><span className="block font-semibold text-slate-900 dark:text-white">{title}</span><span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{desc}</span></span>
      <span className={`h-5 w-5 rounded-full border-2 ${active ? 'border-brand bg-brand ring-2 ring-brand/20 dark:border-sky-300 dark:bg-sky-300' : 'border-slate-300 dark:border-slate-600'}`} />
    </button>
  }

  return <section className="mx-auto max-w-xl">
    <PageHeading icon="settings" eyebrow={t('nav.menu', 'Menu boczne')} title={t('nav.settings', 'Ustawienia')} />
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('settings.intro', 'Wybierz wygląd, który jest najwygodniejszy dla Ciebie.')}</p>
    <div className="mt-7 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('settings.appearance', 'Wygląd aplikacji')}</h2>
      {option('light', t('settings.light', 'Light mode'), t('settings.lightDesc', 'Jasny, czytelny wygląd na dzień.'))}
      {option('dark', t('settings.dark', 'Dark mode'), t('settings.darkDesc', 'Ciemny wygląd wygodny wieczorem.'))}
    </div>
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700">
      <img src={`${import.meta.env.BASE_URL}jestnadzieja-brand.png`} alt="#JestNadzieja" className="block w-full" />
    </div>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('settings.hopeColor', 'Kolory #JestNadzieja są oparte na oryginalnym gradiencie z materiału kampanii.')}</p>
  </section>
}
