import { Fragment, type ReactNode } from 'react'
import { fold } from '../lib/bible'

// Tekst wersetu niesie dwa znaczniki ze skladu przekladu:
//   <i>…</i>  slowa dopowiedziane przez tlumaczy (w druku kursywa),
//   <b>…</b>  nadpis psalmu wpleciony w werset 1.
// Renderujemy je wlasnym parserem, a nie przez innerHTML – do przegladarki nie
// trafia nic, czego sami nie zbudowalismy.

const TOKEN = /<(\/?)([ib])>/g

interface Chunk { text: string; italic: boolean; bold: boolean }

function chunks(raw: string): Chunk[] {
  const out: Chunk[] = []
  let italic = 0
  let bold = 0
  let last = 0
  for (const m of raw.matchAll(TOKEN)) {
    const before = raw.slice(last, m.index)
    if (before) out.push({ text: before, italic: italic > 0, bold: bold > 0 })
    const closing = m[1] === '/'
    if (m[2] === 'i') italic += closing ? -1 : 1
    else bold += closing ? -1 : 1
    if (italic < 0) italic = 0
    if (bold < 0) bold = 0
    last = (m.index ?? 0) + m[0].length
  }
  const tail = raw.slice(last)
  if (tail) out.push({ text: tail, italic: italic > 0, bold: bold > 0 })
  return out
}

/** Podswietlenie szukanej frazy - porownanie bez ogonkow, jak w wyszukiwarce. */
function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text
  const hay = fold(text)
  const wanted = fold(needle)
  if (!wanted || !hay.includes(wanted)) return text
  // fold() zmienia dlugosc (usuwa spacje i kropki), wiec pozycje liczymy po mapie indeksow
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    if (fold(text[i]).length) map.push(i)
  }
  const out: ReactNode[] = []
  let from = 0
  let at = hay.indexOf(wanted)
  let key = 0
  while (at >= 0 && at < map.length) {
    const start = map[at]
    const endIdx = at + wanted.length - 1
    const end = (endIdx < map.length ? map[endIdx] : text.length - 1) + 1
    if (start > from) out.push(<Fragment key={key++}>{text.slice(from, start)}</Fragment>)
    out.push(
      <mark key={key++} className="rounded bg-amber-300/70 px-0.5 text-slate-900">
        {text.slice(start, end)}
      </mark>
    )
    from = end
    at = hay.indexOf(wanted, at + wanted.length)
  }
  if (from < text.length) out.push(<Fragment key={key++}>{text.slice(from)}</Fragment>)
  return out
}

export function VerseText({ text, mark = '' }: { text: string; mark?: string }) {
  return (
    <>
      {chunks(text).map((c, i) => {
        const body = highlight(c.text, mark)
        if (c.bold) return <b key={i} className="font-semibold">{body}</b>
        if (c.italic) return <i key={i} className="italic text-slate-500">{body}</i>
        return <Fragment key={i}>{body}</Fragment>
      })}
    </>
  )
}
