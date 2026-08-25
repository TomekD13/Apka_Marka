import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadIndex } from '../content'
import { StudyCard } from '../components/StudyCard'
import type { IndexFile } from '../types'

export function CategoryPage() {
  const { lang, t } = useI18n()
  const { category = '' } = useParams()
  const [idx, setIdx] = useState<IndexFile | null>(null)

  useEffect(() => {
    loadIndex(lang).then(setIdx).catch(() => setIdx(null))
  }, [lang])

  if (!idx) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  let studies = idx.studies.filter((s) => s.category === category)
  if (category === 'topic') studies = [...studies].sort((a, b) => a.title.localeCompare(b.title, lang))
  else studies = [...studies].sort((a, b) => a.order - b.order)

  const title = t(`home.${category}`, category)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{title}</h1>
      {studies.length === 0 ? (
        <p className="text-slate-400">{t('category.empty')}</p>
      ) : (
        <div className="grid gap-3">{studies.map((s) => <StudyCard key={s.id} study={s} />)}</div>
      )}
    </div>
  )
}
