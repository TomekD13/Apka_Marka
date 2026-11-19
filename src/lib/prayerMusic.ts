import { useSyncExternalStore } from 'react'
import { mediaUrl } from './media'
import { readList, writeList } from './localStore'
import { listFavorites, toggleFavorite } from './favorites'

/**
 * Muzyka do modlitwy - jeden odtwarzacz na cala aplikacje (2026-11-19).
 *
 * - Gra dalej po przejsciu na inna strone (np. do Biblii): stan zyje w module, nie w komponencie.
 *   Poza strona muzyki pokazuje sie maly pasek `MusicMiniBar`.
 * - Utwory 1-20 to petle ok. 5 minut (koniec przechodzi w poczatek, plik zaczyna sie w najcichszym miejscu),
 *   21-30 to skladanki piesni ok. 10 minut z wlasnym wejsciem i zakonczeniem (Muzyka_do_modlitwy/katalog.py).
 * - Tryby (prosba Marka 2026-11-19): powtarzaj jeden utwor / wszystkie po kolei / ulubione po kolei /
 *   moja playlista (utwory zaznaczone plusem, w kolejnosci dodawania). Playlista lezy w localStorage tego
 *   urzadzenia; ulubione to lista `fav:music` (jak ulubione piesni - z kontem synchronizuje sie miedzy urzadzeniami).
 * - Glosnosc w samym odtwarzaczu i lagodne wejscie / wyciszenie przy starcie, pauzie, zmianie utworu i na
 *   koncu utworu w trybie „po kolei”. iOS nie pozwala stronie zmieniac glosnosci elementu audio - tam suwaka
 *   nie ma, glosnosc ustawia sie przyciskami telefonu, a lagodnosc zapewniaja same nagrania.
 * - Utwor zostaje na telefonie (decyzja Marka 2026-11-19): po SAVE_AFTER_S sekundach sluchania caly plik
 *   pobiera sie w tle do cache MUSIC_CACHE, a service worker (vite.config.ts) gra go potem stamtad, tez bez
 *   internetu. Adres ma sume pliku (?v=) - nowa wersja nagrania wypiera stara. Strona pokazuje, ile to zajmuje,
 *   i pozwala wszystko usunac. Pliki 128 kb/s (Muzyka_do_modlitwy/katalog.py).
 * - „Wyłącz po”: co kwadrans do godziny, potem co godzine do 8 godzin. Pod koniec glosnosc schodzi
 *   przez FADE_MS (na iOS muzyka po prostu sie zatrzymuje).
 */

export interface MusicTrack {
  id: string
  nr: number
  title: string
  icon: string
  file: string
  seconds: number
  samples?: number
  /** false = utwor z wlasnym poczatkiem i koncem (skladanki 21-30); brak pola = petla */
  loop?: boolean
  /** suma pliku - w adresie, zeby po podmianie nagrania telefon pobral nowe */
  v?: string
}

export interface MusicFile {
  tracks: MusicTrack[]
}

export type PlayMode = 'one' | 'all' | 'fav' | 'list'
export const PLAY_MODES: PlayMode[] = ['one', 'all', 'fav', 'list']
/** kolekcja w lib/favorites.ts - ulubione utwory po numerze */
export const FAV_COLLECTION = 'music'

export const SLEEP_MINUTES = [15, 30, 45, 60, 120, 180, 240, 300, 360, 420, 480]
const FADE_MS = 12000
const FADE_IN_MS = 2500
const FADE_OUT_MS = 700
const END_FADE_S = 4
const PREFS_KEY = 'zywe-slowo:music:v1'
export const LIST_KEY = 'zywe-slowo:music-list:v1'
/** ta sama nazwa co w vite.config.ts (runtimeCaching) */
export const MUSIC_CACHE = 'muzyka-do-modlitwy'
const SAVE_AFTER_S = 20

export interface MusicState {
  track: MusicTrack | null
  playing: boolean
  waiting: boolean
  failed: boolean
  /** chwila wylaczenia (ms od 1970) albo null */
  sleepAt: number | null
  sleepMinutes: number | null
  /** odswiezane co sekunde, gdy dziala wylacznik - do odliczania na ekranie */
  now: number
  mode: PlayMode
  /** 0..1 - suwak w odtwarzaczu */
  volume: number
  /** czy przegladarka pozwala zmieniac glosnosc (iOS nie pozwala) */
  canVolume: boolean
  /** identyfikatory utworow z playlisty, w kolejnosci dodawania */
  list: string[]
  /** numery ulubionych utworow */
  favs: number[]
  /** pliki zapisane na tym urzadzeniu i ich laczny rozmiar w bajtach */
  saved: string[]
  savedBytes: number
}

