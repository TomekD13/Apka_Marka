import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { StudyEntry } from '../types'

export function StudyCard({
  study,
  tile = 'bg-slate-50 border-slate-200 hover:border-brand',
}: {
  study: StudyEntry
  tile?: string
}) {
  const { lang } = useI18n()
  return (
    <Link
      to={`/${lang}/s/${study.id}`}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-slate-900 hover:shadow-sm transition ${tile}`}
    >
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-500">{study.order}</span>
      <span className="min-w-0 flex-1 truncate font-medium leading-snug">{study.title}</span>
    </Link>
  )
}
