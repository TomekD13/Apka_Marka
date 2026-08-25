import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { usePlace } from '../place'
import { QuickNoteDialog } from './QuickNoteDialog'

/**
 * Niewielki plywajacy przycisk "nowa notatka" - towarzyszy czytaniu i otwiera
 * okienko nad tekstem, bez opuszczania strony. Zapisuje, przy czym notatka
 * powstala. Znika na ekranach notatek i przy druku.
 */
export function AddNoteFab() {
  const { lang, t } = useI18n()
  const { pathname, search } = useLocation()
  const place = usePlace()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (pathname.includes(`/${lang}/notatki`)) return null

  const source = place ? { label: place, path: pathname + search } : undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('notes.new', 'Nowa notatka')}
        aria-label={t('notes.new', 'Nowa notatka')}
        className="no-print fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-brand/95 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:bg-brand-light"
      >
        <span className="text-base leading-none" aria-hidden>✎</span>
        <span className="hidden sm:inline">{t('notes.fabShort', 'Notatka')}</span>
      </button>

      {open && (
        <QuickNoteDialog
          source={source}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        />
      )}

      {saved && (
        <div className="no-print fixed bottom-20 right-4 z-40 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-100 shadow-lg ring-1 ring-white/10">
          {t('notes.saved', 'Zapisano notatkę')}
        </div>
      )}
    </>
  )
}