function loadPrefs(): { mode: PlayMode; volume: number } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    const mode = PLAY_MODES.includes(p.mode) ? p.mode : 'one'
    const volume = typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1 ? p.volume : 1
    return { mode, volume }
  } catch {
    return { mode: 'one', volume: 1 }
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: state.mode, volume: state.volume }))
  } catch {
    /* prywatne okno - ustawienie zostaje do konca wizyty */
  }
}

const prefs = loadPrefs()
let state: MusicState = {
  track: null, playing: false, waiting: false, failed: false, sleepAt: null, sleepMinutes: null, now: Date.now(),
  mode: prefs.mode, volume: prefs.volume, canVolume: true, list: readList<string>(LIST_KEY),
  favs: listFavorites(FAV_COLLECTION),
  saved: [], savedBytes: 0,
}
const listeners = new Set<() => void>()
let audio: HTMLAudioElement | null = null
let ticker: number | null = null
let fading: number | null = null
let ramping: number | null = null
let album = ''
let tracks: MusicTrack[] = []
/** obwiednia lagodnego wejscia i wyciszenia (0..1) oraz wyciszanie wylacznika (0..1) */
let env = 1
let sleepMul = 1
let fadeInOnPlay = false

function set(patch: Partial<MusicState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function applyVolume() {
  if (!audio || !state.canVolume) return
  audio.volume = Math.max(0, Math.min(1, state.volume * env * sleepMul))
}

function cancelRamp() {
  if (ramping != null) window.clearInterval(ramping)
  ramping = null
}

/** Plynna zmiana obwiedni do `to` w `ms`; potem `done`. Bez regulacji glosnosci (iOS) - od razu `done`. */
function ramp(to: number, ms: number, done?: () => void) {
  cancelRamp()
  if (!state.canVolume) {
    env = to
    done?.()
    return
  }
  const from = env
  const t0 = Date.now()
  ramping = window.setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms)
    env = from + (to - from) * k
    applyVolume()
    if (k >= 1) {
      cancelRamp()
      done?.()
    }
  }, 40)
}

function el(): HTMLAudioElement {
  if (audio) return audio
  const a = new Audio()
  a.loop = state.mode === 'one'
  a.preload = 'none'
  // iOS: volume jest tylko do odczytu (zawsze 1) - wtedy suwak i plynne wyciszanie nie maja sensu
  a.volume = 0.5
  const canVolume = Math.abs(a.volume - 0.5) < 0.01
  a.volume = 1
  a.addEventListener('playing', () => {
    set({ playing: true, waiting: false, failed: false })
    if (fadeInOnPlay) {
      fadeInOnPlay = false
      ramp(1, FADE_IN_MS)
    }
  })
  a.addEventListener('pause', () => set({ playing: false, waiting: false }))
  a.addEventListener('waiting', () => set({ waiting: true }))
  a.addEventListener('error', () => set({ playing: false, waiting: false, failed: true }))
  a.addEventListener('timeupdate', onTime)
  a.addEventListener('ended', onEnded)
  audio = a
  set({ canVolume })
  return a
}

export function musicSrc(track: MusicTrack): string {
  return mediaUrl(`audio/muzyka/${track.file}`) + (track.v ? `?v=${track.v}` : '')
}

// ---------- utwory zapisane na telefonie ----------

const tried = new Set<string>()

function cacheApi(): CacheStorage | null {
  return typeof caches !== 'undefined' ? caches : null
}

/** Co jest zapisane i ile zajmuje (rozmiar z naglowka Content-Length zapisanej odpowiedzi). */
export async function refreshSaved() {
  const cs = cacheApi()
  if (!cs) return
  try {
    const c = await cs.open(MUSIC_CACHE)
    const saved: string[] = []
    let bytes = 0
    for (const req of await c.keys()) {
      saved.push(new URL(req.url).pathname.split('/').pop() || '')
      const r = await c.match(req)
      bytes += Number(r?.headers.get('content-length') || 0)
    }
    set({ saved, savedBytes: bytes })
  } catch {
    /* prywatne okno albo przegladarka bez Cache Storage - muzyka gra dalej z sieci */
  }
}

/** Pobierz caly utwor w tle; starsza wersja tego samego pliku (inne ?v=) wylatuje. */
async function saveTrack(track: MusicTrack) {
  const cs = cacheApi()
  const url = musicSrc(track)
  if (!cs || tried.has(url)) return
  tried.add(url)
  // wersja testowa (GitHub Pages) bierze nagrania z innej domeny - tam nic nie zapisujemy
  if (new URL(url, location.href).origin !== location.origin) return
  try {
    const c = await cs.open(MUSIC_CACHE)
    if (!(await c.match(url))) {
      const res = await fetch(url)
      if (res.status !== 200) return
      await c.put(url, res)
    }
    const path = new URL(url, location.href).pathname
    for (const req of await c.keys()) {
      if (new URL(req.url).pathname === path && req.url !== new URL(url, location.href).href) await c.delete(req)
    }
    await refreshSaved()
  } catch {
    tried.delete(url) // brak sieci albo miejsca - sprobujemy przy nastepnym sluchaniu
  }
}

