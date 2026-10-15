import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { mediaUrl } from '../lib/media'
import { trackEvent } from '../lib/analytics'
import type { EduGraphic } from '../types'

/**
 * Grafiki do udostepniania pod materialem Czlowieka Nadziei (decyzja autora 2026-10-15).
 *
 * „Udostępnij” na telefonie otwiera systemowe okno udostepniania z sama grafika (plik JPG)
 * i adresem materialu w opisie - wprost do WhatsAppa, Messengera, Instagrama itd.
 * Gdzie przegladarka nie umie wyslac pliku (komputer), grafika sie pobiera.
 *
 * Plik jest pobierany z wyprzedzeniem, zaraz po wyswietleniu: Safari na iPhonie otwiera
 * okno udostepniania tylko wtedy, gdy wywolanie idzie prosto z dotkniecia, bez czekania
 * na siec po drodze.
 */
export function EduGraphics({ items, nr, pageUrl }: { items: EduGraphic[]; nr: number; pageUrl: string }) {
  const { t } = useI18n()
  return (
    <section className="no-print mt-6 rounded-xl border border-white/10 bg-slate-900/30 p-4">
      <h2 className="mb-1 font-bold text-slate-100">{t('edu.graphics', 'Podziel się grafiką')}</h2>
      <p className="mb-3 text-sm text-slate-400">
        {t('edu.graphicsHint', 'Wyślij grafikę z myślą z tego materiału – razem z linkiem do niego.')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((g, i) => (
          <Graphic key={g.src} g={g} name={`JestNadzieja_${String(nr).padStart(3, '0')}_${i + 1}.jpg`} pageUrl={pageUrl} />
        ))}
      </div>
    </section>
  )
}

function Graphic({ g, name, pageUrl }: { g: EduGraphic; name: string; pageUrl: string }) {
  const { t } = useI18n()
  const url = mediaUrl(g.src)
  const [file, setFile] = useState<File | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let alive = true
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => alive && setFile(new File([b], name, { type: 'image/jpeg' })))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url, name])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }))
  const caption = [g.text, pageUrl].filter(Boolean).join('\n\n')

  function download() {
    const a = document.createElement('a')
    a.href = file ? URL.createObjectURL(file) : url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    if (file) window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setToast(t('edu.graphicSaved', 'Grafika zapisana w pobranych plikach'))
  }

  async function share() {
    if (file && canShareFile) {
      try {
        await navigator.share({ files: [file], text: caption })
        trackEvent('share')
        return
      } catch (e: any) {
        if (e && e.name === 'AbortError') return // okno zamkniete
      }
    }
    download()
  }

  const alt = g.text ? `${t('edu.graphicAlt', 'Grafika do udostępnienia')}: ${g.text}` : t('edu.graphicAlt', 'Grafika do udostępnienia')

  return (
    <figure className="flex flex-col">
      <img
        src={url}
        width={g.width}
        height={g.height}
        alt={alt}
        loading="lazy"
        className="h-auto w-full rounded-lg border border-white/10"
      />
      <figcaption className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand/70 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:bg-brand/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" strokeLinecap="round" />
          </svg>
          {t('edu.shareGraphic', 'Udostępnij')}
        </button>
        {canShareFile && (
          <button type="button" onClick={download} className="text-xs text-slate-400 underline-offset-2 hover:underline">
            {t('edu.downloadGraphic', 'Pobierz')}
          </button>
        )}
        {toast && (
          <span role="status" className="text-xs text-slate-400">
            {toast}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
