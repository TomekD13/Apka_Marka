import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent } from '../lib/share'

/**
 * Maly przycisk „Udostępnij” na gorze materialu (obok odtwarzacza nagrania).
 * Jak „Udostępnij” w stopce: przekazuje sam adres materialu - podglad linku
 * (tytul i opis z gen_seo) robi reszte. Na telefonie otwiera systemowe okno
 * udostepniania, na komputerze kopiuje adres do schowka.
 */
export function ShareButton({ url, className = '' }: { url?: string; className?: string }) {
  const { t } = useI18n()
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  async function share() {
    const r = await shareContent({ text: '', url: url ?? window.location.href })
    // „failed” to najczesciej zamkniete okno udostepniania - wtedy nic nie mowimy
    if (r === 'copied') setToast(t('share.copied', 'Skopiowano'))
  }

  const label = t('reading.share', 'Udostępnij')
  return (
    <span className={`no-print inline-flex shrink-0 items-center gap-2 ${className}`}>
      {toast && (
        <span role="status" className="text-xs text-slate-400">
          {toast}
        </span>
      )}
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-500/40 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-brand/20 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" strokeLinecap="round" />
        </svg>
        {label}
      </button>
    </span>
  )
}
