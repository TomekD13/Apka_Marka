// Lekcje biblijne (szkola sobotnia) prowadzi Adventech - my tylko kierujemy do
// wlasciwego tygodnia. API jest publiczne i ma otwarty CORS, wiec biezacy kwartal
// i lekcje wyliczamy w locie; nic nie trzeba aktualizowac przy zmianie kwartalu.
const API = 'https://sabbath-school.adventech.io/api/v2'
const WEB = 'https://sabbath-school.adventech.io'
/** Gdy sieci nie ma albo API sie zmieni - strona jezykowa Adventech. */
export const fallbackUrl = (lang: string) => `${WEB}/${lang}/`

interface Period {
  id: string
  title?: string
  human_date?: string
  start_date?: string
  end_date?: string
}

export interface CurrentLesson {
  url: string
  quarterTitle?: string
  lessonTitle?: string
  lessonNo?: string
  humanDate?: string
}

/** Daty z API sa w formacie DD/MM/YYYY. */
function parseDate(s?: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '')
  if (!m) return null
  return Date.UTC(+m[3], +m[2] - 1, +m[1])
}

function todayUTC(): number {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Okres obejmujacy dzisiejszy dzien; gdy zaden - pierwszy z listy (API zwraca najnowsze najpierw). */
function pickCurrent<T extends Period>(items: T[]): T | undefined {
  const today = todayUTC()
  const hit = items.find((it) => {
    const from = parseDate(it.start_date)
    const to = parseDate(it.end_date)
    return from !== null && to !== null && from <= today && today <= to
  })
  return hit || items[0]
}

async function getJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return (await res.json()) as T
}

/**
 * Znajduje lekcje na biezacy tydzien. Rzuca wyjatkiem, gdy nie da sie ustalic -
 * wolajacy ma wtedy uzyc fallbackUrl(lang).
 */
export async function findCurrentLesson(lang: string, timeoutMs = 6000): Promise<CurrentLesson> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const quarters = await getJSON<Period[]>(`${API}/${lang}/quarterlies/index.json`, ctrl.signal)
    const quarter = pickCurrent(quarters)
    if (!quarter?.id) throw new Error('brak kwartalu')

    const lessons = await getJSON<Period[]>(
      `${API}/${lang}/quarterlies/${quarter.id}/lessons/index.json`,
      ctrl.signal
    )
    const lesson = pickCurrent(lessons)
    if (!lesson?.id) throw new Error('brak lekcji')

    return {
      url: `${WEB}/${lang}/${quarter.id}/${lesson.id}/`,
      quarterTitle: quarter.title,
      lessonTitle: lesson.title,
      lessonNo: lesson.id,
      humanDate: lesson.human_date || quarter.human_date,
    }
  } finally {
    clearTimeout(timer)
  }
}
