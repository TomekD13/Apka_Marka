import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSetPlace } from '../place'
import { loadSongs } from '../content'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { Heart } from '../components/MaterialActions'
import { listFavMaterials, toggleFavMaterial, type FavMaterial } from '../lib/favMaterials'
import { listFavorites, toggleFavorite } from '../lib/favorites'
import { listBookmarks } from '../lib/bookmarks'
import type { ReadKind } from '../lib/progress'
import type { SongCollection } from '../types'

// Ulubione w jednym miejscu: materialy, piesni z obu spiewnikow i zakladki w Biblii.
// Na razie tylko beta (BETA w lib/beta.ts).

const KINDS: [ReadKind, string, string][] = [
  ['study', 'favorites.kindStudy', 'Lekcje Biblijne'],
  ['pray40', 'favorites.kindPray40', '40 dni modlitwy'],
  ['edu', 'favorites.kindEdu', 'Człowiek Nadziei'],
  ['group', 'favorites.kindGroup', 'Grupy Nadziei'],
]
const SONGS: [SongCollection, string, string, string][] = [
  ['hymnal', 'spiewnik', 'songs.title', 'Śpiewnik'],
  ['youth', 'piesni-mlodziezowe', 'youth.title', 'Pieśni młodzieżowe'],
]

const row = 'flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900'

function Unfav({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button type="button" onClick={onClick} aria-label={t('favorites.remove', 'Usuń z ulubionych')} title={t('favorites.remove', 'Usuń z ulubionych')} className="shrink-0 rounded-md p-1 text-rose-500 hover:bg-rose-500/10">
      <Heart on className="h-5 w-5" />
    </button>
  )
}

export function Favorites() {
  const { lang, t } = useI18n()
  useSetPlace(t('favorites.title', 'Ulubione'))
  const [items, setItems] = useState<FavMaterial[]>(listFavMaterials)
  const [songs, setSongs] = useState<Record<string, number[]>>(() => Object.fromEntries(SONGS.map(([c]) => [c, listFavorites(c)])))
  const [titles, setTitles] = useState<Record<string, string>>({})
  const bookmarks = listBookmarks().length

  useEffect(() => {
    const refresh = () => {
      setItems(listFavMaterials())
      setSongs(Object.fromEntries(SONGS.map(([c]) => [c, listFavorites(c)])))
    }
    window.addEventListener('zywe-slowo:synced', refresh)
    return () => window.removeEventListener('zywe-slowo:synced', refresh)
  }, [])

  // tytuly piesni dociagamy tylko dla tych spiewnikow, w ktorych cos jest w ulubionych
  useEffect(() => {
    for (const [c] of SONGS) {
      if (!songs[c]?.length) continue
      loadSongs(lang, c)
        .then((f) => setTitles((prev) => ({ ...prev, ...Object.fromEntries(f.songs.map((s) => [`${c}:${s.nr}`, s.title])) })))
        .catch(() => {})
    }
  }, [lang, songs])

  const empty = !items.length && SONGS.every(([c]) => !songs[c]?.length) && !bookmarks

  return (
    <section className="mx-auto max-w-xl">
      <BackLink to={`/${lang}`} className="mb-4">{t('nav.topics', 'Menu główne')}</BackLink>
      <PageHeading icon="heart" title={t('favorites.title', 'Ulubione')} />
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t('favorites.intro', '')}</p>

      {empty && <p className="mt-6 rounded-xl border border-slate-200 p-4 text-slate-600 dark:border-slate-700 dark:text-slate-300">{t('favorites.empty', '')}</p>}

      {KINDS.map(([kind, key, label]) => {
        const list = items.filter((f) => f.kind === kind)
        if (!list.length) return null
        return (
          <div key={kind} className="mt-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t(key, label)}</h2>
            <div className="space-y-1.5">
              {list.map((f) => (
                <div key={f.id} className={row}>
                  <Link to={`/${lang}/${f.path}`} className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:text-brand dark:text-white dark:hover:text-sky-300">{f.title}</Link>
                  <Unfav onClick={() => { toggleFavMaterial(f.kind, f.id.slice(f.kind.length + 1), f.title, f.path); setItems(listFavMaterials()) }} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {SONGS.map(([c, path, key, label]) => {
        const list = songs[c] || []
        if (!list.length) return null
        return (
          <div key={c} className="mt-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t(key, label)}</h2>
            <div className="space-y-1.5">
              {list.map((nr) => (
                <div key={nr} className={row}>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">{nr}</span>
                  <Link to={`/${lang}/${path}/${nr}`} className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:text-brand dark:text-white dark:hover:text-sky-300">{titles[`${c}:${nr}`] || '…'}</Link>
                  <Unfav onClick={() => { toggleFavorite(c, nr); setSongs((s) => ({ ...s, [c]: listFavorites(c) })) }} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {bookmarks > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t('bible.bookmarks', 'Zakładki')}</h2>
          <Link to={`/${lang}/biblia/zakladki`} className={`${row} hover:border-brand dark:hover:border-sky-300`}>
            <span className="flex-1 font-medium text-slate-900 dark:text-white">{t('favorites.bookmarks', 'Zakładki w Biblii')}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{bookmarks}</span>
            <span className="text-xl text-brand dark:text-sky-300" aria-hidden>›</span>
          </Link>
        </div>
      )}
    </section>
  )
}
