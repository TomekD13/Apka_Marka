import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { MusicIcon } from '../components/MusicIcon'
import { Heart } from '../components/MaterialActions'
import { loadPrayerMusic } from '../content'
import {
  PLAY_MODES,
  SLEEP_MINUTES,
  clearList,
  clearSaved,
  leftClock,
  nextTrack,
  playCollection,
  playTrack,
  refreshSaved,
  setMode,
  setSleep,
  setTracks,
  setVolume,
  sleepLabel,
  stop,
  toggleFav,
  toggleInList,
  trackLength,
  useMusic,
  type MusicTrack,
  type PlayMode,
} from '../lib/prayerMusic'

// Muzyka do modlitwy: petle 1-20 i skladanki piesni 21-30 (Muzyka_do_modlitwy/katalog.py), jeden odtwarzacz
// na cala aplikacje (lib/prayerMusic.ts). Wejscie z dzialu Pieśni ma `?z=piesni` - wtedy powrot prowadzi tam.
// Tryb odtwarzania i glosnosc ustawia czytelnik (2026-11-19). Przy kazdym utworze serce (ulubione, lib/favorites.ts)
// i plus (playlista - numer to miejsce w kolejce); nad lista „Ulubione” i „Moja playlista” uruchamiaja je po kolei.

export function PlayPauseIcon({ playing, className = 'h-5 w-5' }: { playing: boolean; className?: string }) {
  return playing
    ? <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
    : <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>
}

export function NextIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M6 6.5v11a1 1 0 0 0 1.5.86L15 13.5V17a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v3.5L7.5 5.64A1 1 0 0 0 6 6.5z"/></svg>
}

const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-default disabled:opacity-50'
const PILL_ON = 'border-brand bg-brand text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
const PILL_OFF = 'border-slate-300 bg-white/70 text-slate-800 hover:border-brand/60 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100'

const SELECT = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export function SleepSelect({ id }: { id: string }) {
  const { t } = useI18n()
  const music = useMusic()
  return <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
    {t('prayerMusic.sleep', 'Wyłącz po')}
    <select id={id} value={music.sleepMinutes ?? ''} onChange={(e) => setSleep(e.target.value ? Number(e.target.value) : null)} className={SELECT}>
      <option value="">{t('prayerMusic.sleepOff', 'nie wyłączaj')}</option>
      {SLEEP_MINUTES.map((m) => <option key={m} value={m}>{sleepLabel(m, t)}</option>)}
    </select>
  </label>
}

const MODE_LABEL: Record<PlayMode, [string, string]> = {
  one: ['prayerMusic.modeOne', 'powtarzaj ten utwór'],
  all: ['prayerMusic.modeAll', 'wszystkie po kolei'],
  fav: ['prayerMusic.modeFav', 'ulubione po kolei'],
  list: ['prayerMusic.modeList', 'moja playlista'],
}

export function ModeSelect({ id }: { id: string }) {
  const { t } = useI18n()
  const { mode } = useMusic()
  return <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
    {t('prayerMusic.mode', 'Odtwarzanie')}
    <select id={id} value={mode} onChange={(e) => setMode(e.target.value as PlayMode)} className={SELECT}>
      {PLAY_MODES.map((m) => <option key={m} value={m}>{t(MODE_LABEL[m][0], MODE_LABEL[m][1])}</option>)}
    </select>
  </label>
}

