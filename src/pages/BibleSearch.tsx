import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { useSetPlace } from '../place'
import { VerseText } from '../components/VerseText'
import { formatRef, parseRef, searchBible, type SearchHit, type SearchScope } from '../lib/bible'
import { BIBLE_PATH, TranslationPicker, useBibleIndex } from './Bible'

// Wyszukiwarka po calym przekladzie. Tekst pobiera sie ksiega po ksiedze, wiec
// pierwsze trafienia widac, zanim sciagnie sie cala Biblia (3,9 MB). Po „Pobierz
// offline" wszystko jest juz w cache i szukanie idzie od razu.

const MIN = 3
const LIMIT = 300

export function BibleSearchPage() {
  const { lang, t } = useI18n()
  const { code, index, failed, choose } = useBibleIndex()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [scope, setScope] = useState<SearchScope>((params.get('z') as SearchScope) || 'all')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [ran, setRan] = useState('')
  const runId = useRef(0)

  useSetPlace(t('bible.search', 'Szukaj w Biblii'))

  // szukanie rusza z adresu (?q=…), zeby wynik dalo sie odeslac linkiem
  useEffect(() => {
    const query = params.get('q') || ''
    const z = (params.get('z') as SearchScope) || 'all'
    if (!index || query.trim().length < MIN) return
    if (ran === `${code}|${z}|${query}`) return

    const id = ++runId.current
    setRan(`${code}|${z}|${query}`)
    setHits([])
    setProgress({ done: 0, total: index.books.length })
    searchBible(lang, code, query, {
      books: index.books,
      scope: z,
      limit: LIMIT,
      shouldStop: () => runId.current !== id,
      onBatch: (batch, done, total) => {
        if (runId.current !== id) return
        setProgress({ done, total })
        if (batch.length) setHits((prev) => [...prev, ...batch])
      },
    })
      .then(() => {
        if (runId.current === id) setProgress(null)
      })
      .catch(() => {
        if (runId.current === id) setProgress(null)
      })
  }, [lang, code, index, params, ran])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query.length < MIN) return
    setParams({ q: query, z: scope })
  }

  const query = params.get('q') || ''
  const running = progress !== null
  // wpisany odnosnik („J 3,16") nie jest szukaniem slowa - dajemy skrot wprost do wersetu
  const jump = index && query ? parseRef(query, index.books) : null

  if (failed) return <p className="text-slate-400">{t('bible.unavailable', 'Tekst Biblii jest niedostępny.')}</p>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('bible.search', 'Szukaj w Biblii')}</h1>
        <TranslationPicker code={code} onChange={choose} />
      </div>

      <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/30 p-3">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-slate-300">{t('bible.searchLabel', 'Szukane słowa')}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder={t('bible.searchPlaceholder', 'np. dobry pasterz')}
              aria-label={t('bible.searchLabel', 'Szukane słowa')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={q.trim().length < MIN}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
          >
            {t('bible.searchGo', 'Szukaj')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          {(
            [
              ['all', t('bible.scopeAll', 'cała Biblia')],
              ['ot', t('bible.ot', 'Stary Testament')],
              ['nt', t('bible.nt', 'Nowy Testament')],
            ] as [SearchScope, string][]
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="bible-scope"
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {label}
            </label>
          ))}
          <BackLink to={`/${lang}/${BIBLE_PATH}`} className="ml-auto">
            {t('bible.allBooks', 'Spis ksiąg')}
          </BackLink>
        </div>
      </form>

      {jump && (
        <Link
          to={`/${lang}/${BIBLE_PATH}/${jump.book.osis}/${jump.chapter}${jump.verse ? `?w=${jump.verse}` : ''}`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand/50 bg-brand/10 px-3 py-1.5 text-sm text-brand-light"
        >
          <span aria-hidden>→</span>
          {t('bible.goToRef', 'Przejdź do')}: {formatRef(jump.book, jump.chapter, jump.verse, jump.verseTo)}
        </Link>
      )}

      {query.length >= MIN && (
        <div className="mt-4">
          <p className="text-xs text-slate-400">
            {t('bible.found', 'Znaleziono')}: {hits.length}
            {hits.length >= LIMIT && ` – ${t('bible.limit', 'pokazujemy pierwsze')} ${LIMIT}`}
            {running && progress && ` · ${t('bible.searching', 'szukam')} ${progress.done}/${progress.total}`}
          </p>

          <ul className="mt-2 space-y-1.5">
            {hits.map((h) => (
              <li key={`${h.osis}.${h.chapter}.${h.verse}`}>
                <Link
                  to={`/${lang}/${BIBLE_PATH}/${h.osis}/${h.chapter}?w=${h.verse}`}
                  className="block rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 transition hover:border-brand"
                >
                  <span className="text-sm font-semibold text-brand">
                    {h.abbr} {h.chapter},{h.verse}
                  </span>
                  <p className="mt-0.5 text-sm">
                    <VerseText text={h.text} mark={query} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {!running && hits.length === 0 && (
            <p className="mt-2 text-sm text-slate-400">{t('bible.noResults', 'Nic nie znaleziono.')}</p>
          )}
        </div>
      )}
    </div>
  )
}
