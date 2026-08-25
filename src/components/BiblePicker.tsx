import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { BibleBookMeta } from '../types'

// Wybor miejsca w Biblii przez klikanie, bez wpisywania czegokolwiek:
//   Testament -> ksiega -> rozdzial -> werset.
// Ksiegi stoja jako skroty w gestej siatce (caly Stary Testament miesci sie naraz),
// a obie belki testamentow zostaja widoczne, wiec przejscie ST <-> NT to jedno klikniecie.
// Ten sam komponent stoi na stronie `/pl/biblia` i w belce menu glownego.

const PATH = 'biblia'
const MEMO = 'zywe-slowo:bible-picker:v1'

type Testament = 'ot' | 'nt'

interface Memo {
  testament?: Testament
  book?: string
  chapter?: number
}

function readMemo(): Memo {
  try {
    return JSON.parse(sessionStorage.getItem(MEMO) || '{}')
  } catch {
    return {}
  }
}

function writeMemo(m: Memo): void {
  try {
    sessionStorage.setItem(MEMO, JSON.stringify(m))
  } catch {
    /* prywatne okno - wybor zyje tylko w pamieci */
  }
}

/** Kafelek kroku - skrot ksiegi albo liczba; pelna nazwa siedzi w `title`. */
function Tile({
  label,
  onClick,
  title,
  numeric = false,
}: {
  label: string
  onClick: () => void
  title?: string
  numeric?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`truncate rounded border border-slate-200 bg-slate-50 px-0.5 py-1.5 text-center text-xs leading-tight text-slate-900 transition hover:border-brand hover:bg-white ${
        numeric ? 'tabular-nums' : 'font-medium'
      }`}
    >
      {label}
    </button>
  )
}

/** Sciezka wyboru - kazdy krok wstecz jednym kliknieciem. */
function Crumbs({ steps }: { steps: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-300">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-500">›</span>}
          {s.onClick ? (
            <button type="button" onClick={s.onClick} className="text-brand-light hover:underline">
              {s.label}
            </button>
          ) : (
            <span className="font-semibold text-slate-100">{s.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/**
 * Powrot o krok wyzej. Belka testamentu, w ktorym stoi wybrana ksiega, jest
 * podswietlona - to nia wraca sie do spisu ksiag. Druga stoi obok, zeby zmiana
 * zdania co do ksiegi nie wymagala szukania drogi powrotnej.
 */
function TestamentBar({
  labels,
  current,
  onBack,
  onSwitch,
}: {
  labels: Record<Testament, string>
  current: Testament
  onBack: () => void
  onSwitch: (v: Testament) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(['ot', 'nt'] as Testament[]).map((v) => {
        const here = v === current
        return (
          <button
            key={v}
            type="button"
            onClick={() => (here ? onBack() : onSwitch(v))}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              here
                ? 'bg-brand font-semibold text-white hover:bg-brand-light'
                : 'border border-slate-500/50 text-slate-200 hover:border-brand hover:text-white'
            }`}
          >
            <span aria-hidden>‹ </span>
            {labels[v]}
          </button>
        )
      })}
    </div>
  )
}

export function BiblePicker({ books }: { books: BibleBookMeta[] }) {
  const { lang, t } = useI18n()
  const nav = useNavigate()
  const memo = readMemo()
  const [testament, setTestament] = useState<Testament | null>(memo.testament ?? null)
  const [bookOsis, setBookOsis] = useState<string | null>(memo.book ?? null)
  const [chapter, setChapter] = useState<number | null>(memo.chapter ?? null)

  const book = bookOsis ? books.find((b) => b.osis === bookOsis) ?? null : null
  const verseCount = book && chapter ? book.chapters[chapter - 1] || 0 : 0

  function pickTestament(v: Testament | null) {
    setTestament(v)
    setBookOsis(null)
    setChapter(null)
    writeMemo({ testament: v ?? undefined })
  }
  function pickBook(b: BibleBookMeta | null) {
    setBookOsis(b?.osis ?? null)
    setChapter(null)
    writeMemo({ testament: testament ?? undefined, book: b?.osis })
  }
  function pickChapter(n: number | null) {
    setChapter(n)
    writeMemo({ testament: testament ?? undefined, book: bookOsis ?? undefined, chapter: n ?? undefined })
  }

  const T_LABEL: Record<Testament, string> = {
    ot: t('bible.ot', 'Stary Testament'),
    nt: t('bible.nt', 'Nowy Testament'),
  }

  // --- krok 1 i 2 razem: obie belki widoczne, ksiegi rozwijaja sie pod wybrana
  if (!book) {
    return (
      <div className="space-y-2">
        {(['ot', 'nt'] as Testament[]).map((v) => {
          const open = testament === v
          const list = books.filter((b) => b.testament === v)
          return (
            <div key={v} className="rounded-xl border border-slate-500/40 bg-slate-800/60">
              <button
                type="button"
                onClick={() => pickTestament(open ? null : v)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="flex-1 font-semibold text-slate-100">{T_LABEL[v]}</span>
                <span className="text-xs text-slate-400">
                  {list.length} {t('bible.booksCount', 'ksiąg')}
                </span>
                <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>
                  ›
                </span>
              </button>
              {open && (
                <div className="grid grid-cols-5 gap-1 border-t border-white/10 p-2 sm:grid-cols-8">
                  {list.map((b) => (
                    <Tile key={b.osis} label={b.abbr} title={b.name} onClick={() => pickBook(b)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // --- krok 3: rozdzial
  if (!chapter) {
    return (
      <div className="space-y-2">
        <TestamentBar
          labels={T_LABEL}
          current={book.testament}
          onBack={() => pickBook(null)}
          onSwitch={pickTestament}
        />
        <Crumbs steps={[{ label: book.name }]} />
        <p className="text-xs text-slate-300">{t('bible.chapter', 'Rozdział')}</p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
          {book.chapters.map((_, i) => (
            <Tile key={i + 1} label={String(i + 1)} numeric onClick={() => pickChapter(i + 1)} />
          ))}
        </div>
      </div>
    )
  }

  // --- krok 4: werset (albo caly rozdzial)
  return (
    <div className="space-y-2">
      <TestamentBar
        labels={T_LABEL}
        current={book.testament}
        onBack={() => pickBook(null)}
        onSwitch={pickTestament}
      />
      <Crumbs
        steps={[
          { label: book.name, onClick: () => pickChapter(null) },
          { label: String(chapter) },
        ]}
      />
      <button
        type="button"
        onClick={() => nav(`/${lang}/${PATH}/${book.osis}/${chapter}`)}
        className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light"
      >
        {t('bible.wholeChapter', 'Otwórz cały rozdział')}
      </button>
      <p className="text-xs text-slate-300">{t('bible.verse', 'albo wybierz werset')}</p>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((n) => (
          <Tile
            key={n}
            label={String(n)}
            numeric
            onClick={() => nav(`/${lang}/${PATH}/${book.osis}/${chapter}?w=${n}`)}
          />
        ))}
      </div>
    </div>
  )
}
