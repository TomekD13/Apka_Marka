import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { loadSongs } from '../content'
import { useSetPlace } from '../place'
import { isFavorite, listFavorites, toggleFavorite } from '../lib/favorites'
import type { Song, SongCollection, SongsFile } from '../types'

/** Adres kolekcji w aplikacji - obie mają własną trasę i własne ulubione. */
export const SONG_PATH: Record<SongCollection, string> = {
  hymnal: 'spiewnik',
  youth: 'piesni-mlodziezowe',
}

/** Przy 745 piesniach lista trafien musi miec kres - reszte czytelnik zawezi slowem. */
const SEARCH_LIMIT = 40

/** Porownanie bez ogonkow: "boze" ma znalezc "Boze". */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function songText(song: Song): string {
  return [song.refrain, song.bridge, ...song.stanzas.map((s) => s.text)].filter(Boolean).join(' ')
}

/** Fragment tekstu wokol trafienia - zeby bylo widac, dlaczego piesn sie znalazla. */
function snippet(text: string, needle: string): string {
  const i = fold(text).indexOf(fold(needle))
  if (i < 0) return ''
  const from = Math.max(0, i - 40)
  const to = Math.min(text.length, i + needle.length + 60)
  return (from > 0 ? '…' : '') + text.slice(from, to).trim() + (to < text.length ? '…' : '')
}

function useSongs(collection: SongCollection) {
  const { lang } = useI18n()
  const [data, setData] = useState<SongsFile | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setData(null)
    setFailed(false)
    loadSongs(lang, collection)
      .then(setData)
      .catch(() => setFailed(true))
  }, [lang, collection])
  return { data, failed }
}

/** Gwiazdka przy pieśni. Ulubione żyją w tej przeglądarce, osobno dla każdej kolekcji. */
export function FavoriteStar({
  collection,
  nr,
  onChange,
  className = '',
}: {
  collection: SongCollection
  nr: number
  onChange?: () => void
  className?: string
}) {
  const { t } = useI18n()
  const [on, setOn] = useState(() => isFavorite(collection, nr))
  const label = on
    ? t('songs.unfavorite', 'Usuń z ulubionych')
    : t('songs.favorite', 'Dodaj do ulubionych')
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOn(toggleFavorite(collection, nr))
        onChange?.()
      }}
      className={`shrink-0 rounded px-1 text-lg leading-none transition ${
        on ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'
      } ${className}`}
    >
      {on ? '★' : '☆'}
    </button>
  )
}

/**
 * Linijka tekstu z akordami. W spiewnikach obozowych akordy stoja nad tekstem -
 * przy tekscie, ktory sie przelewa, tej pozycji nie da sie utrzymac, wiec
 * ekstraktor stawia je na koncu linijki, za "//" (tools/extract_youth.py).
 */
function Lyrics({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const cut = line.indexOf(' // ')
        return (
          <span key={i} className="block">
            {cut < 0 ? line : line.slice(0, cut)}
            {cut >= 0 && (
              <span className="ml-2 font-mono text-xs tracking-wide text-amber-300/70">
                {line.slice(cut + 4)}
              </span>
            )}
          </span>
        )
      })}
    </>
  )
}

/**
 * Uklad jak w druku: refren raz, w miejscu, w ktorym stoi w spiewniku (po pierwszej zwrotce).
 * Piesni z lamanym wierszem (rozdzial 41, spiewniki obozowe) zachowuja podzial na wiersze.
 * Piesn jednozwrotkowa (`single`) nie dostaje numeru, bo w druku tez go nie ma.
 */
