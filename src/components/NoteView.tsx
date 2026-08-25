import { useI18n } from '../i18n'
import { LEVEL_STYLES } from './LevelToggle'
import { renderInline } from '../md'
import type { NoteItem } from '../types'

export function NoteView({ item }: { item: NoteItem }) {
  const { t } = useI18n()
  const typeLabel = t(`reader.noteTypes.${item.noteType}`, item.noteType)
  const s = LEVEL_STYLES[item.level]
  return (
    <div className={`rounded-lg border p-3 text-slate-800 shadow-[inset_3px_0_0_#f59e0b] ${s.card}`}>
      <div className="flex items-center gap-2">
        <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-xs">
          {typeLabel}
        </span>
        <h4 className="font-medium text-slate-900">{item.label}</h4>
      </div>
      {item.content && <p className="mt-1 study-prose text-slate-700">{renderInline(item.content)}</p>}
      {item.original?.map((o, i) => (
        <p key={i} className="mt-1 text-[0.97rem] text-slate-800">
          <span className="text-xs uppercase text-slate-500 mr-1">{o.lang}</span>
          <span className="font-serif">{o.text}</span>
          {o.translit && <span className="text-slate-500"> - {o.translit}</span>}
        </p>
      ))}
      {item.questions?.map((q) => (
        <p key={q.id} className="mt-1 flex gap-2 text-slate-700">
          <span className="text-brand">•</span>
          <span>{q.text}</span>
        </p>
      ))}
    </div>
  )
}
