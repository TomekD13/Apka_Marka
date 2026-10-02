import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { useSetPlace } from '../place'
import { ACCOUNTS_ENABLED, loadAccount } from '../lib/accountGate'
import type { AccountState } from '../lib/account'

// Strona konta. Konto jest opcjonalne i sluzy wylacznie synchronizacji rzeczy
// czytelnika (lib/account.ts). Poza beta (ACCOUNTS_ENABLED) strona mowi tylko,
// co konto da i jak zrobic kopie swoich rzeczy bez niego.

type Mod = Awaited<ReturnType<typeof loadAccount>>

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60'
const btnMain = `${btn} bg-brand text-white hover:bg-brand/90 dark:bg-sky-500 dark:hover:bg-sky-400`
const btnLine = `${btn} border border-slate-300 text-slate-700 hover:border-brand dark:border-slate-600 dark:text-slate-100 dark:hover:border-sky-300`

function BackupLinks() {
  const { lang, t } = useI18n()
  const cls = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand dark:border-slate-600 dark:text-slate-200'
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Link to={`/${lang}/notatki`} className={cls}>{t('account.notes', 'Moje notatki')}</Link>
      <Link to={`/${lang}/modlitwy`} className={cls}>{t('account.prayers', 'Dziennik modlitw')}</Link>
      <Link to={`/${lang}/biblia/zakladki`} className={cls}>{t('bible.bookmarks', 'Zakładki')}</Link>
    </div>
  )
}

export function Account() {
  const { lang, t } = useI18n()
  useSetPlace(t('account.title', 'Twoje konto'))

  return (
    <section className="mx-auto max-w-xl">
      <BackLink to={`/${lang}`} className="mb-4">{t('nav.topics', 'Menu główne')}</BackLink>
      <PageHeading icon="account" title={t('account.title', 'Twoje konto')} />
      <p className="mt-3 text-slate-600 dark:text-slate-300">{t('account.lead', '')}</p>
      {ACCOUNTS_ENABLED ? <AccountLive /> : <AccountSoon />}
    </section>
  )
}

function AccountSoon() {
  const { t } = useI18n()
  return (
    <>
      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="font-semibold text-amber-800 dark:text-amber-100">{t('account.soon', 'Logowanie nie jest jeszcze podłączone.')}</p>
        <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/80">{t('account.soonBody', '')}</p>
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('account.backup', '')}</p>
      <BackupLinks />
    </>
  )
}