export function SongBody({ song }: { song: Song }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      {song.stanzas.map((s, i) => (
        <div key={s.n}>
          <p className="flex gap-2 leading-relaxed text-slate-200">
            {!song.single && (
              <span className="w-5 shrink-0 text-right text-sm tabular-nums text-slate-400">{s.n}.</span>
            )}
            <span className="min-w-0 flex-1">
              <Lyrics text={s.text} />
            </span>
          </p>
          {song.refrain && i === 0 && (
            <p
              className={`mt-2 flex gap-2 italic leading-relaxed text-slate-300 ${
                song.single ? '' : 'pl-7'
              }`}
            >
              <span className="not-italic text-sm font-semibold text-slate-400">
                {t('songs.refrain', 'Refren:')}
              </span>
              <span className="min-w-0 flex-1">
                <Lyrics text={song.refrain} />
              </span>
            </p>
          )}
        </div>
      ))}
      {song.bridge && (
        <p className={`flex gap-2 leading-relaxed text-slate-300 ${song.single ? '' : 'pl-7'}`}>
          <span className="text-sm font-semibold text-slate-400">{t('songs.bridge', 'Bridge:')}</span>
          <span className="min-w-0 flex-1">
            <Lyrics text={song.bridge} />
          </span>
        </p>
      )}
    </div>
  )
}

