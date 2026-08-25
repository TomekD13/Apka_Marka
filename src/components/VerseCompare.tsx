import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { loadBibleBook, listTranslations, osisKey } from '../lib/bible'
import { loadBible, loadLangs } from '../content'
import { VerseText } from './VerseText'

// Jeden werset we wszystkich przekladach, ktore czytelnik ma na urzadzeniu -
// i tych z serwera, i tych doinstalowanych z pliku (decyzja autora 2026-08-25).
// Ksiega dociaga sie w calosci (3-225 KB), ale tylko raz: `loadBibleBook` trzyma
// ja w pamieci, a service worker w cache.

interface Row {
  code: string
  name: string
  text: string | null
}

export function VerseCompare({
  osis,
  chapter,
  verse,
  skip,
}: {
  osis: string
  chapter: number
  verse: number
  /** przeklad, ktory czytelnik ma juz przed oczami */
  skip: string[]
}) {
  const { lang, t } = useI18n()
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    let alive = true
    setRows(null)
    listTranslations(lang)
      .then(async ({ translations }) => {
        const wanted = translations.filter((x) => !skip.includes(x.code))
        const out = await Promise.all(
          wanted.map(async (x) => {
            const text = await loadBibleBook(lang, x.code, osis)
              .then((book) => book[chapter - 1]?.[verse - 1] || null)
              .catch(() => null)
            return { code: x.code, name: x.name, text }
          })
        )
        // wersety do studiow leza osobno (`bibles/{KOD}.json`) i pokrywaja tylko to,
        // co pada w scenariuszach - ale to wlasnie w nich jest Biblia Ekumeniczna
        const langs = await loadLangs().catch(() => null)
        const study = langs?.languages.find((l) => l.code === lang)?.defaultTranslation
        if (study && !skip.includes(study) && !out.some((r) => r.code === study)) {
          const text = await loadBible(lang, study)
            .then((b) => b.verses[osisKey(osis, chapter, verse)] || null)
            .catch(() => null)
          if (text) out.unshift({ code: study, name: study, text })
        }
        if (alive) setRows(out.filter((r) => r.text))
      })
      .catch(() => alive && setRows([]))
    return () => {
      alive = false
    }
    // skip zmienia sie razem z przekladem, ktory czytamy - stad join
  }, [lang, osis, chapter, verse, skip.join(',')])

  if (!rows) return <p className="px-2 py-1 text-xs text-slate-500">{t('common.loading', '…')}</p>
  if (rows.length === 0)
    return (
      <p className="px-2 py-1 text-xs text-slate-500">
        {t('bible.noOther', 'Nie ma na tym urządzeniu innego przekładu tego wersetu.')}
      </p>
    )

  return (
    <div className="space-y-2 px-2 py-1">
      {rows.map((r) => (
        <div key={r.code}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500" title={r.name}>
            {r.code}
          </p>
          <p className="text-slate-800">
            <VerseText text={r.text || ''} />
          </p>
        </div>
      ))}
    </div>
  )
}
