import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { isRead, setRead, type ReadKind } from '../lib/progress'
import { isFavMaterial, toggleFavMaterial } from '../lib/favMaterials'

// Duze przyciski „Przeczytane” i „Ulubione” na koncu materialu. Stan zyje na
// urzadzeniu, a z kontem synchronizuje sie (lib/syncMeta.ts).

export function Checkmark({ done, className = 'h-7 w-7' }: { done: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 transition ${className} ${
        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-400 text-transparent'
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" className="h-[60%] w-[60%]">
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Heart({ on, className = 'h-6 w-6' }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" strokeLinejoin="round" />
    </svg>
  )
}

/** Wyrazny znacznik na listach: zielona plakietka zamiast malego ptaszka. */
export function ReadPill() {
  const { t } = useI18n()
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3" aria-hidden>
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t('reading.done', 'Przeczytane')}
    </span>
  )
}

/** Przycisk ulubionych - do wstawienia obok „Przeczytane” w istniejacej stopce. */
export function FavButton({ kind, id, title }: { kind: ReadKind; id: number | string; title: string }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [fav, setFav] = useState(false)
  useEffect(() => setFav(isFavMaterial(kind, id)), [kind, id])
  // sciezka bez jezyka, zeby ulubione dzialaly po zmianie jezyka
  const path = pathname.replace(/^\/[^/]+\//, '')
  return (
    <button
      type="button"
      onClick={() => setFav(toggleFavMaterial(kind, id, title, path))}
      aria-pressed={fav}
      className={`inline-flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-base font-semibold transition ${
        fav
          ? 'border-rose-400 bg-rose-500/15 text-rose-700 dark:text-rose-200'
          : 'border-slate-400/60 text-slate-700 hover:border-rose-400 dark:text-slate-200'
      }`}
    >
      <Heart on={fav} className={`h-6 w-6 ${fav ? 'text-rose-500' : ''}`} />
      {fav ? t('favorites.added', 'W ulubionych') : t('favorites.add', 'Dodaj do ulubionych')}
    </button>
  )
}

/** Komplet: „Przeczytane” + „Ulubione”, dla materialow bez wlasnej stopki. */
export function MaterialActions({ kind, id, title }: { kind: ReadKind; id: number | string; title: string }) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  useEffect(() => setDone(isRead(kind, id)), [kind, id])
  return (
    <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
      <button
        type="button"
        onClick={() => setDone(setRead(kind, id, !done))}
        aria-pressed={done}
        className={`inline-flex items-center gap-3 rounded-2xl border-2 px-6 py-3 text-base font-semibold transition ${
          done
            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:text-emerald-100'
            : 'border-slate-400/60 text-slate-700 hover:border-emerald-500 dark:text-slate-200'
        }`}
      >
        <Checkmark done={done} />
        {done ? t('reading.doneOn', 'Przeczytane ✓') : t('reading.markDone', 'Oznacz jako przeczytane')}
      </button>
      <FavButton kind={kind} id={id} title={title} />
    </div>
  )
}