function SongRow({
  song,
  collection,
  showKey = true,
  onFavChange,
}: {
  song: Song
  collection: SongCollection
  showKey?: boolean
  onFavChange?: () => void
}) {
  const { lang } = useI18n()
  return (
    <div className="flex items-center gap-1">
      <Link
        to={`/${lang}/${SONG_PATH[collection]}/${song.nr}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm"
      >
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">{song.nr}.</span>
        <span className="min-w-0 flex-1 truncate font-medium leading-snug">{song.title}</span>
        {song.key && showKey && <span className="shrink-0 text-xs text-slate-500">{song.key}</span>}
      </Link>
      <FavoriteStar collection={collection} nr={song.nr} onChange={onFavChange} />
    </div>
  )
}

/**
 * Okienko wyboru piesni: numer albo slowo, a pod polem szukania zakres (tytul/tresc).
 * Lista tytulow nie rozwija sie sama - pojawia sie jako wynik szukania albo
 * po rozwinieciu ulubionych.
 */
export function SongFinder({
  collection = 'hymnal',
  showAllLink = false,
}: {
  collection?: SongCollection
  showAllLink?: boolean
}) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const { data, failed } = useSongs(collection)
  // Piesni mlodziezowe nie maja wlasnej numeracji w druku - numer jest tylko
  // adresem w aplikacji, wiec szukanie po nim nic czytelnikowi nie daje.
  const byNumber = collection === 'hymnal'
  const moved = data?.source?.movedToYouth
  const [nr, setNr] = useState('')
  const [q, setQ] = useState('')
  const [where, setWhere] = useState<'title' | 'body'>('title')
  const [favTick, setFavTick] = useState(0)
  const [favOpen, setFavOpen] = useState(false)

  if (failed) return <p className="text-slate-400">{t('songs.unavailable', 'Śpiewnik jest niedostępny.')}</p>
  if (!data) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const numbers = data.songs.map((s) => s.nr)
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  const known = new Set(numbers)
  const wanted = Number(nr)
  const nrMissing = nr.trim() !== '' && !known.has(wanted)

  const favs = listFavorites(collection)
    .map((n) => data.songs.find((s) => s.nr === n))
    .filter(Boolean) as Song[]

  function goToNumber(e: React.FormEvent) {
    e.preventDefault()
    if (known.has(Number(nr))) navigate(`/${lang}/${SONG_PATH[collection]}/${Number(nr)}`)
  }

  const query = q.trim()
  const hits =
    query.length < 2
      ? []
      : data.songs.filter((s) =>
          where === 'title'
            ? fold(s.title).includes(fold(query))
            : fold(songText(s)).includes(fold(query))
        )

  return (
    <div key={favTick}>
      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/30 p-3">
        {byNumber && (
        <form onSubmit={goToNumber} className="flex items-end gap-2">
          <label className="shrink-0">
            <span className="mb-1 block text-xs text-slate-300">{t('songs.byNumber', 'Numer pieśni')}</span>
            <input
              value={nr}
              onChange={(e) => setNr(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder={`${min}–${max}`}
              aria-label={t('songs.byNumber', 'Numer pieśni')}
              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={!known.has(wanted)}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
          >
            {t('songs.open', 'Otwórz')}
          </button>
        </form>
        )}

        <div>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-300">{t('songs.bySearch', 'Szukaj słowa')}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('songs.searchPlaceholder', 'np. nadzieja')}
              aria-label={t('songs.bySearch', 'Szukaj słowa')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
            />
          </label>
          {/* zakres szukania stoi pod polem, do ktorego sie odnosi */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`songs-where-${collection}`}
                checked={where === 'title'}
                onChange={() => setWhere('title')}
              />
              {t('songs.inTitle', 'w tytule')}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`songs-where-${collection}`}
                checked={where === 'body'}
                onChange={() => setWhere('body')}
              />
              {t('songs.inBody', 'w treści')}
            </label>
            {showAllLink && byNumber && (
              <Link
                to={`/${lang}/${SONG_PATH[collection]}`}
                className="ml-auto text-brand-light hover:underline"
              >
                {t('songs.all', 'Cały śpiewnik')}
              </Link>
            )}
          </div>
        </div>

        {byNumber && nrMissing && (
          moved && wanted >= moved.from && wanted <= moved.to ? (
            <p className="text-sm text-amber-300">
              {t('songs.movedToYouth', 'Ta pieśń jest teraz w pieśniach młodzieżowych.')}{' '}
              <Link to={`/${lang}/${SONG_PATH.youth}`} className="text-brand-light hover:underline">
                {t('youth.all', 'Pokaż cały śpiewnik')}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-amber-300">
              {t('songs.noNumber', 'W tym wydaniu nie ma jeszcze tej pieśni.')}
            </p>
          )
        )}

        {showAllLink && !byNumber && (
          <Link
            to={`/${lang}/${SONG_PATH[collection]}`}
            className="block rounded-lg border border-brand/60 bg-brand/10 px-3 py-2 text-center text-sm font-semibold text-brand-light transition hover:bg-brand/20"
          >
            {t('youth.all', 'Pokaż cały śpiewnik')}
          </Link>
        )}
      </div>

      {favs.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setFavOpen((v) => !v)}
            aria-expanded={favOpen}
            className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-100"
          >
            <span aria-hidden>★</span>
            <span className="flex-1 font-semibold">{t('songs.favorites', 'Ulubione')}</span>
            <span className="text-xs text-amber-200/80">{favs.length}</span>
            <span className={`transition-transform ${favOpen ? 'rotate-90' : ''}`} aria-hidden>
              ›
            </span>
          </button>
          {favOpen && (
            <div className="mt-1.5 space-y-1.5">
              {favs.map((s) => (
                <SongRow
                  key={s.nr}
                  song={s}
                  collection={collection}
                  onFavChange={() => setFavTick((v) => v + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {query.length >= 2 && (
        <div className="mt-3">
          {hits.length === 0 ? (
            <p className="text-sm text-slate-400">{t('songs.noResults', 'Nic nie znaleziono.')}</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">
                {t('songs.found', 'Znaleziono')}: {hits.length}
                {hits.length > SEARCH_LIMIT &&
                  ` – ${t('songs.showingFirst', 'pokazujemy pierwsze')} ${SEARCH_LIMIT}`}
              </p>
              {hits.slice(0, SEARCH_LIMIT).map((s) => (
                <div key={s.nr}>
                  <SongRow song={s} collection={collection} onFavChange={() => setFavTick((v) => v + 1)} />
                  {where === 'body' && (
                    <p className="mt-0.5 line-clamp-2 pl-3 text-xs text-slate-400">
                      {snippet(songText(s), query)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Pełna lista pieśni: w śpiewniku pogrupowana działami, w młodzieżowych alfabetyczna. */
export function SongList({
  collection = 'hymnal',
  compact = false,
}: {
  collection?: SongCollection
  compact?: boolean
}) {
  const { t } = useI18n()
  const { data, failed } = useSongs(collection)
  const [tick, setTick] = useState(0)

  if (failed) return <p className="text-slate-400">{t('songs.unavailable', 'Śpiewnik jest niedostępny.')}</p>
  if (!data) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const groups: { name: string; songs: Song[] }[] = []
  for (const song of data.songs) {
    const name = song.section || ''
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.songs.push(song)
    else groups.push({ name, songs: [song] })
  }

  return (
    <div className="space-y-5" key={tick}>
      {groups.map((g, i) => (
        <section key={`${g.name}-${i}`}>
          {g.name && (
            <h3 className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-slate-200">
              {g.name}
              <span className="text-xs font-normal text-slate-400">
                {g.songs[0].nr}–{g.songs[g.songs.length - 1].nr}
              </span>
            </h3>
          )}
          <div className="space-y-1.5">
            {g.songs.map((s) => (
              <SongRow
                key={s.nr}
                song={s}
                collection={collection}
                showKey={!compact}
                onFavChange={() => setTick((v) => v + 1)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function SongsPage({ collection = 'hymnal' }: { collection?: SongCollection }) {
  const { t } = useI18n()
  const { data } = useSongs(collection)
  const heading =
    collection === 'youth' ? t('youth.title', 'Pieśni młodzieżowe') : t('songs.title', 'Śpiewnik')

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-100">{heading}</h1>
      {data?.source && (
        <p className="mb-5 text-sm text-slate-400">
          {data.source.name}
          {data.source.edition ? `, ${data.source.edition}` : ''}
        </p>
      )}
      <SongFinder collection={collection} />
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('songs.allSongs', 'Wszystkie pieśni')}
      </h2>
      <SongList collection={collection} />
      {data?.source?.copyright && <p className="mt-6 text-xs text-slate-500">{data.source.copyright}</p>}
      {data?.source?.note && <p className="mt-2 text-xs text-slate-500">{data.source.note}</p>}
    </div>
  )
}

export function SongPage({ collection = 'hymnal' }: { collection?: SongCollection }) {
  const { nr } = useParams()
  const { lang, t } = useI18n()
  const { data, failed } = useSongs(collection)
  const song = data?.songs.find((s) => String(s.nr) === nr)
  useSetPlace(song ? `${song.nr}. ${song.title}` : undefined)

  const backLabel =
    collection === 'youth'
      ? t('youth.backToList', 'Wróć do pieśni młodzieżowych')
      : t('songs.backToList', 'Wróć do śpiewnika')
  const backTo = `/${lang}/${SONG_PATH[collection]}`

  if (failed) return <p className="text-slate-400">{t('songs.unavailable', 'Śpiewnik jest niedostępny.')}</p>
  if (!data) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  if (!song)
    return (
      <div>
        <p className="text-slate-400">{t('songs.notFound', 'Nie ma takiej pieśni.')}</p>
        <Link to={backTo} className="mt-3 inline-block text-brand-light hover:underline">
          {backLabel}
        </Link>
      </div>
    )

  return (
    <article>
      <BackLink to={backTo}>{backLabel}</BackLink>
      <header className="mb-4 mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-100">
            <span className="mr-2 text-slate-400">{song.nr}.</span>
            {song.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {[
              song.key,
              song.author,
              song.section,
              // piesni z rozdzialu 41 stoja tutaj, ale w druku maja swoj numer
              song.hymnalNr ? `${t('songs.hymnalNr', 'Śpiewajmy Panu')} ${song.hymnalNr}` : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <FavoriteStar collection={collection} nr={song.nr} className="no-print mt-1 text-2xl" />
      </header>
      <SongBody song={song} />
      {data.source?.copyright && <p className="mt-8 text-xs text-slate-500">{data.source.copyright}</p>}
    </article>
  )
}
