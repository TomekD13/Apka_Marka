import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSetPlace } from '../place'
import { BiblePicker } from '../components/BiblePicker'
import { VerseText } from '../components/VerseText'
import { VerseCompare } from '../components/VerseCompare'
import { shareContent } from '../lib/share'
import {
  formatRef,
  getBibleSplit,
  getChosenTranslation,
  getSecondTranslation,
  loadBibleBook,
  loadBibleIndex,
  listTranslations,
  setBibleSplit,
  setChosenTranslation,
  setSecondTranslation,
  stripTags,
  type BibleSplit,
} from '../lib/bible'
import {
  bookmarkedVerses,
  getLastRead,
  listBookmarks,
  removeBookmark,
  saveLastRead,
  toggleBookmark,
} from '../lib/bookmarks'
import type { BibleIndex } from '../types'

// Czytnik Pisma. Tekst przekladu lezy poza kodem (`content/{lang}/bible/…`),
// tak samo jak studia i piesni - kod nie zna ani jednego wersetu.

export const BIBLE_PATH = 'biblia'

/** Spis ksiag wybranego przekladu; przy braku wybranego wraca do domyslnego z serwera. */
export function useBibleIndex() {
  const { lang } = useI18n()
  const [code, setCode] = useState<string>(() => getChosenTranslation())
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setIndex(null)
    setFailed(false)
    loadBibleIndex(lang, code)
      .then((i) => alive && setIndex(i))
      .catch(async () => {
        // wybrany przeklad zniknal (np. czytelnik usunal modul) - wracamy do domyslnego
        try {
          const { default: fallback } = await listTranslations(lang)
          if (!alive || fallback === code) throw new Error('no-fallback')
          setChosenTranslation(fallback)
          setCode(fallback)
        } catch {
          if (alive) setFailed(true)
        }
      })
    return () => {
      alive = false
    }
  }, [lang, code])

  function choose(next: string) {
    setChosenTranslation(next)
    setCode(next)
  }

  return { code, index, failed, choose }
}

