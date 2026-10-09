import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

/**
 * Prosty odtwarzacz nagrania lektorskiego - stoi na gorze materialu do czytania
 * (na razie Czlowiek Nadziei; kazda kolejna czytanka z nagraniem dostaje ten sam).
 *
 * - Tylko strumieniowo: `preload="none"` (nic sie nie pobiera przed odtworzeniem), service
 *   worker nagran nie zapisuje, a serwer wysyla je z `Cache-Control: no-store` - telefon nie
 *   gromadzi plikow (decyzja autora 2026-10-09). Rozmiar widac przed odtworzeniem.
 * - Tempo plynnie suwakiem 0,5-2x. Wybor zostaje na urzadzeniu i obowiazuje we
 *   wszystkich nagraniach; wysokosc glosu sie nie zmienia (preservesPitch).
 * - Media Session: tytul i przyciski na ekranie blokady telefonu.
 */

const RATE_KEY = 'zywe-slowo:audio:rate'
export const MIN_RATE = 0.5
export const MAX_RATE = 2
const RATE_STEP = 0.05
const SKIP = 15

// Nagrania nie leza w repo (public/audio/ w .gitignore), tylko lokalnie i na serwerze.
// Strona glowna i dev biora je z wlasnego adresu, wersja testowa na GitHub Pages - ze strony glownej.
const MAIN_SITE = 'https://jestnadzieja.adwent.pl/'

export function audioUrl(src: string): string {
  const base = import.meta.env.BASE_URL
  return (import.meta.env.DEV || base === '/' ? base : MAIN_SITE) + src
}

function clampRate(v: number): number {
  if (!Number.isFinite(v)) return 1
  return Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(v / RATE_STEP) / Math.round(1 / RATE_STEP)))
}

function readRate(): number {
  try {
    const raw = localStorage.getItem(RATE_KEY)
    return raw ? clampRate(Number(raw)) : 1
  } catch {
    return 1
  }
}

function saveRate(v: number) {
  try {
    localStorage.setItem(RATE_KEY, String(v))
  } catch {
    /* prywatne okno - tempo zyje tylko do zamkniecia strony */
  }
}

/** 830 -> „13:50”, 3725 -> „1:02:05” */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const comma = (v: number, digits: number) => v.toFixed(digits).replace('.', ',')

type PitchAudio = HTMLAudioElement & { webkitPreservesPitch?: boolean }

