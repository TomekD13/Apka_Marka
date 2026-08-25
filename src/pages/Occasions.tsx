import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { loadOccasions, loadBible } from '../content'
import { ShareDialog } from '../components/ShareDialog'
import type { Bible, Occasions as OccData, OccasionVerse } from '../types'

export function Occasions() {
  const { lang, t } = useI18n()
  const [oc, setOc] = useState<OccData | null>(null)
  const [bible, setBible] = useState<Bible | null>(null)
  const [err, setErr] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [share, setShare] = useState<{ text: string; title: string } | null>(null)

  useEffect(() => {
    setOc(null); setBible(null); setErr(false); setOpen(null)
    let alive = true
    loadOccasions(lang)
      .then((d) => { if (!alive) return null; setOc(d); return loadBible(lang, d.translation) })
      .then((b) => { if (alive && b) setBible(b) })
      .catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [lang])

  if (err) return <p className="text-slate-300">{t('occasions.onlyPl', 'Dostępne na razie po polsku.')}</p>
  if (!oc || !bible) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  // czysty tekst do czytania/wysyłki: bez numerów „(3)", bez „¶" oraz bez psalmowych nagłówków
  // (np. „Przewodnikowi chóru. Psalm Dawida.") doklejonych do wersetu 1 w przekładzie
  const PSALM_SUP = /^(Przewodnikowi chóru[^.]*\.|Psalm[^.]*\.|Pieśń[^.]*\.|Modlitwa[^.]*\.|Maskil[^.]*\.|Miktam[^.]*\.|Hymn[^.]*\.|Lamentacja[^.]*\.)\s*/
  const verseText = (v: OccasionVerse) => {
    let t = (bible.verses?.[v.osis] || '').replace(/\(\d+\)\s*/g, '').replace(/¶/g, '')
    let prev = ''
    while (t !== prev) { prev = t; t = t.replace(PSALM_SUP, '') }
    return t.replace(/\s+/g, ' ').trim()
  }
  const showToast = (s: string) => { setToast(s); window.setTimeout(() => setToast(''), 2000) }

  const shareVerse = (v: OccasionVerse) => {
    setShare({
      title: oc.title || t('occasions.title', 'Teksty na różną okazję'),
      text: `„${verseText(v)}"\n– ${v.ref}`,
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">{oc.title || t('occasions.title', 'Teksty na różną okazję')}</h1>
      <p className="mt-1 text-slate-300">{t('occasions.intro', 'Wybierz okazję, a znajdziesz dopasowane fragmenty Pisma.')}</p>

      <div className="mt-4 space-y-2">
        {oc.categories.map((cat) => {
          const isOpen = open === cat.id
          return (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-600 bg-slate-800/40">
              <button
                onClick={() => setOpen(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
              >
                <span className="text-xl" aria-hidden>{cat.icon}</span>
                <span className="flex-1 font-semibold text-slate-100">{cat.name}</span>
                <span className="text-xs text-slate-400">{cat.verses.length}</span>
                <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden>▾</span>
              </button>
              {isOpen && (
                <ul className="space-y-2 border-t border-white/10 p-3">
                  {cat.verses.map((v) => (
                    <li key={v.osis} className="rounded-lg bg-white p-3 text-slate-800">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-brand">{v.ref}</span>
                        <button
                          onClick={() => shareVerse(v)}
                          className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          ↗ {t('occasions.share', 'Udostępnij')}
                        </button>
                      </div>
                      <p className="mt-1 leading-relaxed">{verseText(v)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <ShareDialog
        open={!!share}
        onClose={() => setShare(null)}
        initialText={share?.text || ''}
        title={share?.title}
        url={`${window.location.origin}${import.meta.env.BASE_URL}`}
        onResult={(res) => { if (res === 'copied') showToast(t('common.copied', 'Skopiowano do schowka')) }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  )
}
