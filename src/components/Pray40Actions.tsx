import { Link } from 'react-router-dom'
import { currentCampaignDay } from '../lib/pray40Calendar'
import type { Pray40Index } from '../types'

/** Wspólne wejście do bieżącego dnia akcji i pełnego kalendarza. */
export function Pray40Actions({ index, lang }: { index: Pray40Index | null; lang: string }) {
  const campaign = index && currentCampaignDay(index.days)
  const entry = campaign?.entry ?? index?.days[0]

  if (!entry) return <p className="text-sm text-slate-500 dark:text-slate-400">Wczytywanie kalendarza…</p>

  const description = campaign?.state === 'before'
    ? `Start akcji: ${entry.dateLabel ?? entry.date}. Możesz już otworzyć pierwszy materiał.`
    : campaign?.state === 'after'
      ? 'Akcja została zakończona. Wróć do ostatniego materiału albo przejrzyj pełną listę.'
      : `Dzisiaj: dzień ${entry.day} — ${entry.title}`
  const label = campaign?.state === 'before'
    ? 'Otwórz pierwszy materiał'
    : campaign?.state === 'after'
      ? 'Otwórz ostatni materiał'
      : 'Otwórz dzisiejszy materiał'

  return <>
    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Link to={`/${lang}/40-dni/${entry.day}`} viewTransition className="rounded-xl bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-light dark:bg-sky-300 dark:text-slate-950">
        {label}
      </Link>
      <Link to={`/${lang}/40-dni`} viewTransition className="rounded-xl border border-brand/40 bg-white/70 px-3 py-2.5 text-center text-sm font-semibold text-brand transition hover:border-brand hover:bg-white dark:border-sky-300/40 dark:bg-slate-950/30 dark:text-sky-200 dark:hover:border-sky-300 dark:hover:bg-slate-950/60">
        Pełna lista 40 dni
      </Link>
    </div>
  </>
}
