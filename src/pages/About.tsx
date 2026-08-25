import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadBible, loadLangs } from '../content'
import { useI18n } from '../i18n'

export function About() {
  const { t } = useI18n()
  const { lang = 'pl' } = useParams()
  // Nota o zrodle tekstu Pisma – nazwa i licencja pochodzą z pliku przekładu,
  // więc są już w języku modułu (bez dodatkowych napisów w ui.json).
  const [bible, setBible] = useState<{ name: string; license: string } | undefined>()

  useEffect(() => {
    let alive = true
    loadLangs()
      .then((l) => l.languages.find((x) => x.code === lang)?.defaultTranslation)
      .then((tr) => (tr ? loadBible(lang, tr) : undefined))
      .then((b) => { if (alive && b) setBible({ name: b.name, license: b.license }) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [lang])

  return (
    <div className="prose-slate">
      <h1 className="text-xl font-semibold mb-3">{t('about.title', 'O aplikacji')}</h1>
      <p className="study-prose whitespace-pre-line text-slate-700 dark:text-slate-200">{t('about.body')}</p>
      <p className="mt-3 text-sm text-slate-500">{t('about.privacy')}</p>
      {bible && (
        <p className="mt-3 text-sm text-slate-500">
          {bible.name}
          {bible.license ? ` – ${bible.license}` : ''}
        </p>
      )}
      <p className="mt-6 text-sm text-slate-400">
        <a
          href={t('about.publisherUrl', 'https://www.facebook.com/pastormarek')}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand-light underline-offset-2 hover:underline"
        >
          {t('about.publisher')}
        </a>
      </p>
    </div>
  )
}
