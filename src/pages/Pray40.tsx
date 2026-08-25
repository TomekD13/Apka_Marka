import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadPray40, loadPray40Day } from '../content'
import { useSetPlace } from '../place'
import {
  rememberVersion,
  rememberedVersion,
  VersionToggle,
  type TextVersion,
} from '../components/VersionToggle'
import type { Pray40Day, Pray40Index } from '../types'

const VERSION_KEY = 'zywe-slowo:pray40:version'

function useIndex() {
  const { lang } = useI18n()
  const [data, setData] = useState<Pray40Index | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setData(null)
    setFailed(false)
    loadPray40(lang)
      .then(setData)
      .catch(() => setFailed(true))
  }, [lang])
  return { data, failed }
}

/** Spis czterdziestu dni - w belce na stronie głównej i na stronie serii. */
export function Pray40List({ limit }: { limit?: number }) {
  const { lang, t } = useI18n()
  const { data, failed } = useIndex()

  if (failed) return <p className="text-sm text-slate-400">{t('pray40.unavailable', 'Czytanki są niedostępne.')}</p>
  if (!data) return <p className="text-sm text-slate-400">{t('common.loading', '…')}</p>

  const days = limit ? data.days.slice(0, limit) : data.days

  return (
    <div className="space-y-1.5">
      {days.map((d) => (
        <Link
          key={d.day}
          to={`/${lang}/40-dni/${d.day}`}
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">{d.day}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-snug">{d.title}</span>
            <span className="block truncate text-xs text-slate-500">{d.ref}</span>
          </span>
        </Link>
      ))}
      {limit && data.days.length > limit && (
        <Link to={`/${lang}/40-dni`} className="mt-1 block text-sm text-brand-light hover:underline">
          {t('pray40.all', 'Wszystkie 40 dni')}
        </Link>
      )}
    </div>
  )
}

export function Pray40() {
  const { t } = useI18n()
  const { data } = useIndex()
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-100">{t('pray40.title', '40 dni modlitwy')}</h1>
      <p className="mb-5 text-sm text-slate-400">{data?.series || '#JestNadzieja'}</p>
      <Pray40List />
    </div>
  )
}

export function Pray40DayPage() {
  const { day = '1' } = useParams()
  const { lang, t } = useI18n()
  const { data: index } = useIndex()
  const [entry, setEntry] = useState<Pray40Day | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState<TextVersion>(() => rememberedVersion(VERSION_KEY))

  const n = Number(day)

  useEffect(() => {
    setEntry(null)
    setFailed(false)
    loadPray40Day(lang, n)
      .then(setEntry)
      .catch(() => setFailed(true))
  }, [lang, n])

  useSetPlace(entry ? `${t('pray40.day', 'Dzień')} ${entry.day} – ${entry.title}` : undefined)

  function pick(v: TextVersion) {
    setVersion(v)
    rememberVersion(VERSION_KEY, v)
  }

  const backTo = `/${lang}/40-dni`

  if (failed)
    return (
      <div>
        <p className="text-slate-400">{t('pray40.missing', 'Nie ma czytanki na ten dzień.')}</p>
        <Link to={backTo} className="mt-3 inline-block text-brand-light hover:underline">
          {t('pray40.backToList', 'Wróć do spisu dni')}
        </Link>
      </div>
    )
  if (!entry) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const available = (['short', 'long'] as TextVersion[]).filter((v) => entry.versions[v])
  const shown = entry.versions[version] ?? entry.versions[available[0]]
  const total = index?.days.length ?? 40

  return (
    <article>
      <Link to={backTo} className="no-print text-sm text-slate-400 hover:text-brand-light">
        ‹ {t('pray40.backToList', 'Wróć do spisu dni')}
      </Link>

      <header className="mb-4 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          {t('pray40.day', 'Dzień')} {entry.day} / {total}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-100">{entry.title}</h1>
        {entry.ref && <p className="mt-1 text-sm text-slate-400">{entry.ref}</p>}
        {entry.lead && <p className="mt-3 text-slate-300">{entry.lead}</p>}
      </header>

      <div className="mb-5">
        <VersionToggle value={version} onChange={pick} available={available} />
      </div>

      <div className="space-y-4">
        {shown?.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="mb-1 font-bold text-slate-100">{s.heading}</h2>}
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mb-2 leading-relaxed text-slate-200">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      {entry.questions.length > 0 && (
        <section className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <h2 className="mb-2 font-bold text-slate-100">{t('pray40.questions', 'Pytania na dziś')}</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-slate-200">
            {entry.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </section>
      )}

      <nav className="no-print mt-6 flex items-center justify-between text-sm">
        {entry.day > 1 ? (
          <Link to={`/${lang}/40-dni/${entry.day - 1}`} className="text-brand-light hover:underline">
            ‹ {t('pray40.prev', 'Poprzedni dzień')}
          </Link>
        ) : (
          <span />
        )}
        {entry.day < total ? (
          <Link to={`/${lang}/40-dni/${entry.day + 1}`} className="text-brand-light hover:underline">
            {t('pray40.next', 'Następny dzień')} ›
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {entry.note && <p className="mt-8 text-xs text-slate-500">{entry.note}</p>}
    </article>
  )
}