export function AudioPlayer({
  src,
  seconds,
  bytes,
  title,
  note,
}: {
  /** sciezka wzgledem korzenia strony, np. `audio/edu/001.mp3?v=...` */
  src: string
  /** dlugosc z JSON-a - widoczna, zanim plik sie wczyta */
  seconds: number
  bytes?: number
  /** tytul na ekranie blokady telefonu */
  title: string
  /** dopisek przy naglowku, np. „nagranie wersji pełnej” */
  note?: string
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(seconds)
  const [rate, setRate] = useState(readRate)

  // tempo trzeba podawac po kazdym wczytaniu - przegladarka wraca wtedy do defaultPlaybackRate
  function applyRate(v: number) {
    const a = ref.current as PitchAudio | null
    if (!a) return
    a.preservesPitch = true
    a.webkitPreservesPitch = true
    a.defaultPlaybackRate = v
    a.playbackRate = v
  }

  useEffect(() => applyRate(rate), [rate])

  useEffect(() => {
    setPlaying(false)
    setFailed(false)
    setTime(0)
    setDuration(seconds)
  }, [src, seconds])

  function toggle() {
    const a = ref.current
    if (!a) return
    if (a.paused) {
      setFailed(false)
      applyRate(rate)
      a.play()?.catch(() => setPlaying(false))
    } else a.pause()
  }

  function seek(to: number) {
    const a = ref.current
    if (!a) return
    const v = Math.min(Math.max(0, to), duration || seconds)
    a.currentTime = v
    setTime(v)
  }

  function changeRate(v: number) {
    const r = clampRate(v)
    setRate(r)
    saveRate(r)
  }

  // ekran blokady telefonu: tytul i przyciski; sprzatamy po wyjsciu z materialu
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
    if (!ms || !playing) return
    try {
      ms.metadata = new MediaMetadata({
        title,
        artist: '#JestNadzieja',
        album: t('edu.title', 'Człowiek Nadziei'),
        artwork: [{ src: `${import.meta.env.BASE_URL}pwa-512.png`, sizes: '512x512', type: 'image/png' }],
      })
    } catch {
      /* starsza przegladarka bez MediaMetadata */
    }
    const a = ref.current
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => a?.play()],
      ['pause', () => a?.pause()],
      ['seekbackward', () => a && seek(a.currentTime - SKIP)],
      ['seekforward', () => a && seek(a.currentTime + SKIP)],
      ['seekto', (d) => d.seekTime != null && seek(d.seekTime)],
    ]
    for (const [action, fn] of handlers) {
      try {
        ms.setActionHandler(action, fn)
      } catch {
        /* akcja nieobslugiwana */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null)
        } catch {
          /* jw. */
        }
      }
    }
  }, [playing, title])

  const total = duration || seconds
  const playLabel = playing ? t('audio.pause', 'Pauza') : t('audio.play', 'Odtwórz')
  const meta = [note, clock(seconds), bytes ? `${comma(bytes / 1e6, 1)} MB` : ''].filter(Boolean).join(' · ')
  const skipBtn =
    'shrink-0 rounded-md border border-slate-500/40 px-2 py-1 text-xs tabular-nums text-slate-200 transition hover:bg-brand/20 hover:text-white'

  return (
    <section
      aria-label={t('audio.listen', 'Posłuchaj')}
      className="no-print mb-5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3"
    >
      <audio
        ref={ref}
        src={audioUrl(src)}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => {
          applyRate(rate)
          if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration)
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onError={() => {
          setFailed(true)
          setPlaying(false)
          setWaiting(false)
        }}
      />

      <p className="mb-2 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wide text-violet-300">{t('audio.listen', 'Posłuchaj')}</span>
        {meta && <span> · {meta}</span>}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playLabel}
          title={playLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow transition hover:bg-brand-light"
        >
          {waiting && playing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
          ) : playing ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(total))}
            step={1}
            value={Math.floor(time)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={t('audio.position', 'Miejsce w nagraniu')}
            aria-valuetext={`${clock(time)} / ${clock(total)}`}
            className="block w-full cursor-pointer accent-brand-light"
          />
          <div className="mt-0.5 flex justify-between text-xs tabular-nums text-slate-400">
            <span>{clock(time)}</span>
            <span>{clock(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => seek(time - SKIP)} className={skipBtn} title={t('audio.back', 'Cofnij o 15 sekund')}>
          <span aria-hidden>‹ </span>15 s<span className="sr-only"> {t('audio.back', 'Cofnij o 15 sekund')}</span>
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-300">
          <span className="shrink-0">{t('audio.speed', 'Tempo')}</span>
          <input
            type="range"
            min={MIN_RATE}
            max={MAX_RATE}
            step={RATE_STEP}
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            aria-valuetext={`${comma(rate, 2)}×`}
            className="min-w-0 flex-1 cursor-pointer accent-brand-light"
          />
        </label>
        <button
          type="button"
          onClick={() => changeRate(1)}
          title={t('audio.speedReset', 'Normalne tempo')}
          aria-label={t('audio.speedReset', 'Normalne tempo')}
          className={`w-14 shrink-0 rounded-md px-1 py-1 text-center text-xs font-semibold tabular-nums transition ${
            rate === 1 ? 'text-slate-400' : 'bg-brand/30 text-slate-100 hover:bg-brand/50'
          }`}
        >
          {comma(rate, 2)}×
        </button>
        <button type="button" onClick={() => seek(time + SKIP)} className={skipBtn} title={t('audio.forward', 'Do przodu o 15 sekund')}>
          15 s<span aria-hidden> ›</span><span className="sr-only"> {t('audio.forward', 'Do przodu o 15 sekund')}</span>
        </button>
      </div>

      {failed && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {t('audio.error', 'Nie udało się wczytać nagrania. Sprawdź połączenie z internetem i spróbuj ponownie.')}
        </p>
      )}
    </section>
  )
}
