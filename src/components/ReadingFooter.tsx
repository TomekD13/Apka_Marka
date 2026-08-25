import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent } from '../lib/share'
import { isRead, setRead, type ReadKind } from '../lib/progress'

// Stopka czytanki i materialu edukacyjnego: odhaczenie „przeczytane", przejscie
// do pelnej wersji (gdy czytamy krotka) i udostepnienie. Jeden komponent dla obu
// modulow, bo uklad ma byc ten sam (decyzja autora 2026-08-25).

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
    <div className="no-print mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => setDone(setRead(kind, id, !done))}
        aria-pressed={done}
        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
          done
            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
            : 'border-slate-500/50 text-slate-200 hover:border-emerald-400'
        }`}
      >
        <span className="mr-1.5" aria-hidden>
          {done ? '☑' : '☐'}
        </span>
        {t('reading.done', 'Przeczytane')}
      </button>

      {showFull && (
        <button type="button" onClick={onShowFull} className={btn}>
          {t('reading.full', 'Czytaj pełną wersję')}
        </button>
      )}

      <button type="button" onClick={share} className={`${btn} ml-auto`}>
        {t('reading.share', 'Udostępnij')}
      </button>
      {toast && <span className="text-xs text-slate-400">{toast}</span>}
    </div>
  )
}
