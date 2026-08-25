import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { saveNote } from '../lib/notes'

/**
 * Szybka notatka: plywajace okienko z jednym polem, bez tytulu i odnosnika -
 * zeby mysl dalo sie zapisac bez odrywania sie od czytania. Tytul na liscie
 * bierze sie z pierwszej linii tresci; pelna edycja jest na stronie notatek.
 */
export function QuickNoteDialog({
  source,
  onClose,
  onSaved,
}: {
  source?: { label: string; path: string }
  onClose: () => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    areaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Ctrl/Cmd+Enter zapisuje bez siegania do myszy
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body])

  function titleFromBody(text: string): string {
    const first = text.trim().split('\n')[0].trim()
    if (!first) return t('notes.untitled', 'Bez tytułu')
    return first.length > 60 ? first.slice(0, 60).trimEnd() + '…' : first
  }

  function save() {
    if (!body.trim()) {
      onClose()
      return
    }
    const saved = saveNote({ title: titleFromBody(body), body, source })
    if (!saved) {
      setError(
        t('notes.saveFailed', 'Nie udało się zapisać – przeglądarka blokuje zapis danych (np. tryb prywatny).')
      )
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notes.new', 'Nowa notatka')}
        className="w-full max-w-lg rounded-2xl border border-slate-600/50 bg-slate-800 p-4 shadow-2xl"
      >
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-bold text-slate-100">{t('notes.new', 'Nowa notatka')}</h2>
          {source && <span className="truncate text-xs text-slate-400">{source.label}</span>}
        </div>

        <textarea
          ref={areaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder={t('notes.quickPlaceholder', 'Zapisz myśl…')}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 leading-relaxed text-slate-900 outline-none focus:border-brand"
        />

        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-500/50 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-300"
          >
            {t('notes.cancel', 'Anuluj')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!body.trim()}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
          >
            {t('notes.save', 'Zapisz')}
          </button>
        </div>
      </div>
    </div>
  )
}
