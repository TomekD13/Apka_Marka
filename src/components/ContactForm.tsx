import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'

// Brak backendu (prywatność): formularz buduje wiadomość i otwiera ją w programie
// pocztowym użytkownika (mailto). Żadne dane nie są wysyłane na serwer.
const CONTACT_EMAIL = 'marek.micyk@adwent.pl'

export function ContactForm() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [human, setHuman] = useState(false)
  const [hp, setHp] = useState('') // honeypot - boty wypełniają, ludzie nie

  const ready = human && msg.trim().length > 0 && hp === ''
  const field =
    'w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-light focus:outline-none'

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    const subject = t('contact.subject', 'Kontakt - Żywe Słowo')
    const body = [
      msg.trim(),
      '',
      name.trim() ? `${t('contact.name', 'Imię')}: ${name.trim()}` : '',
      email.trim() ? `${t('contact.email', 'E-mail')}: ${email.trim()}` : '',
    ].filter(Boolean).join('\n')
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <section className="no-print mt-10 rounded-xl border border-slate-700 bg-slate-800/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-lg font-semibold text-slate-100">{t('contact.title', 'Kontakt')}</span>
        <span className="text-xl leading-none text-slate-400" aria-hidden>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-400">{t('contact.intro', 'Masz pytanie albo chcesz porozmawiać? Napisz do nas.')}</p>
          <form onSubmit={onSubmit} className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('contact.name', 'Imię')}
                className={field}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.email', 'Twój e-mail (do odpowiedzi)')}
                className={field}
              />
            </div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={t('contact.message', 'Twoja wiadomość')}
              rows={4}
              required
              className={field}
            />
            {/* honeypot (ukryte przed ludźmi) */}
            <input
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={human}
                onChange={(e) => setHuman(e.target.checked)}
                className="h-4 w-4 accent-sky-500"
              />
              {t('contact.human', 'Jestem człowiekiem')}
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={!ready}
                className="rounded-md bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-light disabled:opacity-50"
              >
                {t('contact.send', 'Wyślij wiadomość')}
              </button>
              <span className="text-xs text-slate-500">{t('contact.hint', 'Wiadomość otworzy się w Twoim programie pocztowym.')}</span>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