function AccountLive() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const [mod, setMod] = useState<Mod | null>(null)
  const [st, setSt] = useState<AccountState | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState('')
  const [needEmail, setNeedEmail] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let off = () => {}
    loadAccount()
      .then((m) => {
        setMod(m)
        setSt(m.getState())
        off = m.subscribe(setSt)
        // powrot z linku w mejlu
        if (m.isEmailLink(location.href)) {
          const saved = m.storedEmail()
          if (saved) void finish(m, saved)
          else setNeedEmail(true)
        }
      })
      .catch(() => setError('load'))
    return () => off()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function message(code: string): string {
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
    if (code === 'auth/popup-blocked') return t('account.errPopup', 'Przeglądarka zablokowała okienko logowania. Zezwól na wyskakujące okna albo zaloguj się linkiem na e-mail.')
    if (code === 'auth/invalid-email' || code === 'auth/missing-email') return t('account.errEmail', 'To nie wygląda na poprawny adres e-mail.')
    if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') return t('account.errLink', 'Ten link już wygasł albo został użyty. Wyślij sobie nowy.')
    if (code === 'auth/quota-exceeded') return t('account.errQuota', 'Na dziś wyczerpał się limit wysyłanych linków. Spróbuj jutro albo zaloguj się kontem Google.')
    if (code === 'auth/network-request-failed') return t('account.errNetwork', 'Brak połączenia z internetem. Spróbuj, gdy będziesz online.')
    if (code === 'load') return t('account.errLoad', 'Nie udało się wczytać modułu logowania. Sprawdź połączenie z internetem.')
    return `${t('account.errOther', 'Coś poszło nie tak.')} (${code})`
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await fn()
    } catch (e) {
      setError(mod ? mod.errorCode(e) : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function finish(m: Mod, address: string) {
    await run(async () => {
      try {
        await m.finishEmailLink(location.href, address)
      } finally {
        // link jest jednorazowy - zdejmujemy go z paska, zeby odswiezenie nie probowalo drugi raz
        navigate(`/${lang}/konto`, { replace: true })
      }
      setNeedEmail(false)
    })
  }

  function sendLink(e: FormEvent) {
    e.preventDefault()
    if (!mod) return
    const address = email.trim()
    void run(async () => {
      await mod.sendEmailLink(address, lang)
      setSent(address)
    })
  }

  function removeAccount() {
    if (!mod) return
    if (!window.confirm(t('account.deleteConfirm', 'Usunąć konto i wszystko, co zapisało się w chmurze? Rzeczy na tym urządzeniu zostaną.'))) return
    void run(async () => {
      const r = await mod.deleteAccount()
      setInfo(r === 'done'
        ? t('account.deleted', 'Konto zostało usunięte razem z danymi w chmurze. Na tym urządzeniu wszystko zostało.')
        : t('account.relogin', 'Ze względów bezpieczeństwa zaloguj się jeszcze raz (nowym linkiem) i ponów usuwanie konta.'))
    })
  }

  const err = error && message(error)
  const user = st?.user

  return (
    <div className="mt-5 space-y-4">
      {err && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">{err}</p>}
      {info && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">{info}</p>}

      {!st?.ready && !error && <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.loading', 'Wczytuję…')}</p>}

      {st?.ready && needEmail && !user && (
        <form onSubmit={(e) => { e.preventDefault(); if (mod) void finish(mod, email.trim()) }} className={card}>
          <p className="font-semibold text-slate-900 dark:text-white">{t('account.confirmTitle', 'Potwierdź adres e-mail')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('account.confirmBody', 'Link otworzył się w innej przeglądarce niż ta, w której go zamówiono. Wpisz adres, na który przyszedł.')}</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" />
          <button type="submit" disabled={busy} className={`${btnMain} mt-3`}>{t('account.confirmGo', 'Zaloguj')}</button>
        </form>
      )}

      {st?.ready && !user && !needEmail && (
        <div className={card}>
          <button type="button" disabled={busy || !mod} onClick={() => mod && void run(mod.signInGoogle)} className={`${btnLine} flex w-full items-center justify-center gap-2`}>
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 7.2-9.6 7.2-16.5z" />
              <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2.2 1.5-5 2.3-8.8 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {t('account.google', 'Zaloguj kontem Google')}
          </button>

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />{t('account.or', 'albo')}<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {sent ? (
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('account.sentTitle', 'Sprawdź skrzynkę')}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t('account.sentBody', 'Wysłaliśmy link logowania na adres:')} <strong>{sent}</strong>. {t('account.sentHint', 'Otwórz go na tym urządzeniu. Jeśli mejla nie ma, zajrzyj do spamu.')}
              </p>
              <button type="button" onClick={() => setSent('')} className="mt-2 text-sm text-brand underline dark:text-sky-300">{t('account.sentAgain', 'Wpisz inny adres')}</button>
            </div>
          ) : (
            <form onSubmit={sendLink}>
              <label className="text-sm text-slate-600 dark:text-slate-300" htmlFor="account-email">{t('account.emailLabel', 'Adres e-mail – wyślemy na niego link do logowania, bez hasła')}</label>
              <input id="account-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ty@przyklad.pl" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white" />
              <button type="submit" disabled={busy || !mod} className={`${btnMain} mt-3`}>{t('account.sendLink', 'Wyślij link')}</button>
            </form>
          )}
        </div>
      )}

      {user && (
        <div className={card}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.signedInAs', 'Zalogowano jako')}</p>
          <p className="font-semibold text-slate-900 dark:text-white">{user.name ? `${user.name} · ` : ''}{user.email}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {st?.sync === 'error'
              ? t('account.syncError', 'Synchronizacja chwilowo nie działa. Zmiany są bezpieczne na tym urządzeniu i pójdą, gdy połączenie wróci.')
              : st?.sync === 'ok'
                ? t('account.syncOk', 'Notatki, dziennik modlitw, zakładki, ulubione, plany czytania i przeczytane materiały są zsynchronizowane.')
                : t('account.syncing', 'Synchronizuję…')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => setLeaving(!leaving)} aria-expanded={leaving} className={btnLine}>{t('account.signOut', 'Wyloguj')}</button>
            <button type="button" disabled={busy} onClick={removeAccount} className={`${btn} border border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300`}>{t('account.delete', 'Usuń konto')}</button>
          </div>
          {leaving && (
            <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('account.signOutAsk', 'Co zrobić z twoimi rzeczami na tym urządzeniu? Na koncie zostają w obu przypadkach.')}</p>
              <div className="mt-2 flex flex-col gap-2">
                <button type="button" disabled={busy} onClick={() => { setLeaving(false); if (mod) void run(() => mod.signOut(false)) }} className={btnLine}>{t('account.signOutKeep', 'Zostaw – to moje urządzenie')}</button>
                <button type="button" disabled={busy} onClick={() => { setLeaving(false); if (mod) void run(() => mod.signOut(true)) }} className={btnLine}>{t('account.signOutClear', 'Usuń z tego urządzenia – korzystają z niego inni')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{t('account.privacyTitle', 'Co dzieje się z twoimi danymi')}</p>
        <p className="mt-1">{t('account.privacy', '')}</p>
      </div>

      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.backupLive', 'Kopię do pliku zrobisz też bez konta:')}</p>
        <BackupLinks />
      </div>
    </div>
  )
}
