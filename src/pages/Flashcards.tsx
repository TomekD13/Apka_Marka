import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackButton, BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { loadFlashcards, loadBible } from '../content'
import type { Bible, FlashCard, Flashcards as FCData } from '../types'

const DAY = 86400000
const today = () => Math.floor(Date.now() / DAY)
const MASTERED = 10_000_000 // „bez powtórki" – termin tak odległy, że karta już nie wraca

type Progress = Record<string, { box: number; due: number }>
const pkey = (lang: string) => `flashcards:${lang}:progress`
function readProgress(lang: string): Progress {
  try { return JSON.parse(localStorage.getItem(pkey(lang)) || '{}') } catch { return {} }
}
function writeProgress(lang: string, p: Progress) {
  try { localStorage.setItem(pkey(lang), JSON.stringify(p)) } catch { /* tryb prywatny / brak miejsca */ }
}
function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// 4 poziomy znajomości -> stały termin następnej powtórki
function schedule(grade: number): { box: number; due: number } {
  if (grade === 1) return { box: 1, due: today() }        // Nie znam: dziś (wraca w sesji)
  if (grade === 2) return { box: 2, due: today() + 2 }    // Słabo: 2 dni
  if (grade === 3) return { box: 3, due: today() + 7 }    // Dobrze: 7 dni
  return { box: 4, due: MASTERED }                        // Umiem: bez powtórki
}

