import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { MusicIcon } from './MusicIcon'
import { NextIcon, PlayPauseIcon, SleepLeft } from '../pages/PrayerMusic'
import { nextTrack, playTrack, stop, useMusic } from '../lib/prayerMusic'

// Muzyka do modlitwy gra dalej na innych stronach (np. przy czytaniu Biblii). Wtedy pod belka aplikacji
// stoi waski pasek: tytul (link do listy), odliczanie „Wyłącz po”, pauza, nastepny (w trybie po kolei) i zamkniecie.
// Na samej stronie muzyki paska nie ma - tam jest duzy odtwarzacz.
export function MusicMiniBar() {
  const { lang, t } = useI18n()
  const { pathname } = useLocation()
  const music = useMusic()
  const track = music.track
  if (!track || pathname.replace(/\/$/, '').endsWith('/modlitwa/muzyka')) return null
  const album = t('prayerMusic.title', 'Muzyka do modlitwy')
  return <div className="no-print fixed inset-x-0 top-14 z-30 px-2 pt-1">
    <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <Link to={`/${lang}/modlitwa/muzyka`} viewTransition className="flex min-w-0 flex-1 items-center gap-2">
        <MusicIcon name={track.icon} className="h-6 w-6 flex-none text-brand dark:text-sky-300" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{track.title}</span>
          <SleepLeft />
        </span>
      </Link>
      <button type="button" onClick={() => playTrack(track, album)} aria-label={music.playing ? t('prayerMusic.pause', 'Pauza') : t('prayerMusic.play', 'Odtwórz')}
        className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white dark:bg-sky-500 dark:text-slate-950">
        <PlayPauseIcon playing={music.playing} className="h-4 w-4" />
      </button>
      {music.mode !== 'one' && <button type="button" onClick={nextTrack} aria-label={t('prayerMusic.next', 'Następny utwór')}
        className="grid h-9 w-9 place-items-center rounded-full text-brand hover:bg-slate-100 dark:text-sky-300 dark:hover:bg-white/10">
        <NextIcon className="h-4 w-4" />
      </button>}
      <button type="button" onClick={stop} aria-label={t('prayerMusic.stop', 'Zatrzymaj i zamknij')}
        className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">×</button>
    </div>
  </div>
}