function Speaker({ loud }: { loud: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-none" aria-hidden>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>
    {loud && <path d="M18 7a7 7 0 0 1 0 10"/>}
  </svg>
}

/** Ciszej / glosniej w samym odtwarzaczu. Na iOS strona nie moze zmieniac glosnosci - wtedy nic nie pokazujemy. */
export function VolumeSlider() {
  const { t } = useI18n()
  const { volume, canVolume } = useMusic()
  if (!canVolume) return null
  const btn = 'grid h-9 w-9 flex-none place-items-center rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10'
  return <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
    <button type="button" onClick={() => setVolume(volume - 0.1)} aria-label={t('prayerMusic.quieter', 'Ciszej')} className={btn}><Speaker loud={false} /></button>
    <input type="range" min={0} max={100} step={1} value={Math.round(volume * 100)}
      onChange={(e) => setVolume(Number(e.target.value) / 100)}
      aria-label={t('prayerMusic.volume', 'Głośność')}
      className="h-2 min-w-0 flex-1 cursor-pointer accent-brand dark:accent-sky-400" />
    <button type="button" onClick={() => setVolume(volume + 0.1)} aria-label={t('prayerMusic.louder', 'Głośniej')} className={btn}><Speaker loud /></button>
  </div>
}

export function SleepLeft() {
  const { t } = useI18n()
  const { sleepAt, now } = useMusic()
  if (sleepAt == null) return null
  return <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
    {t('prayerMusic.sleepLeft', 'Wyłączy się za {t}').replace('{t}', leftClock(sleepAt - now))}
  </span>
}

export function PrayerMusic() {
  const { lang, t } = useI18n()
  const [params] = useSearchParams()
  const fromSongs = params.get('z') === 'piesni'
  const music = useMusic()
  const [tracks, setList] = useState<MusicTrack[] | null>(null)
  const [failed, setFailed] = useState(false)
  const album = t('prayerMusic.title', 'Muzyka do modlitwy')

  useEffect(() => {
    let alive = true
    loadPrayerMusic(lang)
      .then((d) => {
        if (!alive) return
        setList(d.tracks)
        setTracks(d.tracks, album)
        void refreshSaved()
      })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [lang, album])

  const loop = t('prayerMusic.loop', 'pętla')
  const current = music.track
  const onPhone = t('prayerMusic.saved', 'na telefonie')
  const meta = (tr: MusicTrack) => [trackLength(tr.seconds), tr.loop === false ? '' : loop, music.saved.includes(tr.file) ? onPhone : '']
    .filter(Boolean).join(' · ')
  const listMode = music.mode === 'list'
  const inListCount = tracks ? tracks.filter((x) => music.list.includes(x.id)).length : 0
  const favCount = tracks ? tracks.filter((x) => music.favs.includes(x.nr)).length : 0

  return <section className="mx-auto max-w-xl">
    {fromSongs
      ? <BackLink to={`/${lang}/piesni`} className="mb-4">{t('nav.songs', 'Pieśni')}</BackLink>
      : <BackLink to={`/${lang}/modlitwa`} className="mb-4">{t('nav.prayer', 'Modlitwa')}</BackLink>}
    <PageHeading icon="harp" title={album} />
    <p className="mt-3 text-slate-600 dark:text-slate-300">{t('prayerMusic.intro', 'Spokojna muzyka, przy której łatwiej się wyciszyć i stanąć przed Bogiem.')}</p>
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('prayerMusic.loopNote', 'Znajdź swój ulubiony utwór i nastrój się od środka.')}</p>

    {current && <div className="gradient-panel sticky top-16 z-20 mt-6 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-brand/10 p-3 text-brand dark:bg-sky-400/15 dark:text-sky-300"><MusicIcon name={current.icon} className="h-7 w-7" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-slate-900 dark:text-white">{current.title}</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">
            {music.waiting ? t('prayerMusic.loading', 'Wczytywanie…') : meta(current)}
          </span>
        </span>
        <button type="button" onClick={() => playTrack(current, album)} aria-label={music.playing ? t('prayerMusic.pause', 'Pauza') : t('prayerMusic.play', 'Odtwórz')}
          className="grid h-12 w-12 flex-none place-items-center rounded-full bg-brand text-white shadow hover:bg-brand-light dark:bg-sky-500 dark:text-slate-950">
          <PlayPauseIcon playing={music.playing} className="h-6 w-6" />
        </button>
        {music.mode !== 'one' && <button type="button" onClick={nextTrack} aria-label={t('prayerMusic.next', 'Następny utwór')}
          className="grid h-10 w-10 flex-none place-items-center rounded-full text-brand hover:bg-slate-200/60 dark:text-sky-300 dark:hover:bg-white/10"><NextIcon /></button>}
        <button type="button" onClick={stop} aria-label={t('prayerMusic.stop', 'Zatrzymaj i zamknij')}
          className="grid h-9 w-9 flex-none place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10">×</button>
      </div>
      <div className="mt-3"><VolumeSlider /></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <SleepSelect id="music-sleep" />
        <SleepLeft />
      </div>
      {music.failed && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{t('prayerMusic.failed', 'Nie udało się odtworzyć nagrania. Sprawdź połączenie z internetem i spróbuj ponownie.')}</p>}
    </div>}

    {failed && <p className="mt-6 text-slate-600 dark:text-slate-300">{t('prayerMusic.listFailed', 'Nie udało się wczytać listy utworów. Spróbuj ponownie za chwilę.')}</p>}
    {!tracks && !failed && <p className="mt-6 text-slate-500">{t('prayerMusic.loading', 'Wczytywanie…')}</p>}

    {tracks && <div className="gradient-panel mt-6 grid gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => playCollection('fav', album)} disabled={!favCount}
          className={`${PILL} ${music.mode === 'fav' ? PILL_ON : PILL_OFF}`}>
          <Heart on className="h-4 w-4" />
          {t('prayerMusic.playFavs', 'Ulubione')} <span className="tabular-nums opacity-80">({favCount})</span>
        </button>
        <button type="button" onClick={() => playCollection('list', album)} disabled={!inListCount}
          className={`${PILL} ${listMode ? PILL_ON : PILL_OFF}`}>
          <PlayPauseIcon playing={false} className="h-4 w-4" />
          {t('prayerMusic.playList', 'Moja playlista')} <span className="tabular-nums opacity-80">({inListCount})</span>
        </button>
        {inListCount > 0 && <button type="button" onClick={clearList}
          className="rounded-full px-2 py-1 text-sm text-slate-500 underline-offset-2 hover:underline dark:text-slate-400">
          {t('prayerMusic.listClear', 'wyczyść playlistę')}
        </button>}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('prayerMusic.listHint', 'Serce dodaje utwór do ulubionych, plus – do playlisty. Playlista gra w kolejności dodawania.')}</p>
      <ModeSelect id="music-mode" />
    </div>}

    {tracks && <ul className="mt-4 grid gap-3">
      {tracks.map((tr) => {
        const active = current?.id === tr.id
        const playing = active && music.playing
        const pos = music.list.indexOf(tr.id) + 1
        const fav = music.favs.includes(tr.nr)
        // kafelek: tytul i przycisk odtwarzania graja utwor, serce i plus tylko zaznaczaja (osobne przyciski,
        // bo przycisk w przycisku jest niedozwolony)
        return <li key={tr.id}
          className={`gradient-panel flex items-center gap-2 rounded-2xl border p-2.5 transition hover:border-brand/60 dark:hover:border-sky-300/60 ${active ? 'ring-2 ring-brand/50 dark:ring-sky-300/60' : ''}`}>
          <button type="button" onClick={() => playTrack(tr, album)} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-0.5 text-left">
            <span className="flex-none rounded-xl bg-brand/10 p-2.5 text-brand dark:bg-sky-400/15 dark:text-sky-300"><MusicIcon name={tr.icon} className="h-7 w-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-slate-900 dark:text-white">{tr.title}</span>
              <span className="block text-sm tabular-nums text-slate-600 dark:text-slate-300">{meta(tr)}</span>
            </span>
          </button>
          <button type="button" onClick={() => toggleFav(tr.nr)} aria-pressed={fav}
            aria-label={(fav ? t('prayerMusic.favRemove', 'Usuń z ulubionych: {t}') : t('prayerMusic.favAdd', 'Dodaj do ulubionych: {t}')).replace('{t}', tr.title)}
            className={`grid h-9 w-9 flex-none place-items-center rounded-full transition ${fav
              ? 'text-rose-500 dark:text-rose-400'
              : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 dark:text-slate-500'}`}>
            <Heart on={fav} className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => toggleInList(tr.id)} aria-pressed={pos > 0}
            aria-label={(pos ? t('prayerMusic.listRemove', 'Usuń z playlisty: {t}') : t('prayerMusic.listAdd', 'Dodaj do playlisty: {t}')).replace('{t}', tr.title)}
            className={`grid h-9 w-9 flex-none place-items-center rounded-full border text-sm font-bold tabular-nums transition ${pos
              ? 'border-brand bg-brand text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
              : 'border-slate-300 text-lg font-normal text-slate-500 hover:border-brand/60 hover:text-brand dark:border-slate-600 dark:text-slate-400'}`}>
            {pos || '+'}
          </button>
          <button type="button" onClick={() => playTrack(tr, album)} tabIndex={-1} aria-hidden
            className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand/10 text-brand dark:bg-sky-400/15 dark:text-sky-300">
            <PlayPauseIcon playing={playing} />
          </button>
        </li>
      })}
    </ul>}

    {tracks && <div className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
      <p>{t('prayerMusic.savedNote', 'Utwór zapisuje się na tym urządzeniu, gdy słuchasz go dłużej niż kilkanaście sekund. Potem gra bez internetu i nie zużywa danych.')}</p>
      {music.saved.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-nums">{t('prayerMusic.savedSize', 'Zapisane: {n} · {mb} MB')
          .replace('{n}', String(music.saved.length)).replace('{mb}', (music.savedBytes / 1048576).toFixed(0))}</span>
        <button type="button" onClick={() => void clearSaved()}
          className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:border-rose-400 hover:text-rose-600 dark:border-slate-600 dark:text-slate-200 dark:hover:text-rose-300">
          {t('prayerMusic.savedClear', 'Usuń pobraną muzykę')}
        </button>
      </div>}
    </div>}
  </section>
}
