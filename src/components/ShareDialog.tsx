import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent, type ShareResult } from '../lib/share'

// Okno edycji udostepnianej tresci: uzytkownik moze dopisac cos od siebie,
// usunac fragment albo zdecydowac czy dolaczyc link. Bez sledzenia.
type Props = {
  open: boolean
  onClose: () => void
  initialText: string
  url?: string
  title?: string
  onResult?: (res: ShareResult) => void
}

export function ShareDialog({ open, onClose, initialText, url, title, onResult }: Props) {
  const { t } = useI18n()
  const [text, setText] = useState(initialText)
  const [includeLink, setIncludeLink] = useState(true)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setText(initialText)
      setIncludeLink(true)
    }
  }, [open, initialText])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const finish = async (res: ShareResult) => {
    onResult?.(res)
    onClose()
  }

  const doShare = async () => {
    const res = await shareContent({ title, text, url: includeLink ? url : undefined })
    if (res === 'failed') return // np. uzytkownik anulowal natywne okno - zostajemy
    finish(res)
  }

  const doCopy = async () => {
    const full = [text, includeLink ? url : ''].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(full)
      finish('copied')
    } catch {
      finish('failed')
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 text-slate-800 shadow-xl [color-scheme:light] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900">{t('share.title', 'Udostępnij')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('share.hint', 'Możesz dopisać coś od siebie albo usunąć część tekstu przed wysłaniem.')}
        </p>

        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        {url && (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeLink}
              onChange={(e) => setIncludeLink(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            {t('share.includeLink', 'Dołącz link do aplikacji')}
          </label>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('share.cancel', 'Anuluj')}
          </button>
          <button
            onClick={doCopy}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            {t('share.copy', 'Kopiuj')}
          </button>
          <button
            onClick={doShare}
            className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-light"
          >
            ↗ {t('share.send', 'Wyślij')}
          </button>
        </div>
      </div>
    </div>
  )
}
