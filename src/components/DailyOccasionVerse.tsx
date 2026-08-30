import { useEffect, useState } from 'react'
import { loadBible, loadOccasions } from '../content'
import { useI18n } from '../i18n'
import { stripTags } from '../lib/bible'

type Verse = { id: string; ref: string; text: string }
type DailyState = { date: string; order: string[]; cursor: number; current: string }

const KEY = 'zywe-slowo:daily-occasion-verse:v1'

function today() {
  return new Intl.DateTimeFormat('sv-SE').format(new Date())
}

function shuffled(ids: string[]) {
  const order = [...ids]
  for (let i = order.length - 1; i > 0; i -= 1) {
    const swap = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[swap]] = [order[swap], order[i]]
  }
  return order
}

function chooseVerse(verses: Verse[]) {
  if (verses.length === 0) return ''
  const valid = new Set(verses.map((verse) => verse.id))
  const date = today()
  let saved: DailyState | null = null
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || 'null') as DailyState | null
  } catch {
    saved = null
  }
  if (saved?.date === date && valid.has(saved.current)) return saved.current

  let order = saved?.order.filter((id) => valid.has(id)) || []
  if (order.length !== verses.length) order = shuffled(verses.map((verse) => verse.id))
  let cursor = saved?.cursor || 0
  if (cursor >= order.length) {
    order = shuffled(verses.map((verse) => verse.id))
    cursor = 0
  }
  const current = order[cursor]
  try {
    localStorage.setItem(KEY, JSON.stringify({ date, order, cursor: cursor + 1, current } satisfies DailyState))
  } catch {
    // Brak localStorage oznacza losowanie tylko dla bieżącego uruchomienia.
  }
  return current
}

export function DailyOccasionVerse() {
  const { lang } = useI18n()
  const [verse, setVerse] = useState<Verse | null>(null)

  useEffect(() => {
    let alive = true
    loadOccasions(lang)
      .then(async (occasions) => ({ occasions, bible: await loadBible(lang, occasions.translation) }))
      .then(({ occasions, bible }) => {
        const unique = new Map<string, Verse>()
        occasions.categories.forEach((category) => category.verses.forEach((entry) => {
          const text = stripTags(bible.verses[entry.osis] || '').replace(/\(\d+\)\s*/g, '').replace(/¶/g, '').trim()
          if (text && !unique.has(entry.osis)) unique.set(entry.osis, { id: entry.osis, ref: entry.ref, text })
        }))
        const chosen = unique.get(chooseVerse([...unique.values()])) || null
        if (alive) setVerse(chosen)
      })
      .catch(() => alive && setVerse(null))
    return () => { alive = false }
  }, [lang])

  if (!verse) return null
  return <section className="border-b border-brand/20 pb-4 dark:border-cyan-200/20">
    <p className="text-sm font-semibold text-brand dark:text-cyan-200">Tekst dla Ciebie</p>
    <blockquote className="reading mt-2 rounded-xl border border-brand/20 bg-white/55 px-4 py-3 text-[1.03rem] leading-relaxed text-slate-800 shadow-sm dark:border-white/15 dark:bg-slate-950/20 dark:text-white">
      <p>„{verse.text}”</p>
      <footer className="mt-2 font-sans text-sm font-semibold text-brand dark:text-cyan-200">{verse.ref}</footer>
    </blockquote>
  </section>
}