/** „Usuń pobraną muzykę” - wszystkie zapisane utwory znikaja z telefonu. */
export async function clearSaved() {
  const cs = cacheApi()
  if (!cs) return
  try {
    await cs.delete(MUSIC_CACHE)
  } catch {
    /* nic do usuniecia */
  }
  tried.clear()
  set({ saved: [], savedBytes: 0 })
}

/** Utwory, ktore graja po kolei w danym trybie: playlista w kolejnosci dodawania, ulubione i wszystkie
 *  w kolejnosci z listy utworow. */
export function poolFor(all: MusicTrack[], mode: PlayMode, list: string[], favs: number[]): MusicTrack[] {
  if (mode === 'one') return []
  if (mode === 'list') return list.map((id) => all.find((t) => t.id === id)).filter((t): t is MusicTrack => !!t)
  if (mode === 'fav') return all.filter((t) => favs.includes(t.nr))
  return all
}

/** Nastepny (albo poprzedni) utwor w danym trybie; null = nie ma (tryb „powtarzaj” albo pusta lista). */
export function stepTrack(all: MusicTrack[], currentId: string | null, mode: PlayMode, list: string[], dir: 1 | -1 = 1, favs: number[] = []): MusicTrack | null {
  const pool = poolFor(all, mode, list, favs)
  if (!pool.length) return null
  const i = pool.findIndex((t) => t.id === currentId)
  if (i < 0) return dir === 1 ? pool[0] : pool[pool.length - 1]
  return pool[(i + dir + pool.length) % pool.length]
}

function mediaSession(track: MusicTrack) {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
  if (!ms) return
  try {
    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: '#JestNadzieja',
      album,
      artwork: [{ src: `${import.meta.env.BASE_URL}pwa-512.png`, sizes: '512x512', type: 'image/png' }],
    })
    ms.setActionHandler('play', () => resume())
    ms.setActionHandler('pause', () => pause())
    ms.setActionHandler('stop', () => stop())
    const seq = state.mode !== 'one'
    ms.setActionHandler('nexttrack', seq ? () => skip(1) : null)
    ms.setActionHandler('previoustrack', seq ? () => skip(-1) : null)
  } catch {
    /* starsza przegladarka bez MediaMetadata albo bez niektorych akcji */
  }
}

/** Lista utworow ze strony muzyki - potrzebna do grania po kolei. */
export function setTracks(list: MusicTrack[], albumTitle: string) {
  tracks = list
  album = albumTitle
}

function start(track: MusicTrack) {
  const a = el()
  cancelRamp()
  a.loop = state.mode === 'one'
  a.src = musicSrc(track)
  env = state.canVolume ? 0 : 1
  applyVolume()
  fadeInOnPlay = true
  set({ track, failed: false, waiting: true })
  mediaSession(track)
  a.play()?.catch(() => set({ playing: false, waiting: false }))
}

/** Odtworz utwor; ten sam utwor - pauza albo wznowienie. Inny w trakcie grania - wycisz i przejdz. */
export function playTrack(track: MusicTrack, albumTitle: string) {
  album = albumTitle
  const a = el()
  if (state.track?.id === track.id && a.src) {
    if (a.paused) resume()
    else pause()
    return
  }
  cancelFade()
  if (!a.paused && state.canVolume) ramp(0, FADE_OUT_MS, () => start(track))
  else start(track)
}

function skip(dir: 1 | -1) {
  const next = stepTrack(tracks, state.track?.id ?? null, state.mode, state.list, dir, state.favs)
  if (next) playTrack(next, album)
}

/** „Odtwórz ulubione” / „Odtwórz playlistę”: przelacza tryb i zaczyna od pierwszego utworu. */
export function playCollection(mode: 'fav' | 'list', albumTitle: string) {
  setMode(mode)
  const first = poolFor(tracks, mode, state.list, state.favs)[0]
  if (!first) return
  if (state.track?.id === first.id && audio && !audio.paused) return
  album = albumTitle
  const a = el()
  cancelFade()
  if (!a.paused && state.canVolume) ramp(0, FADE_OUT_MS, () => start(first))
  else start(first)
}

export function nextTrack() {
  skip(1)
}

export function resume() {
  const a = el()
  if (!a.src) return
  cancelFade()
  cancelRamp() // np. pauza w trakcie wyciszania - nie dokonczy sie po wznowieniu
  sleepMul = 1
  env = state.canVolume ? 0 : 1
  applyVolume()
  fadeInOnPlay = true
  set({ failed: false })
  a.play()?.catch(() => set({ playing: false, waiting: false }))
}

