import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadIndex } from '../content'
import { StudyCard } from '../components/StudyCard'
import type { IndexFile } from '../types'

export function SearchPage() {
  const { lang, t } = useI18n()
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim().toLowerCase()
  const [idx, setIdx] = useState<IndexFile | null>(null)

  useEffect(() => {
    loadIndex(lang).then(setIdx).catch(() => setIdx(null))
  }, [lang])

  const results = useMemo(() => {
    if (!idx || !q) return []
    return idx.studies.filter((s) => {
      const hay = [s.title, s.summary, ...(s.tags || []), ...(s.refs || [])].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [idx, q])

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{t('search.title', 'Wyniki')}</h1>
      <p className="text-sm text-slate-400 mb-4">{t('search.for', 'dla')}: „{params.get('q')}”</p>
      {results.length === 0 ? (
        <p className="text-slate-400">{t('search.noResults', 'Brak wyników.')}</p>
      ) : (
        <div className="grid gap-3">{results.map((s) => <StudyCard key={s.id} study={s} />)}</div>
      )}
    </div>
  )
}
