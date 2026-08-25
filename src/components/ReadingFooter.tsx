import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { shareContent } from '../lib/share'
import { getRating, isRead, setRating, setRead, type ReadKind } from '../lib/progress'

// Stopka czytanki i materialu edukacyjnego. Odhaczenie „przeczytane" i ocena
// stoja posrodku - to one koncza czytanie. Nizej dzielenie sie: WhatsApp,
// Messenger, systemowe okno i zaproszenie do aplikacji.
//
// Oceny ida do arkusza przez formularz (Google Forms -> Arkusze albo Microsoft
// Forms -> Excel Online). Adres formularza siedzi w tresci (`ui.json`, klucz
// `reading.rateUrl`) jako wzorzec z miejscami `{ocena}` i `{material}`; pusty
// adres znaczy tyle, ze ocena zostaje tylko w tej przegladarce.

function Ptaszek({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
        done ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-400 text-transparent'
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function ReadingFooter({
  kind,
  id,
  title,
  showFull,
  onShowFull,
  shareTitle,
  shareText,
}: {
  kind: ReadKind
  id: number
  /** tytul do formularza oceny, zeby w arkuszu bylo widac, czego dotyczy */
  title: string
  /** czy pokazac przejscie do pelnej wersji (czytamy krotka, a pelna istnieje) */
  showFull: boolean
  onShowFull: () => void
  shareTitle: string
  shareText: string
}) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const [stars, setStars] = useState(0)
  const [rating, setRatingOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setDone(isRead(kind, id))
    setStars(getRating(kind, id))
    setRatingOpen(false)
    setToast('')
  }, [kind, id])

  const url = typeof window === 'undefined' ? '' : window.location.href
  const appUrl =
    typeof window === 'undefined' ? '' : window.location.origin + import.meta.env.BASE_URL
  const inviteText = t('reading.inviteText', 'Zapraszam cię do #JestNadzieja – Biblia, studia biblijne i czytanki w jednym miejscu.')

  function open(target: string) {
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  function whatsapp(text: string, link: string) {
    open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`)
  }

  function messenger(link: string) {
    // Bez wlasnego identyfikatora aplikacji Facebooka zostaje odnosnik, ktory
    // przejmuje Messenger na telefonie. Na komputerze nie zadziala - stad
    // systemowe „Udostępnij" obok.
    open(`fb-messenger://share/?link=${encodeURIComponent(link)}`)
  }

  async function share(text: string, link: string) {
    const r = await shareContent({ title: shareTitle, text, url: link })
    setToast(
      r === 'shared' ? '' : r === 'copied' ? t('share.copied', 'Skopiowano') : t('share.failed', 'Nie udało się')
    )
  }

  function rate(value: number) {
    setStars(setRating(kind, id, value))
    const wzorzec = t('reading.rateUrl', '')
    if (wzorzec) {
      const adres = wzorzec
        .replace('{ocena}', String(value))
        .replace('{material}', encodeURIComponent(`${kind} ${id}: ${title}`))
      // Google Forms przyjmuje zgloszenie prosto z przegladarki (`/formResponse`) -
      // czytelnik zostaje w aplikacji. Kazdy inny formularz otwieramy w nowej karcie.
      if (adres.includes('/formResponse')) {
        fetch(adres, { method: 'POST', mode: 'no-cors' }).catch(() => undefined)
      } else {
        open(adres)
      }
    }
    setToast(t('reading.rateThanks', 'Dzięki za ocenę.'))
  }

  const btn =
    'rounded-lg border border-slate-500/50 px-3 py-1.5 text-sm text-slate-200 transition hover:border-brand hover:text-slate-100'

  return (
    <div className="no-print mt-8 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setDone(setRead(kind, id, !done))}
          aria-pressed={done}
          className={`inline-flex items-center gap-3 rounded-2xl border-2 px-6 py-3 text-base font-semibold transition ${
            done
              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
              : 'border-slate-500/60 text-slate-200 hover:border-emerald-400 hover:text-white'
          }`}
        >
          <Ptaszek done={done} />
          {t('reading.done', 'Przeczytane')}
        </button>

        <button
          type="button"
          onClick={() => setRatingOpen((v) => !v)}
          aria-expanded={rating}
          className={`inline-flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-base font-semibold transition ${
            stars
              ? 'border-amber-400 bg-amber-400/15 text-amber-100'
              : 'border-slate-500/60 text-slate-200 hover:border-amber-400 hover:text-white'
          }`}
        >
          <span aria-hidden>{stars ? '★' : '☆'}</span>
          {t('reading.rate', 'Oceń materiał')}
          {stars > 0 && <span className="text-sm font-normal text-amber-200/80">{stars}/5</span>}
        </button>
      </div>

      {rating && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                aria-label={`${n}/5`}
                className={`text-2xl leading-none transition ${
                  n <= stars ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'
                }`}
              >
                {n <= stars ? '★' : '☆'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {t('reading.rateHint', 'Ocena pomaga dobierać kolejne materiały.')}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {showFull && (
          <button type="button" onClick={onShowFull} className={btn}>
            {t('reading.full', 'Czytaj pełną wersję')}
          </button>
        )}
        <button type="button" onClick={() => whatsapp(`${shareTitle}\n${shareText}`, url)} className={btn}>
          {t('reading.whatsapp', 'WhatsApp')}
        </button>
        <button type="button" onClick={() => messenger(url)} className={btn}>
          {t('reading.messenger', 'Messenger')}
        </button>
        <button type="button" onClick={() => share(shareText, url)} className={btn}>
          {t('reading.share', 'Udostępnij')}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => share(inviteText, appUrl)}
          className="rounded-lg border border-brand/60 bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand-light transition hover:bg-brand/20"
        >
          {t('reading.invite', 'Zaproś przyjaciół')}
        </button>
        <button type="button" onClick={() => whatsapp(inviteText, appUrl)} className={btn}>
          {t('reading.inviteWhatsapp', 'Zaproś przez WhatsApp')}
        </button>
        {toast && <span className="text-xs text-slate-400">{toast}</span>}
      </div>
    </div>
  )
}