export function pause() {
  const a = audio
  if (!a) return
  ramp(0, FADE_OUT_MS, () => a.pause())
}

/** Zatrzymaj i zamknij odtwarzacz (×). */
export function stop() {
  cancelFade()
  const close = () => {
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setSleep(null)
    set({ track: null, playing: false, waiting: false, failed: false })
  }
  if (audio && !audio.paused && state.canVolume) ramp(0, FADE_OUT_MS, close)
  else {
    cancelRamp()
    close()
  }
}

export function setVolume(v: number) {
  set({ volume: Math.max(0, Math.min(1, v)) })
  applyVolume()
  savePrefs()
}

export function setMode(mode: PlayMode) {
  set({ mode })
  if (audio) audio.loop = mode === 'one'
  if (state.track) mediaSession(state.track)
  savePrefs()
}

/** Dodaj albo usun utwor z playlisty (nowy na koniec). */
export function toggleInList(id: string) {
  const list = state.list.includes(id) ? state.list.filter((x) => x !== id) : [...state.list, id]
  writeList(LIST_KEY, list)
  set({ list })
}

export function clearList() {
  writeList(LIST_KEY, [])
  set({ list: [] })
}

/** Serce przy utworze - ulubione (lib/favorites.ts, kolekcja `music`). */
export function toggleFav(nr: number) {
  toggleFavorite(FAV_COLLECTION, nr)
  set({ favs: listFavorites(FAV_COLLECTION) })
}

// ulubione mogly przyjsc z innego urzadzenia (konto) - odswiez po synchronizacji
if (typeof window !== 'undefined') {
  window.addEventListener('zywe-slowo:synced', () => set({ favs: listFavorites(FAV_COLLECTION) }))
}

// w trybie „po kolei” ostatnie sekundy utworu wyciszaja sie same (petle 1-20 nie maja wlasnego konca)
function onTime() {
  checkSleep()
  const a = audio
  if (a && state.track && a.currentTime > SAVE_AFTER_S) void saveTrack(state.track)
  if (!a || state.mode === 'one' || !state.canVolume || ramping != null) return
  const left = (a.duration || 0) - a.currentTime
  if (left > 0 && left < END_FADE_S) {
    env = left / END_FADE_S
    applyVolume()
  }
}

function onEnded() {
  const next = stepTrack(tracks, state.track?.id ?? null, state.mode, state.list, 1, state.favs)
  if (next) start(next)
  else set({ playing: false })
}

/** Wylacznik: liczba minut albo null = nie wylaczaj. */
export function setSleep(minutes: number | null) {
  if (ticker != null) window.clearInterval(ticker)
  ticker = null
  cancelFade()
  sleepMul = 1
  applyVolume()
  if (!minutes) {
    set({ sleepAt: null, sleepMinutes: null })
    return
  }
  set({ sleepAt: Date.now() + minutes * 60_000, sleepMinutes: minutes, now: Date.now() })
  ticker = window.setInterval(checkSleep, 1000)
}

function cancelFade() {
  if (fading != null) window.clearInterval(fading)
  fading = null
}

// wolane co sekunde i przy kazdym `timeupdate` (na zablokowanym telefonie interwaly bywaja wstrzymywane,
// a dzwiek gra dalej - wtedy pilnuje tego zdarzenie odtwarzacza)
function checkSleep() {
  const at = state.sleepAt
  if (at == null) return
  const now = Date.now()
  if (now - state.now >= 1000) set({ now })
  if (now < at - FADE_MS || fading != null) return
  const a = audio
  if (!a || a.paused) {
    finishSleep()
    return
  }
  fading = window.setInterval(() => {
    const left = at - Date.now()
    if (left <= 0) {
      finishSleep()
      return
    }
    sleepMul = Math.max(0, Math.min(1, left / FADE_MS))
    applyVolume()
  }, 200)
}

function finishSleep() {
  cancelFade()
  cancelRamp()
  if (audio) audio.pause()
  sleepMul = 1
  env = 1
  setSleep(null)
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useMusic(): MusicState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/** 15 -> „15 min”, 60 -> „1 godzina”, 180 -> „3 godziny”, 300 -> „5 godzin” (napisy z ui.json) */
export function sleepLabel(minutes: number, t: (k: string, f: string) => string): string {
  if (minutes < 60) return t('prayerMusic.minutes', '{n} min').replace('{n}', String(minutes))
  const h = minutes / 60
  if (h === 1) return t('prayerMusic.hour1', '1 godzina')
  return (h < 5 ? t('prayerMusic.hours2', '{n} godziny') : t('prayerMusic.hours5', '{n} godzin')).replace('{n}', String(h))
}

/** pozostaly czas wylacznika: 2:59:58 albo 14:58 */
export function leftClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** 313.6 -> „5:14” */
export function trackLength(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
