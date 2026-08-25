import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { addBookmarks, removeBookmarksAt } from '../lib/bookmarks'
import { shareContent } from '../lib/share'
import { QuickNoteDialog } from './QuickNoteDialog'
import { VerseCompare } from './VerseCompare'

// Pasek akcji zaznaczonych wersetow. Stoi na dole ekranu, bo tam jest kciuk
// (decyzja autora 2026-08-25) i bo tekst nad nim nie skacze przy zaznaczaniu.
// Pasek ma z-50 i pelne tlo, wiec zaslania plywajacy przycisk notatki (z-40)
// z AddNoteFab - dwa przyciski notatki naraz w tym samym rogu mylilyby.
// Zaznaczyc mozna kilka wersetow naraz - kopiowanie, zakladka i notatka biora
// caly wybor. Porownanie przekladow ma sens tylko dla jednego wersetu.

/** „J 3,16", „J 3,16-18" albo „J 3,16 · J 3,20" - jeden opis calego wyboru. */
function label(selected: number[], refFor: (n: number) => string): string {
  if (selected.length === 0) return ''
  if (selected.length === 1) return refFor(selected[0])
  const first = selected[0]
  const last = selected[selected.length - 1]
  const ciagly = last - first + 1 === selected.length
  return ciagly ? `${refFor(first)}-${last}` : selected.map(refFor).join(' · ')
}

export function VerseActionBar({
  osis,
  chapter,
  translation,
  selected,
  refFor,
  textFor,
  bookmarked,
  onBookmarksChanged,
  onClose,
  skip,
  backPath,
}: {
  osis: string
  chapter: number
  translation: string
  /** numery wersetow rosnaco */
  selected: number[]
  refFor: (n: number) => string
  textFor: (n: number) => string
  bookmarked: Set<number>
  onBookmarksChanged: () => void
  onClose: () => void
  /** przeklady, ktore czytelnik ma juz przed oczami */
  skip: string[]
  /** sciezka powrotu zapisywana przy notatce */
  backPath: string
}) {
  const { t } = useI18n()
  const [compare, setCompare] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState(false)
  const [toast, setToast] = useState('')

  const ref = label(selected, refFor)
  const allMarked = selected.length > 0 && selected.every((n) => bookmarked.has(n))
  const quote = `„${selected.map(textFor).join(' ')}” (${ref})`

  // zmiana wyboru zamyka to, co dotyczylo poprzedniego
  useEffect(() => {
    setCompare(false)
    setNaming(false)
    setToast('')
  }, [selected.join(',')])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    const r = await shareContent({ title: ref, text: quote })
    setToast(
      r === 'shared'
        ? ''
        : r === 'copied'
          ? t('share.copied', 'Skopiowano')
          : t('share.failed', 'Nie udało się')
    )
  }

  function bookmark() {
    if (allMarked) {
      removeBookmarksAt(osis, chapter, selected)
      onBookmarksChanged()
      return
    }
    setName(ref)
    setNaming(true)
  }

  function saveBookmark() {
    addBookmarks(
      selected.map((n) => ({
        translation,
        osis,
        chapter,
        verse: n,
        ref: refFor(n),
        text: textFor(n),
        name: name.trim() || undefined,
      }))
    )
    setNaming(false)
    onBookmarksChanged()
  }

  const btn =
    'rounded-lg border border-slate-500/50 px-3 py-1.5 text-sm text-slate-100 transition hover:border-brand hover:bg-brand/10'

  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-slate-600/60 bg-slate-800 shadow-[0_-8px_24px_rgba(2,6,23,0.5)]">
        <div className="mx-auto max-w-3xl px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-light">{ref}</span>
            {selected.length > 1 && (
              <span className="shrink-0 text-xs text-slate-400">
                {selected.length} {t('bible.versesPicked', 'wersety')}
              </span>
            )}
            {toast && <span className="shrink-0 text-xs text-slate-400">{toast}</span>}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', 'Zamknij')}
              className="shrink-0 rounded px-2 py-1 text-slate-400 hover:text-slate-100"
            >
              ✕
            </button>
          </div>

          {compare && selected.length === 1 && (
            <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg bg-white/95 py-1">
              <VerseCompare osis={osis} chapter={chapter} verse={selected[0]} skip={skip} />
            </div>
          )}

          {naming ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveBookmark()
                  if (e.key === 'Escape') setNaming(false)
                }}
                placeholder={t('bible.bookmarkName', 'Nazwa zakładki')}
                aria-label={t('bible.bookmarkName', 'Nazwa zakładki')}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={saveBookmark}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light"
              >
                {t('notes.save', 'Zapisz')}
              </button>
              <button type="button" onClick={() => setNaming(false)} className={btn}>
                {t('notes.cancel', 'Anuluj')}
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" onClick={bookmark} className={btn}>
                <span className={allMarked ? 'text-amber-400' : ''} aria-hidden>
                  {allMarked ? '★ ' : '☆ '}
                </span>
                {allMarked ? t('bible.bookmarkOff', 'Usuń zakładkę') : t('bible.bookmarkOn', 'Zakładka')}
              </button>
              <button type="button" onClick={() => setNote(true)} className={btn}>
                ✎ {t('bible.note', 'Notatka')}
              </button>
              <button
                type="button"
                onClick={() => setCompare((v) => !v)}
                disabled={selected.length !== 1}
                title={
                  selected.length === 1
                    ? undefined
                    : t('bible.compareOne', 'Porównanie działa przy jednym zaznaczonym wersecie.')
                }
                aria-pressed={compare}
                className={`${btn} disabled:opacity-40 ${compare ? 'border-brand bg-brand/10' : ''}`}
              >
                {t('bible.compareVerse', 'Porównaj')}
              </button>
              <button type="button" onClick={copy} className={btn}>
                {t('bible.copy', 'Kopiuj / wyślij')}
              </button>
            </div>
          )}
        </div>
      </div>

      {note && (
        <QuickNoteDialog
          source={{ label: ref, path: backPath }}
          initialBody={`${quote}\n\n`}
          onClose={() => setNote(false)}
        />
      )}
    </>
  )
}
