import { useState } from 'react'
import { useI18n } from '../i18n'
import { LEVEL_STYLES } from './LevelToggle'
import { renderInline } from '../md'
import type { Bible, PassageItem } from '../types'

// Ucina muzyczne nagłówki psalmów doklejone do w.1 (np. „Przewodnikowi chóru. Psalm Dawida.")
// oraz znak ¶, zachowując numery wersetów „(N)". Wzorce polskie (BE/UBG) – inne języki bez zmian.
// W Biblii Ekumenicznej tytuł bywa samym imieniem autora („Dawida. Błogosław, duszo moja…").
const PSALM_SUP = /^(Przewodnikowi chóru[^.]*\.|Psalm[^.]*\.|Pieśń[^.]*\.|Modlitwa[^.]*\.|Maskil[^.]*\.|Miktam[^.]*\.|Hymn[^.]*\.|Lamentacja[^.]*\.|Dawida[^.]*\.|Asafa[^.]*\.|Salomona[^.]*\.|Mojżesza[^.]*\.|Synów Koracha[^.]*\.)\s*/
function cleanVerse(raw: string): string {
  let t = raw.replace(/¶/g, '')
  const prefix = (t.match(/^\(\d+\)\s*/) || [''])[0] // zachowaj wiodące „(N) "
  let rest = t.slice(prefix.length)
  let prev = ''
  while (rest !== prev) { prev = rest; rest = rest.replace(PSALM_SUP, '') }
  return (prefix + rest).replace(/\s+/g, ' ').trim()
}

export function PassageView({ item, bible }: { item: PassageItem; bible?: Bible }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const s = LEVEL_STYLES[item.level]

  return (
    <div className={`rounded-lg border p-3 text-slate-800 ${s.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        {item.level !== 'base' && (
          <span className={`rounded px-1.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide ${s.chip}`}>
            {t(`reader.${item.level}`, item.level)}
          </span>
        )}
        {item.passage.map((p) => (
          <button
            key={p.osis}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full border border-brand/50 text-brand px-2.5 py-0.5 text-sm hover:bg-brand/10"
          >
            {p.ref}
          </button>
        ))}
        <span className="text-xs text-slate-500 no-print">
          {open ? t('reader.hideVerse', 'Ukryj tekst') : t('reader.showVerse', 'Pokaż tekst')}
        </span>
      </div>

      {open && (
        <div className="verse-box mt-2 rounded-lg bg-white border border-slate-200 p-3 text-[0.97em] text-slate-800">
          {item.passage.map((p) => (
            <p key={p.osis} className="mb-1 last:mb-0">
              <span className="font-medium text-brand">{p.ref}</span>{' '}
              <span>{bible?.verses?.[p.osis] ? cleanVerse(bible.verses[p.osis]) : t('common.placeholderBible', '…')}</span>
            </p>
          ))}
        </div>
      )}

      {item.comment && <p className="mt-2 study-prose">{renderInline(item.comment)}</p>}

      {item.questions?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.questions.map((q) => (
            <li key={q.id} className="flex gap-2 text-slate-700">
              <span className="text-brand">•</span>
              <span>{q.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
