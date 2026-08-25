import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { useSetPlace } from '../place'

// Strona konta. Samo logowanie czeka na projekt w Firebase (etap 0
// w _PROPOZYCJA_konta-i-powiadomienia.md) - do tego czasu strona mowi wprost,
// co konto da i jak zrobic kopie swoich rzeczy bez niego.

export function Account() {
  const { lang, t } = useI18n()
  useSetPlace(t('account.title', 'Twoje konto'))

  return (
    <div>
      <BackLink to={`/${lang}`} className="mb-4">
        {t('nav.topics', 'Menu główne')}
      </BackLink>
      <h1 className="mb-3 text-2xl font-bold text-slate-100">{t('account.title', 'Twoje konto')}</h1>
      <p className="text-slate-300">{t('account.lead', '')}</p>

      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="font-semibold text-amber-100">{t('account.soon', 'Logowanie nie jest jeszcze podłączone.')}</p>
        <p className="mt-1 text-sm text-amber-100/80">{t('account.soonBody', '')}</p>
      </div>

      <p className="mt-6 text-sm text-slate-400">{t('account.backup', '')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          to={`/${lang}/notatki`}
          className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-brand"
        >
          {t('account.notes', 'Moje notatki')}
        </Link>
        <Link
          to={`/${lang}/modlitwy`}
          className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-brand"
        >
          {t('account.prayers', 'Dziennik modlitw')}
        </Link>
        <Link
          to={`/${lang}/biblia/zakladki`}
          className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-brand"
        >
          {t('bible.bookmarks', 'Zakładki')}
        </Link>
      </div>
    </div>
  )
}