const GRADES = [
  { g: 1, key: 'g1', cls: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  { g: 2, key: 'g2', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { g: 3, key: 'g3', cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
  { g: 4, key: 'g4', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
]

export function Flashcards() {
  const { lang, t } = useI18n()
  const base = import.meta.env.BASE_URL
  const [fc, setFc] = useState<FCData | null>(null)
  const [bible, setBible] = useState<Bible | null>(null)
  const [err, setErr] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dir, setDir] = useState<'r2t' | 't2r'>('r2t')
  const [mode, setMode] = useState<'select' | 'session'>('select')
  const [queue, setQueue] = useState<FlashCard[]>([])
  const [sessionTotal, setSessionTotal] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [progress, setProgress] = useState<Progress>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setFc(null); setBible(null); setErr(false); setMode('select'); setQueue([]); setMsg('')
    let alive = true
    loadFlashcards(lang)
      .then((data) => {
        if (!alive) return null
        setFc(data)
        setSelected(new Set(data.themes.filter((th) => !th.bonus).map((th) => th.id)))
        setProgress(readProgress(lang))
        return loadBible(lang, data.translation)
      })
      .then((b) => { if (alive && b) setBible(b) })
      .catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [lang])

  const themeName = useMemo(() => {
    const m: Record<string, string> = {}
    fc?.themes.forEach((th) => th.cards.forEach((c) => { m[c.id] = th.name }))
    return m
  }, [fc])
  const selectableThemes = useMemo(() => fc?.themes.filter((th) => !th.bonus) ?? [], [fc])
  const bonusThemes = useMemo(() => fc?.themes.filter((th) => th.bonus) ?? [], [fc])
  const allCards = useMemo(() => fc?.themes.flatMap((th) => th.cards) ?? [], [fc])
  const mastered = allCards.filter((c) => (progress[c.id]?.due ?? 0) >= MASTERED).length

  if (err) {
    return (
      <div className="text-slate-300">
        <p className="mb-2">{t('flashcards.onlyPl', 'Fiszki są na razie dostępne po polsku.')}</p>
        <Link to="/pl/fiszki" className="text-brand-light underline">/pl/fiszki</Link>
      </div>
    )
  }
  if (!fc || !bible) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  // Tekst karty; gdy więcej niż jeden werset, każdy poprzedzony numerem w nawiasie.
  // (Zakresy typu 3-7 mają numery już w treści z pobierania.)
  const isMultiVerse = (c: FlashCard) =>
    c.osis.length > 1 || c.osis.some((o) => (o.split('.').pop() || '').includes('-'))
  const verseText = (c: FlashCard) => {
    const multi = isMultiVerse(c)
    return c.osis
      .map((o) => {
        const txt = bible.verses?.[o] || ''
        if (!txt) return ''
        const last = o.split('.').pop() || ''
        return multi && !last.includes('-') ? `(${last}) ${txt}` : txt
      })
      .filter(Boolean)
      .join(' ')
  }

  const toggleTheme = (id: string) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelected(s)
  }
  const allSelected = selectableThemes.length > 0 && selectableThemes.every((th) => selected.has(th.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableThemes.map((th) => th.id)))

  // Karty z zaznaczonych tematów; bonus (J 3,16) dołącza tylko, gdy zaznaczono WSZYSTKIE tematy.
  const selectedCards = () => {
    const chosen = selectableThemes.filter((th) => selected.has(th.id))
    let cards = chosen.flatMap((th) => th.cards)
    if (chosen.length === selectableThemes.length) cards = [...cards, ...bonusThemes.flatMap((th) => th.cards)]
    return cards
  }

  const start = (all = false) => {
    const cards = selectedCards()
    if (!cards.length) return
    const due = cards.filter((c) => { const p = progress[c.id]; return !p || p.due <= today() })
    const q = shuffle(all ? cards : (due.length ? due : cards))
    setQueue(q)
    setSessionTotal(new Set(q.map((c) => c.id)).size)
    setFlipped(false); setMode('session')
  }

  const grade = (g: number) => {
    const card = queue[0]
    if (!card) return
    const np: Progress = { ...progress, [card.id]: schedule(g) }
    setProgress(np); writeProgress(lang, np)
    const rest = queue.slice(1)
    setQueue(g === 1 ? [...rest, card] : rest) // tylko „Nie znam" wraca w tej sesji
    setFlipped(false)
  }

  const resetProgress = () => {
    if (!window.confirm(t('flashcards.resetConfirm', 'Na pewno wyczyścić zapisany postęp?'))) return
    writeProgress(lang, {}); setProgress({}); setMsg(t('flashcards.resetDone', 'Postęp wyczyszczony.'))
  }

  const fmtDays = (d: number) => (d <= 0 ? t('flashcards.today', 'dziś') : `${d} ${t('flashcards.dayAbbr', 'dz.')}`)
  const gradeHint = (g: number) => {
    const s = schedule(g)
    return s.due >= MASTERED ? t('flashcards.noRepeat', 'bez powtórki') : fmtDays(s.due - today())
  }

  // ----- SESJA NAUKI -----
  if (mode === 'session') {
    const card = queue[0]
    if (!card) {
      return (
        <div className="text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="mt-2 text-xl font-bold text-slate-100">{t('flashcards.sessionDone', 'Na dziś gotowe!')}</h2>
          <p className="mt-2 text-slate-300">{t('flashcards.sessionDoneDesc', 'Wróć jutro, by utrwalić.')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button onClick={() => start(true)} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-light">
              {t('flashcards.practiceAll', 'Ćwicz wszystkie')}
            </button>
            <button onClick={() => setMode('select')} className="rounded-lg border border-slate-500 px-4 py-2 text-slate-200 hover:bg-white/5">
              {t('flashcards.backToThemes', 'Wróć do wyboru')}
            </button>
          </div>
        </div>
      )
    }
    const isRefSide = dir === 'r2t' ? !flipped : flipped
    const toLearn = new Set(queue.map((c) => c.id)).size
    const learned = Math.max(0, sessionTotal - toLearn)
    return (
      <div>
        <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
          <BackButton onClick={() => setMode('select')}>
            {t('flashcards.backToThemes', 'Wróć do wyboru')}
          </BackButton>
          <span>{t('flashcards.toLearn', 'Do nauczenia')}: {toLearn} · {t('flashcards.learned', 'Nauczone')}: {learned}</span>
        </div>
        <div
          onClick={() => !flipped && setFlipped(true)}
          className="flex min-h-[14rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
        >
          {isRefSide ? (
            <div className="text-2xl font-bold text-brand">{card.ref}</div>
          ) : (
            <div className="max-h-72 overflow-y-auto text-[1.05rem] leading-relaxed text-slate-800">{verseText(card)}</div>
          )}
          {/* Kategoria tylko przy ODPOWIEDZI (po odwróceniu), żeby nie ułatwiać. */}
          {flipped && <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">{themeName[card.id]}</div>}
          {!flipped && <div className="mt-4 text-xs text-slate-400">{t('flashcards.flipHint', 'Dotknij, aby pokazać odpowiedź')}</div>}
        </div>
        {flipped ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map(({ g, key, cls }) => (
              <button key={key} onClick={() => grade(g)} className={`rounded-lg px-2 py-3 font-semibold ${cls}`}>
                <div>{t(`flashcards.${key}`, key)}</div>
                <div className="mt-0.5 text-[0.7rem] font-normal opacity-70">{gradeHint(g)}</div>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => setFlipped(true)} className="mt-4 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-light">
            {t('flashcards.flip', 'Pokaż odpowiedź')}
          </button>
        )}
      </div>
    )
  }

  // ----- WYBÓR TEMATÓW -----
  return (
    <div>
      <BackLink to={`/${lang}`} className="mb-4">
        {t('nav.topics', 'Menu główne')}
      </BackLink>
      <PageHeading icon="memory" title={t('flashcards.title', 'Wersety na pamięć')} />
      <p className="mt-1 text-slate-300">{t('flashcards.intro', '')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-400">{t('flashcards.direction', 'Kierunek')}:</span>
        <button onClick={() => setDir('r2t')} className={`rounded-full px-3 py-1 ${dir === 'r2t' ? 'bg-brand text-white' : 'border border-slate-500 text-slate-300'}`}>{t('flashcards.dirR2T', 'Odnośnik → tekst')}</button>
        <button onClick={() => setDir('t2r')} className={`rounded-full px-3 py-1 ${dir === 't2r' ? 'bg-brand text-white' : 'border border-slate-500 text-slate-300'}`}>{t('flashcards.dirT2R', 'Tekst → odnośnik')}</button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-600 bg-slate-800/40 p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="font-semibold text-slate-100">{t('flashcards.chooseThemes', 'Wybierz tematy do nauki')}</span>
          <button onClick={toggleAll} className="text-sm text-brand-light hover:underline">{t('flashcards.all', 'Wszystkie / żadne')}</button>
        </div>
        <ul className="mt-3 space-y-1">
          {selectableThemes.map((th) => (
            <li key={th.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                <input type="checkbox" checked={selected.has(th.id)} onChange={() => toggleTheme(th.id)} className="h-4 w-4 accent-brand" />
                <span className="flex-1 text-slate-200">{th.name}</span>
                <span className="text-xs text-slate-400">{th.cards.length}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={() => start(false)} disabled={selected.size === 0}
        className="mt-4 w-full rounded-lg bg-brand px-4 py-3 font-bold text-white shadow-sm hover:bg-brand-light disabled:opacity-50">
        {t('flashcards.start', 'Zacznij naukę')}
      </button>
      {selected.size === 0 && <p className="mt-1 text-center text-xs text-amber-300">{t('flashcards.selectAtLeastOne', 'Zaznacz przynajmniej jeden temat.')}</p>}

      <p className="mt-3 text-center text-xs text-slate-400">{t('flashcards.mastered', 'Opanowane')}: {mastered} / {allCards.length}</p>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400">
        🔒 {t('flashcards.localOnly', 'Postęp zapisywany tylko na tym urządzeniu, bez konta.')}
        <button onClick={resetProgress} className="ml-2 text-rose-300 hover:underline">{t('flashcards.reset', 'Wyczyść postęp')}</button>
        {msg && <span className="ml-2 text-emerald-300">{msg}</span>}
      </div>

      {fc.anki && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href={`${base}downloads/Biblia-50-tekstow_Skrot-do-Tekst.apkg`} download
            className="rounded-lg border border-slate-600 px-3 py-2 text-center text-sm text-slate-200 hover:bg-white/5">
            ⬇ {t('flashcards.ankiR2T', 'AnkiDroid: Skrót → Tekst')}
          </a>
          <a href={`${base}downloads/Biblia-50-tekstow_Tekst-do-Skrot.apkg`} download
            className="rounded-lg border border-slate-600 px-3 py-2 text-center text-sm text-slate-200 hover:bg-white/5">
            ⬇ {t('flashcards.ankiT2R', 'AnkiDroid: Tekst → Skrót')}
          </a>
        </div>
      )}
      {fc.quizletUrl && (
        <a href={fc.quizletUrl} target="_blank" rel="noopener noreferrer"
          className="mt-2 block rounded-lg border border-slate-600 px-3 py-2 text-center text-sm text-slate-200 hover:bg-white/5">
          {t('flashcards.quizlet', 'Wolisz Quizlet? Otwórz zestaw')}
        </a>
      )}
    </div>
  )
}
