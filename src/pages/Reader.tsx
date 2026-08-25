import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useSetPlace } from '../place'
import { loadBible, loadStudy } from '../content'
import { LevelToggle, levelRank } from '../components/LevelToggle'
import { PassageView } from '../components/PassageView'
import { NoteView } from '../components/NoteView'
import { ContactForm } from '../components/ContactForm'
import { ShareDialog } from '../components/ShareDialog'
import type { Bible, Level, Study } from '../types'

export function Reader() {
  const { lang, t, langMeta } = useI18n()
  const { id = '' } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [bible, setBible] = useState<Bible | undefined>()
  const [level, setLevel] = useState<Level>('base')
  const [toast, setToast] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    setStudy(null)
    loadStudy(lang, id).then(setStudy).catch(() => setStudy(null))
  }, [lang, id])

  useEffect(() => {
    const tr = langMeta?.defaultTranslation || 'DEMO'
    loadBible(lang, tr).then(setBible).catch(() => setBible(undefined))
  }, [lang, langMeta])

  useSetPlace(study?.title)

  if (!study) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const max = levelRank(level)
  // czas studium rośnie z poziomem; Ekspert (advanced) dodaje ok. 20 min - dodatkowe noty i formy oryginalne
  const minutes =
    level === 'base' ? study.minutes?.base
      : level === 'extended' ? study.minutes?.extended
        : (study.minutes?.extended ?? 0) + 20

  return (
    <article>
      <h1 className="text-2xl font-semibold leading-tight">{study.title}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {minutes} {t('reader.minutes', 'min')}
        {study.tags?.length ? ' · ' + study.tags.join(', ') : ''}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <span className="no-print text-xs text-slate-400 mr-2">{t('reader.levels', 'Poziom')}</span>
          <LevelToggle value={level} onChange={setLevel} />
        </div>
        <div className="no-print flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ↗ {t('reader.share', 'Udostępnij')}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('reader.print', 'Drukuj / PDF')}
          </button>
        </div>
      </div>

      {study.summary && <p className="mt-4 study-prose text-slate-600 dark:text-slate-300">{study.summary}</p>}

      {study.sections.map((sec) => {
        const items = sec.items.filter((it) => levelRank(it.level) <= max)
        if (items.length === 0) return null
        return (
          <section key={sec.id} className="mt-6">
            <h2 className="text-lg font-semibold text-brand dark:text-brand-light border-b border-slate-200 dark:border-slate-700 pb-1">
              {sec.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {items.map((it) =>
                it.type === 'passage' ? (
                  <PassageView key={it.id} item={it} bible={bible} />
                ) : (
                  <NoteView key={it.id} item={it} />
                )
              )}
            </div>
          </section>
        )
      })}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-slate-800">
          <h2 className="text-lg font-semibold text-emerald-900">{t('reader.application', 'Podsumowanie')}</h2>
          <p className="mt-2 study-prose">{study.application?.text}</p>
        </div>
        {study.application?.challenge && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-slate-800">
            <h2 className="text-lg font-semibold text-amber-900">{t('reader.challenge', 'Wyzwanie')}</h2>
            <p className="mt-2 study-prose">{study.application.challenge}</p>
          </div>
        )}
      </section>

      <ContactForm />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        initialText={study.summary ? `${study.title} – ${study.summary}` : study.title}
        title={study.title}
        url={`${window.location.origin}${import.meta.env.BASE_URL}`}
        onResult={(res) => { if (res === 'copied') { setToast(t('common.copied', 'Skopiowano do schowka')); window.setTimeout(() => setToast(''), 2000) } }}
      />

      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </article>
  )
}
