import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent } from '../lib/share'
import { isRead, setRead, type ReadKind } from '../lib/progress'

// Stopka czytanki i materialu edukacyjnego. Odhaczenie „przeczytane" stoi
// posrodku i jest najwiekszym elementem strony na tej wysokosci - to ono konczy
// czytanie (decyzja autora 2026-08-25). Pod nim przejscie do pelnej wersji
// (gdy czytamy krotka) i udostepnienie. Jeden komponent dla obu modulow.

function Ptaszek({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
        done ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-400 text-transparent'
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function ReadingFooter({
  kind,
  id,
  showFull,
  onShowFull,
  shareTitle,
  shareText,
}: {
  kind: ReadKind
  id: number
  /** czy pokazac przejscie do pelnej wersji (czytamy krotka, a pelna istnieje) */
  showFull: boolean
  onShowFull: () => void
  shareTitle: string
  shareText: string
}) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState('')

  // stan czyta sie po zamontowaniu, zeby ta sama stopka obsluzyla kolejny dzien
  useEffect(() => {
    setDone(isRead(kind, id))
    setToast('')
  }, [kind, id])

  async function share() {
    const r = await shareContent({
      title: shareTitle,
      text: shareText,
      url: typeof window === 'undefined' ? undefined : window.location.href,
    })
    setToast(
      r === 'shared'
        ? ''
        : r === 'copied'
          ? t('share.copied', 'Skopiowano')
          : t('share.failed', 'Nie udało się')
    )
  }

  const btn =
    'rounded-lg border border-slate-500/50 px-3 py-1.5 text-sm text-slate-200 transition hover:border-brand hover:text-slate-100'

  return (
    <div className="no-print mt-8 border-t border-white/10 pt-5">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setDone(setRead(kind, id, !done))}
          aria-pressed={done}
          className={`inline-flex items-center gap-3 rounded-2xl border-2 px-6 py-3 text-base font-semibold transition ${
            done
              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
              : 'border-slate-500/60 text-slate-200 hover:border-emerald-400 hover:text-white'
          }`}
        >
          <Ptaszek done={done} />
          {t('reading.done', 'Przeczytane')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {showFull && (
          <button type="button" onClick={onShowFull} className={btn}>
            {t('reading.full', 'Czytaj pełną wersję')}
          </button>
        )}
        <button type="button" onClick={share} className={btn}>
          {t('reading.share', 'Udostępnij')}
        </button>
        {toast && <span className="text-xs text-slate-400">{toast}</span>}
      </div>
    </div>
  )
}
