import type { ReactNode } from 'react'

/**
 * Minimalny inline-markdown dla treści studiów: `kod`, **pogrubienie**, *kursywa*.
 * Nie obsługuje zagnieżdżeń (treść ich nie używa). Zwraca tablicę węzłów Reacta.
 */
export function renderInline(text?: string): ReactNode[] {
  if (!text) return []
  const out: ReactNode[] = []
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) out.push(<code key={k++} className="rounded bg-black/5 px-1 text-[0.9em]">{m[1]}</code>)
    else if (m[2] !== undefined) out.push(<strong key={k++}>{m[2]}</strong>)
    else out.push(<em key={k++}>{m[3]}</em>)
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
