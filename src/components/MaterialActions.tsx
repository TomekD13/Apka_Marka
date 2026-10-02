import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { READ_EVENT, isRead, setRead, type ReadKind } from '../lib/progress'
import { wasSignedIn } from '../lib/accountGate'
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

/** Stan „przeczytane” wspolny dla przycisku na gorze i na dole tekstu. */
export function useReadState(kind: ReadKind, id: number | string): [boolean, () => void] {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const sync = () => setDone(isRead(kind, id))
    sync()
    window.addEventListener(READ_EVENT, sync)
    window.addEventListener('zywe-slowo:synced', sync)
    return () => {
      window.removeEventListener(READ_EVENT, sync)
      window.removeEventListener('zywe-slowo:synced', sync)
    }
  }, [kind, id])
  return [done, () => setDone(setRead(kind, id, !isRead(kind, id)))]
}

/** Maly przycisk „przeczytane” pod tytulem materialu. */
export function ReadTop({ kind, id }: { kind: ReadKind; id: number | string }) {
  const { t } = useI18n()
  const [done, toggle] = useReadState(kind, id)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      className={`no-print mt-3 inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition ${
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-emerald-500/60 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300'
      }`}
    >
      <Checkmark done={done} className={`h-5 w-5 ${done ? 'border-white bg-white !text-emerald-600' : ''}`} />
      {done ? t('reading.doneOn', 'Przeczytane ✓') : t('reading.markDone', 'Oznacz jako przeczytane')}
    </button>
  )
}

/** Pod materialem dla niezalogowanych: zachowaj postepy na koncie. */
export function SignInPrompt() {
  const { lang, t } = useI18n()
  if (wasSignedIn()) return null
  return (
    <div className="no-print mt-5 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-center dark:border-sky-300/30 dark:bg-sky-300/5">
      <p className="text-sm text-slate-700 dark:text-slate-200">{t('account.promptMaterials', 'Zaloguj się i zachowaj postępy czytania, notatki i inne dane')}</p>
      <Link to={`/${lang}/konto`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 dark:bg-sky-500 dark:hover:bg-sky-400">
        {t('account.promptButton', 'Zaloguj się / załóż konto')}
      </Link>
    </div>
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
  const [done, toggle] = useReadState(kind, id)
  return (
    <>
    <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
      <button
        type="button"
        onClick={toggle}
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
    <SignInPrompt />
    </>
  )
}
