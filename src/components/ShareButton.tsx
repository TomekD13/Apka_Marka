import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent } from '../lib/share'

/**
 * Przycisk „Udostępnij” na gorze materialu. Dwa miejsca (decyzja autora 2026-10-09):
 * - obok „Oznacz jako przeczytane” - tekst: sam adres materialu, jak „Udostępnij” w stopce;
 *   podglad linku (tytul i opis z gen_seo) robi reszte,
 * - w naglowku odtwarzacza - nagranie: adres z `?sluchaj` (strona otwiera sie przy
 *   odtwarzaczu) i krotki opis „Posłuchaj: …”. Pliku MP3 nie wysylamy - nagrania ida
 *   tylko strumieniowo.
 * Na telefonie otwiera systemowe okno udostepniania, na komputerze kopiuje do schowka.
 */
export function ShareButton({
  url,
  text = '',
  label,
  variant = 'small',
  className = '',
}: {
  /** domyslnie biezacy adres strony */
  url?: string
  /** opis wysylany razem z adresem; pusty = sam adres */
  text?: string
  /** opis dla czytnikow ekranu i dymek, np. „Udostępnij nagranie” */
  label?: string
  /** `small` - w naglowku odtwarzacza, `pill` - obok „Oznacz jako przeczytane” */
  variant?: 'small' | 'pill'
  className?: string
}) {
  const { t } = useI18n()
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  async function share() {
    const r = await shareContent({ text, url: url ?? window.location.href })
    // „failed” to najczesciej zamkniete okno udostepniania - wtedy nic nie mowimy
    if (r === 'copied') setToast(t('share.copied', 'Skopiowano'))
  }

  const word = t('reading.share', 'Udostępnij')
  const name = label || word
  const icon = (
    <svg viewBox="0 0 24 24" className={variant === 'pill' ? 'h-5 w-5' : 'h-4 w-4'} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" strokeLinecap="round" />
    </svg>
  )
  const status = toast && (
    <span role="status" className="text-xs text-slate-400">
      {toast}
    </span>
  )

  if (variant === 'pill')
    return (
      <span className={`no-print inline-flex items-center gap-2 ${className}`}>
        {/* na waskim ekranie sama ikona - inaczej nie miesci sie obok „Oznacz jako przeczytane” */}
        <button
          type="button"
          onClick={share}
          aria-label={name}
          title={name}
          className="inline-flex items-center gap-2 rounded-full border-2 border-slate-500/50 px-2 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-brand hover:text-slate-100 sm:px-3.5"
        >
          {icon}
          <span className="hidden sm:inline">{word}</span>
        </button>
        {status}
      </span>
    )

  return (
    <span className={`no-print inline-flex shrink-0 items-center gap-2 ${className}`}>
      {status}
      <button
        type="button"
        onClick={share}
        aria-label={name}
        title={name}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-500/40 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-brand/20 hover:text-white"
      >
        {icon}
        {word}
      </button>
    </span>
  )
}
