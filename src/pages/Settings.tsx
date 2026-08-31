import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useTheme, type FontSet, type Theme } from '../theme'
import { getInstallState, initAppInstall, requestInstall, subscribeInstall, type InstallState } from '../lib/installApp'
import { downloadModule } from '../content'
import { AppIcon, type IconName } from '../components/AppNavigation'
import { PageHeading } from '../components/PageHeading'

function ExpandablePanel({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
      <span className="rounded-lg bg-brand/10 p-2 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name={icon} className="h-5 w-5" /></span>
      <span className="flex-1 font-semibold text-slate-900 dark:text-white">{title}</span>
      <span className={`text-lg text-brand transition-transform dark:text-sky-300 ${open ? 'rotate-90' : ''}`} aria-hidden>›</span>
    </button>
    {open && <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">{children}</div>}
  </section>
}

export function Settings() {
  const { lang, t } = useI18n()
  const { theme, setTheme, fontSet, setFontSet } = useTheme()
  const [installState, setInstallState] = useState<InstallState>(getInstallState)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [installedNow, setInstalledNow] = useState(false)
  const [offlineState, setOfflineState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  const [offlineProgress, setOfflineProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    initAppInstall()
    const refresh = () => setInstallState(getInstallState())
    refresh()
    return subscribeInstall(refresh)
  }, [])

  function option(value: Theme, title: string, desc: string) {
    const active = theme === value
    return <button type="button" onClick={() => setTheme(value)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-brand bg-brand/10 dark:border-sky-300 dark:bg-sky-300/10' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${value === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>{value === 'dark' ? '◐' : '☼'}</span>
      <span className="flex-1"><span className="block font-semibold text-slate-900 dark:text-white">{title}</span><span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{desc}</span></span>
      <span className={`h-4 w-4 rounded-full border-2 ${active ? 'border-brand bg-brand ring-2 ring-brand/20 dark:border-sky-300 dark:bg-sky-300' : 'border-slate-300 dark:border-slate-600'}`} />
    </button>
  }

  function fontOption(value: FontSet, title: string, reading: string, desc: string) {
    const active = fontSet === value
    return <button type="button" onClick={() => setFontSet(value)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-brand bg-brand/10 ring-2 ring-brand/15 dark:border-sky-300 dark:bg-sky-300/10 dark:ring-sky-300/15' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'}`}>
      <div className="flex items-start gap-3"><span className={`font-preview-${value} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-base font-bold text-white`}>Aa</span><span className="min-w-0 flex-1"><span className={`font-preview-${value} block font-bold text-slate-900 dark:text-white`}>{title}</span><span className="block text-sm font-medium text-slate-600 dark:text-slate-300">+ {reading}</span><span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{desc}</span></span><span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${active ? 'border-brand bg-brand ring-2 ring-brand/20 dark:border-sky-300 dark:bg-sky-300' : 'border-slate-300 dark:border-slate-600'}`} /></div>
    </button>
  }

  async function install() {
    if (installState === 'ios') {
      setShowIosSteps(!showIosSteps)
      return
    }
    if (await requestInstall() === 'accepted') setInstalledNow(true)
  }

  async function downloadOffline() {
    if (offlineState === 'busy') return
    setOfflineState('busy')
    setOfflineProgress(null)
    try {
      await downloadModule(lang, (done, total) => setOfflineProgress({ done, total }))
      setOfflineState('done')
    } catch {
      setOfflineState('failed')
    } finally {
      setOfflineProgress(null)
    }
  }

  return <section className="mx-auto max-w-xl">
    <PageHeading icon="settings" eyebrow={t('nav.menu', 'Menu boczne')} title={t('nav.settings', 'Ustawienia')} />
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('settings.intro', 'Wybierz wygląd, który jest najwygodniejszy dla Ciebie.')}</p>
    <div className="mt-6 space-y-2.5">
      <ExpandablePanel icon="settings" title={t('settings.appearance', 'Wygląd aplikacji')}>
        <div className="space-y-2.5">
          {option('light', t('settings.light', 'Light mode'), t('settings.lightDesc', 'Jasny, czytelny wygląd na dzień.'))}
          {option('dark', t('settings.dark', 'Dark mode'), t('settings.darkDesc', 'Ciemny wygląd wygodny wieczorem.'))}
        </div>
      </ExpandablePanel>
      <ExpandablePanel icon="notes" title={t('settings.fonts', 'Czcionki')}>
        <div className="space-y-2.5">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.fontsIntro', 'Pierwsza czcionka dotyczy interfejsu, druga dłuższego czytania.')}</p>
          {fontOption('nunito', 'Montserrat', 'Libre Baskerville', t('settings.fontMontserrat', 'Czytelna i uporządkowana.'))}
          {fontOption('outfit', 'Outfit', 'Newsreader', t('settings.fontOutfit', 'Lekka i redakcyjna.'))}
        </div>
      </ExpandablePanel>
    </div>
    <div className="mt-7 space-y-2.5">
      <ExpandablePanel icon="contact" title={t('about.title', 'O aplikacji')}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">{t('about.body')}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('about.privacy')}</p>
        <a href={t('about.publisherUrl', 'https://www.facebook.com/pastormarek')} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-brand hover:underline dark:text-sky-300">{t('about.publisher', 'Autor: Marek Micyk')}</a>
      </ExpandablePanel>
      <ExpandablePanel icon="settings" title="Dodaj aplikację do Twojego telefonu">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Otwiera się jak zwykła aplikacja i pozostaje dostępna także bez internetu.</p>
        {installedNow || installState === 'installed' ? <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Aplikacja jest już dodana do ekranu telefonu.</p> : installState === 'unavailable' ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Otwórz tę stronę w Chrome na Androidzie albo Safari na iPhonie, aby dodać aplikację do ekranu.</p> : <><button type="button" onClick={install} aria-expanded={installState === 'ios' ? showIosSteps : undefined} className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-light dark:bg-sky-300 dark:text-slate-950">{installState === 'ios' ? 'Jak to zrobić' : 'Dodaj aplikację'}</button>{installState === 'ios' && showIosSteps && <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><li>Dotknij ikony „Udostępnij” na dolnym pasku Safari.</li><li>Przewiń listę i wybierz „Dodaj do ekranu początkowego”.</li><li>Potwierdź „Dodaj” w prawym górnym rogu.</li><li className="text-slate-500 dark:text-slate-400">Na iPhonie użyj Safari — w innych przeglądarkach ta opcja może nie być dostępna.</li></ol>}</>}
      </ExpandablePanel>
      <ExpandablePanel icon="download" title="Pobierz treści do trybu offline">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Pobierze na to urządzenie Biblię, studia, czytanki „40 dni modlitwy”, materiały edukacyjne, śpiewniki, fiszki i teksty na różne okazje. Po zakończeniu będą dostępne także bez internetu.</p>
        <button type="button" onClick={downloadOffline} disabled={offlineState === 'busy' || offlineState === 'done'} className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-light disabled:cursor-default disabled:opacity-70 dark:bg-sky-300 dark:text-slate-950">
          {offlineState === 'busy' ? `Pobieranie…${offlineProgress ? ` ${offlineProgress.done}/${offlineProgress.total}` : ''}` : offlineState === 'done' ? 'Treści są dostępne offline' : 'Pobierz treści'}
        </button>
        {offlineState === 'failed' && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">Nie udało się pobrać wszystkich treści. Sprawdź połączenie z internetem i spróbuj ponownie.</p>}
      </ExpandablePanel>
    </div>
  </section>
}
