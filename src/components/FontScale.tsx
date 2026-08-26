import { useEffect, useSyncExternalStore } from 'react'
import { useI18n } from '../i18n'
import {
  DEFAULT_SCALE,
  STEPS,
  clampScale,
  getScale,
  nearestStep,
  previewScale,
  restoreScale,
  setScale,
  subscribeScale,
} from '../lib/fontScale'

/**
 * Przelacznik wielkosci tekstu - stoi na gorze kazdego modulu do czytania.
 * Wybor zostaje na urzadzeniu (localStorage) i obowiazuje we wszystkich
 * modulach naraz: kto raz powiekszyl Biblie, ma tak samo w spiewniku.
 */
export function useFontScale() {
  const scale = useSyncExternalStore(subscribeScale, getScale, getScale)
  // zmienna CSS ustawia main.tsx przed pierwszym renderem; tu tylko pilnujemy,
  // zeby procent na przycisku i wielkosc tekstu nie rozjechaly sie nigdy
  useEffect(() => {
    restoreScale()
  }, [])
  return { scale, change: setScale }
}

/**
 * Szczypanie dwoma palcami w tresci do czytania zmienia wielkosc tekstu
 * zamiast powiekszac strone. Przez gest idzie plynnie (sam podglad),
 * a po oderwaniu palcow siada na najblizszym kroku przelacznika.
 *
 * Slucha na `document`, a nie na kazdym module z osobna: warunkiem jest to,
 * ze palce wystartowaly wewnatrz elementu z klasa `.reading`. Poza trescia
 * do czytania przegladarka zachowuje swoje wlasne powiekszanie strony.
 * Safari na iOS ma do tego osobne zdarzenia `gesture*` - bez ich zatrzymania
 * strona zoomowalaby sie mimo wszystko.
 */
export function usePinchFontScale() {
  useEffect(() => {
    let active = false
    let startDist = 0
    let startScale = DEFAULT_SCALE
    let live = DEFAULT_SCALE

    const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const inReading = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('.reading'))

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 2 || !inReading(e.target)) return
      const d = spread(e.touches)
      if (d < 24) return // palce zbyt blisko siebie - ratio byloby losowe
      active = true
      startDist = d
      startScale = getScale()
      live = startScale
    }

    function onMove(e: TouchEvent) {
      if (!active || e.touches.length !== 2) return
      e.preventDefault()
      live = clampScale(startScale * (spread(e.touches) / startDist))
      previewScale(live)
    }

    function onEnd() {
      if (!active) return
      active = false
      setScale(nearestStep(live))
    }

    function onCancel() {
      if (!active) return
      active = false
      restoreScale()
    }

    function stopGesture(e: Event) {
      if (inReading(e.target)) e.preventDefault()
    }

    const gestureEvents: string[] = ['gesturestart', 'gesturechange', 'gestureend']
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onCancel)
    for (const name of gestureEvents) document.addEventListener(name, stopGesture, { passive: false })

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
      for (const name of gestureEvents) document.removeEventListener(name, stopGesture)
    }
  }, [])
}

export function FontScale({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const { scale, change } = useFontScale()

  const at = STEPS.indexOf(scale)
  const i = at < 0 ? STEPS.indexOf(DEFAULT_SCALE) : at
  const smallerLabel = t('common.fontSmaller', 'Mniejszy tekst')
  const biggerLabel = t('common.fontBigger', 'Większy tekst')
  const resetLabel = t('common.fontReset', 'Domyślna wielkość tekstu')

  const btn =
    'rounded-md px-2 leading-none text-slate-200 transition hover:bg-brand/20 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent'

  return (
    <div
      role="group"
      aria-label={t('common.fontSize', 'Wielkość tekstu')}
      title={t('common.fontPinch', 'Wielkość tekstu – na telefonie także szczypnięciem dwoma palcami')}
      className={`no-print inline-flex items-center gap-0.5 rounded-lg border border-slate-500/40 bg-slate-900/40 p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => change(STEPS[i - 1])}
        disabled={i <= 0}
        title={smallerLabel}
        aria-label={smallerLabel}
        className={`${btn} py-1.5 text-xs font-semibold`}
      >
        A<span aria-hidden>–</span>
      </button>
      <button
        type="button"
        onClick={() => change(DEFAULT_SCALE)}
        title={resetLabel}
        aria-label={resetLabel}
        className="rounded-md px-1.5 py-1 text-[0.7rem] tabular-nums text-slate-400 transition hover:text-slate-100"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        type="button"
        onClick={() => change(STEPS[i + 1])}
        disabled={i >= STEPS.length - 1}
        title={biggerLabel}
        aria-label={biggerLabel}
        className={`${btn} py-1 text-base font-semibold`}
      >
        A<span aria-hidden>+</span>
      </button>
    </div>
  )
}
