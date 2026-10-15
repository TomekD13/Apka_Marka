import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { mediaUrl } from '../lib/media'
import { trackEvent } from '../lib/analytics'
import type { EduGraphic } from '../types'

/**
 * Grafiki do udostepniania pod materialem Czlowieka Nadziei (decyzja autora 2026-10-15).
 *
 * Trzy rozmiary, zeby kolejne lekcje nie dociazaly telefonu (tools/build_edu_graphics.py):
 *  - pod tekstem tylko male miniatury (`thumb`, ok. 15 KB),
 *  - po dotknieciu okno z wiekszym podgladem (`view`, ok. 80 KB),
 *  - pelna grafika (`src`, ok. 250 KB) pobiera sie dopiero w otwartym oknie, do udostepnienia.
 * Pliki leza na serwerze strony, service worker ich nie zapisuje (vite.config.ts).
 *
 * „Udostępnij” na telefonie otwiera systemowe okno udostepniania z sama grafika (plik JPG)
 * i adresem materialu w opisie - wprost do WhatsAppa, Messengera, Instagrama itd.
 * Gdzie przegladarka nie umie wyslac pliku (komputer), grafika sie pobiera.
 * Pelny plik jest pobierany zaraz po otwarciu okna: Safari na iPhonie otwiera okno
 * udostepniania tylko wtedy, gdy wywolanie idzie prosto z dotkniecia, bez czekania na siec.
 */
export function EduGraphics({ items, nr, pageUrl }: { items: EduGraphic[]; nr: number; pageUrl: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const alt = (g: EduGraphic) =>
    g.text ? `${t('edu.graphicAlt', 'Grafika do udostępnienia')}: ${g.text}` : t('edu.graphicAlt', 'Grafika do udostępnienia')

  return (
    <section className="no-print mt-6 rounded-xl border border-white/10 bg-slate-900/30 p-4">
      <h2 className="mb-1 font-bold text-slate-100">{t('edu.graphics', 'Podziel się grafiką')}</h2>
      <p className="mb-3 text-sm text-slate-400">
        {t('edu.graphicsHintTap', 'Dotknij grafiki, żeby ją powiększyć i wysłać dalej – razem z linkiem do tego materiału.')}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((g, i) => (
          <button
            key={g.src}
            type="button"
            onClick={() => setOpen(i)}
            className="w-[5.5rem] overflow-hidden rounded-md border border-white/10 transition hover:border-brand/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-24"
            aria-label={`${t('edu.graphicOpen', 'Powiększ grafikę')} ${i + 1}`}
          >
            <img
              src={mediaUrl(g.thumb ?? g.view ?? g.src)}
              width={240}
              height={Math.round((240 * g.height) / g.width)}
              alt={alt(g)}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </button>
        ))}
      </div>
      {open !== null && (
        <Lightbox
          items={items}
          index={open}
          setIndex={setOpen}
          onClose={() => setOpen(null)}
          nr={nr}
          pageUrl={pageUrl}
          alt={alt}
        />
      )}
    </section>
  )
}

function Lightbox({
  items, index, setIndex, onClose, nr, pageUrl, alt,
}: {
  items: EduGraphic[]
  index: number
  setIndex: (i: number) => void
  onClose: () => void
  nr: number
  pageUrl: string
  alt: (g: EduGraphic) => string
}) {
  const { t } = useI18n()
  const g = items[index]
  const url = mediaUrl(g.src)
  const name = `JestNadzieja_${String(nr).padStart(3, '0')}_${index + 1}.jpg`
  const [file, setFile] = useState<File | null>(null)
  const [toast, setToast] = useState('')
  const many = items.length > 1
  const go = (d: number) => setIndex((index + d + items.length) % items.length)

  // pelna grafika dopiero teraz - tylko ta jedna, ktora ktos chce wyslac
  useEffect(() => {
    let alive = true
    setFile(null)
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => alive && setFile(new File([b], name, { type: 'image/jpeg' })))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url, name])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (many && e.key === 'ArrowRight') go(1)
      else if (many && e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  })

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

  const arrow = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('edu.graphics', 'Podziel się grafiką')}
    >
      <div className="relative flex max-h-full w-full max-w-md flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          key={g.src}
          src={mediaUrl(g.view ?? g.src)}
          width={g.width}
          height={g.height}
          alt={alt(g)}
          className="h-auto max-h-[72vh] w-auto max-w-full rounded-lg shadow-2xl"
        />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrow} left-1`} aria-label={t('edu.graphicPrev', 'Poprzednia grafika')}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrow} right-1`} aria-label={t('edu.graphicNext', 'Następna grafika')}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={share}
            disabled={!file}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" strokeLinecap="round" />
            </svg>
            {file ? t('edu.shareGraphic', 'Udostępnij') : t('edu.graphicPreparing', 'Przygotowuję…')}
          </button>
          {canShareFile && (
            <button type="button" onClick={download} className="text-sm text-slate-300 underline-offset-2 hover:underline">
              {t('edu.downloadGraphic', 'Pobierz')}
            </button>
          )}
          <button type="button" onClick={onClose} className="text-sm text-slate-300 underline-offset-2 hover:underline">
            {t('common.close', 'Zamknij')}
          </button>
        </div>
        {many && (
          <p className="mt-2 text-xs text-slate-400">
            {index + 1} / {items.length}
          </p>
        )}
        {toast && (
          <span role="status" className="mt-1 text-xs text-slate-300">
            {toast}
          </span>
        )}
      </div>
    </div>
  )
}
