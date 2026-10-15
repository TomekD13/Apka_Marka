import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { isOpen, todayIso } from '../lib/availability'
import type { EduEntry, EduIndex } from '../types'

/**
 * Tekst na dzis z Czlowieka Nadziei - wejscie na stronie glownej i w #JestNadzieja
 * (decyzja autora 2026-10-15: po 40 dniach modlitwy otwierajacym tekstem dnia jest zawsze
 * Czlowiek Nadziei). Dzisiejszy material, a gdy dzis nie ma nowego - ostatni otwarty;
 * przed startem pierwszy (otwarty od razu flaga `open`).
 */
export function currentEdu(items: EduEntry[], now = new Date()): { entry: EduEntry; state: 'today' | 'last' | 'before' } | null {
  if (!items.length) return null
  const today = todayIso(now)
  const exact = items.find((it) => it.date === today)
  if (exact) return { entry: exact, state: 'today' }
  const open = items.filter((it) => isOpen(it, now))
  const started = open.filter((it) => it.date && it.date <= today)
  if (started.length) return { entry: started[started.length - 1], state: 'last' }
  return { entry: open[0] ?? items[0], state: 'before' }
}

export function EduTodayActions({ index, lang }: { index: EduIndex | null; lang: string }) {
  const { t } = useI18n()
  const current = index && currentEdu(index.items)

  if (!current) return <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading', '…')}</p>

  const { entry, state } = current
  const lead = state === 'today'
    ? t('home.eduToday', 'Dzisiaj')
    : state === 'last'
      ? t('home.eduLast', 'Ostatni materiał')
      : t('home.eduBefore', 'Na początek')

  return <>
    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      {lead}: {t('edu.item', 'Materiał')} {entry.nr}
      {entry.dateLabel && state !== 'before' ? ` · ${entry.dateLabel}` : ''}
    </p>
    <p className="mt-1 text-lg font-semibold leading-snug text-slate-900 dark:text-white">
      {entry.audio && <span className="mr-1" aria-label={t('audio.hasAudio', 'Z nagraniem do posłuchania')} title={t('audio.hasAudio', 'Z nagraniem do posłuchania')}>🎧</span>}
      {entry.title}
    </p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Link to={`/${lang}/edukacja/${entry.nr}`} viewTransition className="rounded-xl bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-light dark:bg-sky-300 dark:text-slate-950">
        {state === 'today' ? t('home.eduOpen', 'Otwórz dzisiejszy materiał') : t('home.eduOpenOther', 'Otwórz materiał')}
      </Link>
      <Link to={`/${lang}/edukacja`} viewTransition className="rounded-xl border border-brand/40 bg-white/70 px-3 py-2.5 text-center text-sm font-semibold text-brand transition hover:border-brand hover:bg-white dark:border-sky-300/40 dark:bg-slate-950/30 dark:text-sky-200 dark:hover:border-sky-300 dark:hover:bg-slate-950/60">
        {t('home.eduAll', 'Wszystkie materiały')}
      </Link>
    </div>
  </>
}
