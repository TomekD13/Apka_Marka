import { useState } from 'react'
import { useI18n } from '../i18n'

const BASE = import.meta.env.BASE_URL

// spisy, ktore zmieniaja sie codziennie (nowy material, nowy dzien, nowa lekcja)
const LISTS = ['index.json', 'ui.json', 'edu/index.json', 'pray40/index.json', 'groups/index.json', 'sabbath-extra.json', 'prayer-music.json']

/**
 * Service worker podaje tresc „najpierw z zapasu”: czytelnik widzi spis z poprzedniej wizyty,
 * a nowy dociaga sie dopiero w tle. Przycisk pobiera spisy prosto z sieci, wklada je do zapasu
 * service workera pod zwyklym adresem, sprawdza nowa wersje aplikacji i przeladowuje strone.
 * Bez sieci tylko przeladowuje - nic z zapasu nie znika (pobrany modul offline zostaje).
 */
export async function refreshContent(lang: string) {
  try {
    const store = 'caches' in window ? await caches.open('content') : null
    await Promise.all(LISTS.map(async (f) => {
      const url = `${BASE}content/${lang}/${f}`.replace(/\/{2,}/g, '/')
      try {
        const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'reload' })
        if (res.ok && store) await store.put(new URL(url, location.origin).href, res)
      } catch { /* bez sieci albo brak pliku - zostaje to, co bylo */ }
    }))
  } catch { /* Cache Storage niedostepny (np. tryb prywatny) */ }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch { /* bez service workera */ }
  location.reload()
}

export function RefreshButton({ className = '' }: { className?: string }) {
  const { lang, t } = useI18n()
  const [busy, setBusy] = useState(false)
  return (
    <div className={`no-print text-center ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => { setBusy(true); void refreshContent(lang) }}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-60 dark:border-white/20 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:text-sky-300"
      >
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v4h-4" />
        </svg>
        {busy ? t('refresh.busy', 'Odświeżam…') : t('refresh.button', 'Odśwież')}
      </button>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        {t('refresh.hint', 'Nie widzisz dzisiejszego materiału? Odśwież – pobierzemy najnowszą listę.')}
      </p>
    </div>
  )
}
