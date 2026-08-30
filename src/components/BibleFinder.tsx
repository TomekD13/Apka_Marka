import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BIBLE_LIST_PATH, BIBLE_PATH, TranslationPicker, useBibleIndex } from '../pages/Bible'
import { BiblePicker } from './BiblePicker'
import { getLastRead, listBookmarks } from '../lib/bookmarks'

// Okienko Biblii w belce menu glownego - to samo, co na stronie `/pl/biblia`,
// tylko skrocone: wybor kafelkami, szukanie, powrot do ostatniego rozdzialu i zakladki.
// Ksztaltem idzie za SongFinder, zeby menu bylo jednolite.

const BOOKMARK_PREVIEW = 6

export function BibleFinder() {
  const { lang, t } = useI18n()
  const nav = useNavigate()
  const { code, index, failed, choose } = useBibleIndex()
  const [q, setQ] = useState('')
  const [marksOpen, setMarksOpen] = useState(false)
  const last = getLastRead()
  const marks = listBookmarks()

  if (failed) return <p className="text-slate-400">{t('bible.unavailable', 'Tekst Biblii jest niedostępny.')}</p>
  if (!index) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  function search(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query.length < 3) return
    nav(`/${lang}/${BIBLE_PATH}/szukaj?q=${encodeURIComponent(query)}&z=all`)
  }

  return (
    <div>
      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/30 p-3">
        <BiblePicker books={index.books} />

        <form onSubmit={search}>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-300">{t('bible.searchLabel', 'Szukaj słowa w Biblii')}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('bible.searchPlaceholder', 'np. dobry pasterz')}
              aria-label={t('bible.searchLabel', 'Szukaj słowa w Biblii')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
            />
          </label>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {last && (
            <Link
              to={`/${lang}/${BIBLE_PATH}/${last.osis}/${last.chapter}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-800 dark:text-emerald-100"
            >
              <span aria-hidden>↩</span>
              {t('bible.continue', 'Czytaj dalej')}: {last.ref}
            </Link>
          )}
          <Link to={`/${lang}/${BIBLE_LIST_PATH}`} className="text-brand-light hover:underline">
            {t('bible.allBooks', 'Spis ksiąg')}
          </Link>
          <Link to={`/${lang}/${BIBLE_PATH}/przeklady`} className="text-brand-light hover:underline">
            {t('bible.translations', 'Przekłady')}
          </Link>
          <TranslationPicker code={code} onChange={choose} className="ml-auto" />
        </div>
      </div>

      {marks.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMarksOpen((v) => !v)}
            aria-expanded={marksOpen}
            className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-100"
          >
            <span aria-hidden>★</span>
            <span className="flex-1 font-semibold">{t('bible.bookmarks', 'Zakładki')}</span>
            <span className="text-xs text-amber-200/80">{marks.length}</span>
            <span className={`transition-transform ${marksOpen ? 'rotate-90' : ''}`} aria-hidden>
              ›
            </span>
          </button>
          {marksOpen && (
            <div className="mt-1.5 space-y-1.5">
              {marks.slice(0, BOOKMARK_PREVIEW).map((b) => (
                <Link
                  key={b.id}
                  to={`/${lang}/${BIBLE_PATH}/${b.osis}/${b.chapter}?w=${b.verse}`}
                  className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand"
                >
                  <span className="text-sm font-semibold text-brand">{b.ref}</span>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{b.text}</p>
                </Link>
              ))}
              {marks.length > BOOKMARK_PREVIEW && (
                <Link
                  to={`/${lang}/${BIBLE_PATH}/zakladki`}
                  className="block text-sm text-brand-light hover:underline"
                >
                  {t('bible.allBookmarks', 'Wszystkie zakładki')} ({marks.length})
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