/** Przelacznik przekladu - widoczny wszedzie, gdzie czyta sie tekst. */
export function TranslationPicker({
  code,
  onChange,
  className = '',
}: {
  code: string
  onChange: (code: string) => void
  className?: string
}) {
  const { lang, t } = useI18n()
  const [items, setItems] = useState<{ code: string; name: string }[]>([])

  useEffect(() => {
    listTranslations(lang)
      .then((r) => setItems(r.translations.map((x) => ({ code: x.code, name: x.name }))))
      .catch(() => setItems([]))
  }, [lang])

  return (
    <label className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      <span className="sr-only">{t('bible.translation', 'Przekład')}</span>
      <select
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
      >
        {items.length === 0 && <option value={code}>{code}</option>}
        {items.map((x) => (
          <option key={x.code} value={x.code}>
            {x.code} – {x.name}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Strona wejsciowa: wybor miejsca kafelkami, ostatnio czytane, odnosniki do reszty. */
export function BiblePage() {
  const { lang, t } = useI18n()
  const { code, index, failed, choose } = useBibleIndex()
  useSetPlace(t('bible.title', 'Biblia'))
  const last = getLastRead()

  if (failed)
    return <p className="text-slate-400">{t('bible.unavailable', 'Tekst Biblii jest niedostępny.')}</p>
  if (!index) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('bible.title', 'Biblia')}</h1>
        <TranslationPicker code={code} onChange={choose} />
      </div>
      <p className="mt-1 text-sm text-slate-400">{index.name}</p>

      <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-slate-900/30 p-3">
        <BiblePicker books={index.books} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to={`/${lang}/${BIBLE_PATH}/szukaj`} className="text-brand-light hover:underline">
            {t('bible.search', 'Szukaj w Biblii')}
          </Link>
          <Link to={`/${lang}/${BIBLE_PATH}/zakladki`} className="text-brand-light hover:underline">
            {t('bible.bookmarks', 'Zakładki')}
          </Link>
          <Link to={`/${lang}/${BIBLE_PATH}/przeklady`} className="text-brand-light hover:underline">
            {t('bible.translations', 'Przekłady i tryb offline')}
          </Link>
        </div>
        {last && (
          <Link
            to={`/${lang}/${BIBLE_PATH}/${last.osis}/${last.chapter}`}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-100"
          >
            <span aria-hidden>↩</span>
            {t('bible.continue', 'Czytaj dalej')}: {last.ref}
          </Link>
        )}
      </div>

    </div>
  )
}

/** Pasek akcji dla zaznaczonego wersetu. */
function VerseActions({
  refLabel,
  text,
  bookmarked,
  onBookmark,
  onClose,
  osis,
  chapter,
  verse,
  skip,
}: {
  refLabel: string
  text: string
  bookmarked: boolean
  onBookmark: () => void
  onClose: () => void
  osis: string
  chapter: number
  verse: number
  skip: string[]
}) {
  const { t } = useI18n()
  const [toast, setToast] = useState('')
  const [others, setOthers] = useState(false)

  async function share() {
    const r = await shareContent({ title: refLabel, text: `„${text}” (${refLabel})` })
    setToast(
      r === 'shared'
        ? ''
        : r === 'copied'
          ? t('share.copied', 'Skopiowano')
          : t('share.failed', 'Nie udało się')
    )
  }

  return (
    <div className="no-print mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm">
      <span className="font-medium text-brand">{refLabel}</span>
      <button
        type="button"
        onClick={onBookmark}
        className={`rounded px-2 py-1 ${bookmarked ? 'text-amber-600' : 'text-slate-600 hover:text-amber-600'}`}
      >
        {bookmarked ? '★ ' : '☆ '}
        {bookmarked ? t('bible.bookmarkOff', 'Usuń zakładkę') : t('bible.bookmarkOn', 'Zakładka')}
      </button>
      <button type="button" onClick={share} className="rounded px-2 py-1 text-slate-600 hover:text-brand">
        {t('bible.copy', 'Kopiuj / wyślij')}
      </button>
      <button
        type="button"
        onClick={() => setOthers((v) => !v)}
        aria-expanded={others}
        className={`rounded px-2 py-1 ${others ? 'text-brand' : 'text-slate-600 hover:text-brand'}`}
      >
        {t('bible.otherTranslations', 'Inne przekłady')}
      </button>
      {toast && <span className="text-xs text-slate-500">{toast}</span>}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close', 'Zamknij')}
        className="ml-auto rounded px-2 py-1 text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
      {others && (
        <div className="w-full border-t border-slate-300 pt-1.5">
          <VerseCompare osis={osis} chapter={chapter} verse={verse} skip={skip} />
        </div>
      )}
    </div>
  )
}

/** Czytnik rozdzialu. */
export function BibleChapterPage() {
  const { lang, t } = useI18n()
  const nav = useNavigate()
  const { book = '', chapter = '1' } = useParams()
  const [params, setParams] = useSearchParams()
  const { code, index, failed, choose } = useBibleIndex()
  const [chapters, setChapters] = useState<string[][] | null>(null)
  const [missing, setMissing] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [marks, setMarks] = useState<Set<number>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  // drugi przeklad czytany rownolegle - pusty kod znaczy: czytamy jeden
  const [second, setSecond] = useState<string>(getSecondTranslation)
  const [split, setSplit] = useState<BibleSplit>(getBibleSplit)
  const [secondText, setSecondText] = useState<string[][] | null>(null)
  const [codes, setCodes] = useState<{ code: string; name: string }[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)

  const ch = Math.max(1, Number(chapter) || 1)
  const meta = index?.books.find((b) => b.osis === book)
  const refLabel = meta ? formatRef(meta, ch) : book
  const wanted = Number(params.get('w') || 0)

  useSetPlace(meta ? `${refLabel} (${code})` : undefined)
  const skip = second ? [code, second] : [code]

  useEffect(() => {
    listTranslations(lang)
      .then((r) => setCodes(r.translations.map((x) => ({ code: x.code, name: x.name }))))
      .catch(() => setCodes([]))
  }, [lang])

  useEffect(() => {
    if (!second || !meta) {
      setSecondText(null)
      return
    }
    let alive = true
    setSecondText(null)
    loadBibleBook(lang, second, meta.osis)
      .then((c) => alive && setSecondText(c))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [lang, second, meta])

  function pickSecond(next: string) {
    setSecond(next)
    setSecondTranslation(next)
  }

  function pickSplit(next: BibleSplit) {
    setSplit(next)
    setBibleSplit(next)
  }

  useEffect(() => {
    if (!index || !meta) return
    let alive = true
    setChapters(null)
    setMissing(false)
    loadBibleBook(lang, code, meta.osis)
      .then((c) => alive && setChapters(c))
      .catch(() => alive && setMissing(true))
    return () => {
      alive = false
    }
  }, [lang, code, index, meta])

  useEffect(() => {
    if (meta) {
      setMarks(bookmarkedVerses(meta.osis, ch))
      saveLastRead({ translation: code, osis: meta.osis, chapter: ch, ref: refLabel })
    }
    setActive(null)
  }, [meta, ch, code, refLabel])

  // wejscie z odnosnikiem („?w=16") - przewijamy do wersetu, gdy tekst juz jest
  useEffect(() => {
    if (!wanted || !chapters) return
    const el = bodyRef.current?.querySelector(`[data-verse="${wanted}"]`)
    el?.scrollIntoView({ block: 'center' })
    setActive(wanted)
  }, [wanted, chapters])

  if (failed) return <p className="text-slate-400">{t('bible.unavailable', 'Tekst Biblii jest niedostępny.')}</p>
  if (!index) return <p className="text-slate-400">{t('common.loading', '…')}</p>
  if (!meta)
    return (
      <p className="text-slate-400">
        {t('bible.noBook', 'Nie ma takiej księgi w tym przekładzie.')}{' '}
        <Link to={`/${lang}/${BIBLE_PATH}`} className="text-brand-light hover:underline">
          {t('bible.title', 'Biblia')}
        </Link>
      </p>
    )

  const maxCh = meta.chapters.length
  const verses = chapters?.[ch - 1] || []
  const books = index.books
  const bookAt = books.findIndex((b) => b.osis === meta.osis)

  /** Krok o rozdzial - przez granice ksiag, tak jak przy przewracaniu kartki. */
  function step(delta: number) {
    const next = ch + delta
    if (next >= 1 && next <= maxCh) {
      nav(`/${lang}/${BIBLE_PATH}/${meta!.osis}/${next}`)
      return
    }
    const nb = books[bookAt + delta]
    if (!nb) return
    nav(`/${lang}/${BIBLE_PATH}/${nb.osis}/${delta > 0 ? 1 : nb.chapters.length}`)
  }

  function onVerseClick(n: number) {
    setActive((cur) => (cur === n ? null : n))
    if (wanted) {
      params.delete('w')
      setParams(params, { replace: true })
    }
  }

  function onToggleBookmark(n: number) {
    const on = toggleBookmark({
      translation: code,
      osis: meta!.osis,
      chapter: ch,
      verse: n,
      ref: formatRef(meta!, ch, n),
      text: stripTags(verses[n - 1] || ''),
    })
    setMarks((prev) => {
      const next = new Set(prev)
      if (on) next.add(n)
      else next.delete(n)
      return next
    })
  }

  return (
    <article>
      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:border-slate-400"
        >
          {meta.name} {ch} <span className="text-slate-400">▾</span>
        </button>
        <TranslationPicker code={code} onChange={choose} />
        {second ? (
          <>
            <span className="text-xs text-slate-500" aria-hidden>
              +
            </span>
            <TranslationPicker code={second} onChange={pickSecond} />
            <div className="inline-flex overflow-hidden rounded-md border border-slate-600 text-xs">
              {(['pion', 'poziom'] as BibleSplit[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => pickSplit(v)}
                  aria-pressed={split === v}
                  className={`px-2 py-1 ${
                    split === v ? 'bg-brand text-white' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {v === 'pion'
                    ? t('bible.splitVertical', 'obok siebie')
                    : t('bible.splitHorizontal', 'jeden pod drugim')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => pickSecond('')}
              aria-label={t('bible.compareOff', 'Czytaj jeden przekład')}
              className="rounded px-1.5 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </>
        ) : (
          codes.length > 1 && (
            <button
              type="button"
              onClick={() => pickSecond((codes.find((x) => x.code !== code) || codes[0]).code)}
              className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-400"
            >
              {t('bible.compare', 'Dwa przekłady')}
            </button>
          )
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t('bible.prev', 'Poprzedni rozdział')}
            className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-sm text-slate-200 hover:border-slate-400"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t('bible.next', 'Następny rozdział')}
            className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-sm text-slate-200 hover:border-slate-400"
          >
            ›
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="no-print mt-2 space-y-3 rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <div>
            <p className="mb-1.5 text-xs text-slate-300">{t('bible.chapter', 'Rozdział')}</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: maxCh }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  to={`/${lang}/${BIBLE_PATH}/${meta.osis}/${n}`}
                  onClick={() => setPickerOpen(false)}
                  className={`min-w-[2rem] rounded px-2 py-1 text-center text-sm ${
                    n === ch ? 'bg-brand text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {n}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-slate-300">{t('bible.book', 'Księga')}</p>
            <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4">
              {books.map((b) => (
                <Link
                  key={b.osis}
                  to={`/${lang}/${BIBLE_PATH}/${b.osis}/1`}
                  onClick={() => setPickerOpen(false)}
                  className={`truncate rounded px-2 py-1 text-xs ${
                    b.osis === meta.osis ? 'bg-brand text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={b.name}
                >
                  {b.abbr}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <h1 className="mt-4 text-2xl font-semibold leading-tight">
        {meta.name} {ch}
      </h1>

      <div
        className={`mt-3 ${
          second ? (split === 'pion' ? 'grid items-start gap-3 sm:grid-cols-2' : 'space-y-3') : ''
        }`}
      >
      <div
        ref={bodyRef}
        className="verse-box rounded-xl border border-slate-200 bg-white p-4 text-[1.05rem] leading-relaxed text-slate-800"
      >
        {second && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{code}</p>
        )}
        {missing ? (
          <p className="text-slate-500">{t('bible.unavailable', 'Tekst Biblii jest niedostępny.')}</p>
        ) : !chapters ? (
          <p className="text-slate-500">{t('common.loading', '…')}</p>
        ) : (
          verses.map((text, i) => {
            const n = i + 1
            if (!text) return null
            const isActive = active === n
            return (
              <div key={n} data-verse={n}>
                <p
                  onClick={() => onVerseClick(n)}
                  className={`cursor-pointer rounded px-1 py-0.5 transition ${
                    isActive ? 'bg-amber-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-1.5 align-super text-xs font-semibold tabular-nums text-brand">
                    {n}
                  </span>
                  {marks.has(n) && (
                    <span className="mr-1 text-amber-500" aria-label={t('bible.bookmarks', 'Zakładki')}>
                      ★
                    </span>
                  )}
                  <VerseText text={text} />
                </p>
                {isActive && (
                  <VerseActions
                    refLabel={formatRef(meta, ch, n)}
                    text={stripTags(text)}
                    bookmarked={marks.has(n)}
                    onBookmark={() => onToggleBookmark(n)}
                    onClose={() => setActive(null)}
                    osis={meta.osis}
                    chapter={ch}
                    verse={n}
                    skip={skip}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {second && (
        <div className="verse-box rounded-xl border border-slate-200 bg-white p-4 text-[1.05rem] leading-relaxed text-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{second}</p>
          {!secondText ? (
            <p className="text-slate-500">{t('common.loading', '…')}</p>
          ) : (
            (secondText[ch - 1] || []).map((text, i) =>
              text ? (
                <p key={i} className="px-1 py-0.5">
                  <span className="mr-1.5 align-super text-xs font-semibold tabular-nums text-brand">
                    {i + 1}
                  </span>
                  <VerseText text={text} />
                </p>
              ) : null
            )
          )}
        </div>
      )}
      </div>

      <div className="no-print mt-4 flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-slate-400"
        >
          ‹ {t('bible.prev', 'Poprzedni rozdział')}
        </button>
        <Link to={`/${lang}/${BIBLE_PATH}`} className="text-brand-light hover:underline">
          {t('bible.allBooks', 'Spis ksiąg')}
        </Link>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-slate-400"
        >
          {t('bible.next', 'Następny rozdział')} ›
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">{index.license}</p>
    </article>
  )
}

/** Zakladki czytelnika - lista z odnosnikiem i tekstem zapamietanym przy dodaniu. */
export function BibleBookmarksPage() {
  const { lang, t } = useI18n()
  const [items, setItems] = useState(() => listBookmarks())
  useSetPlace(t('bible.bookmarks', 'Zakładki'))

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t('bible.bookmarks', 'Zakładki')}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {t('bible.bookmarksNote', 'Zakładki zostają w tej przeglądarce – nic nie wychodzi na serwer.')}
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-slate-400">
          {t('bible.noBookmarks', 'Nie ma jeszcze żadnej zakładki. Kliknij werset w czytniku i wybierz „Zakładka”.')}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((b) => (
            <li key={b.id} className="rounded-lg border border-slate-200 bg-white p-3 text-slate-800">
              <div className="flex items-start gap-2">
                <Link
                  to={`/${lang}/${BIBLE_PATH}/${b.osis}/${b.chapter}?w=${b.verse}`}
                  className="min-w-0 flex-1"
                >
                  <span className="font-semibold text-brand">{b.ref}</span>
                  <span className="ml-2 text-xs text-slate-500">{b.translation}</span>
                  <p className="mt-0.5 text-sm">{b.text}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    removeBookmark(b.id)
                    setItems(listBookmarks())
                  }}
                  aria-label={t('bible.bookmarkOff', 'Usuń zakładkę')}
                  className="shrink-0 rounded px-2 py-1 text-slate-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 text-sm">
        <Link to={`/${lang}/${BIBLE_PATH}`} className="text-brand-light hover:underline">
          {t('bible.allBooks', 'Spis ksiąg')}
        </Link>
      </div>
    </div>
  )
}
