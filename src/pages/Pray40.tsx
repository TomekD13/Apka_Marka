import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadEdu, loadPray40, loadPray40Day } from '../content'
import { useSetPlace } from '../place'
import {
  rememberVersion,
  rememberedVersion,
  VersionToggle,
  type TextVersion,
} from '../components/VersionToggle'
import { ReadingFooter } from '../components/ReadingFooter'
import { BackLink } from '../components/BackLink'
import { FontScale } from '../components/FontScale'
import { PageHeading } from '../components/PageHeading'
import { listRead } from '../lib/progress'
import { BETA } from '../lib/beta'
import { ReadPill, ReadTop } from '../components/MaterialActions'
import type { EduEntry, Pray40Day, Pray40Index } from '../types'

const VERSION_KEY = 'zywe-slowo:pray40:version'

/**
 * Ramka pod ostatnia czytanka: zaproszenie do dalszej codziennej lektury -
 * cykl „Człowiek Nadziei” startuje nazajutrz (daty w edu/index.json).
 */
function ContinueToEdu() {
  const { lang, t } = useI18n()
  const [first, setFirst] = useState<EduEntry | null>(null)
  useEffect(() => {
    loadEdu(lang).then((d) => setFirst(d.items[0] ?? null)).catch(() => {})
  }, [lang])
  return (
    <section className="no-print mt-8 rounded-2xl border-2 border-violet-400/50 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10 p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">{t('pray40.nextTitle', 'To nie koniec drogi')}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-100">{t('pray40.nextHeading', 'Czytaj dalej – codziennie')}</h2>
      <p className="mt-2 leading-relaxed text-slate-200">
        {t('pray40.nextBody', 'Czterdzieści dni modlitwy za tobą. Nie przerywaj codziennego spotkania ze Słowem: od jutra zaczyna się cykl „Człowiek Nadziei” – każdego dnia jeden tekst o tym, jak Bóg nas stworzył, jak myślimy, rozmawiamy i podejmujemy decyzje.')}
      </p>
      {first?.dateLabel && <p className="mt-2 text-sm text-slate-400">{t('pray40.nextStart', 'Pierwszy tekst')}: {first.dateLabel}</p>}
      <Link to={`/${lang}/edukacja/${first?.nr ?? 1}`} className="mt-4 inline-block rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-400">
        {t('pray40.nextButton', 'Zacznij „Człowieka Nadziei”')} ›
      </Link>
    </section>
  )
}

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
  const done = listRead('pray40')

  if (failed) return <p className="text-sm text-slate-400">{t('pray40.unavailable', 'Czytanki są niedostępne.')}</p>
  if (!data) return <p className="text-sm text-slate-400">{t('common.loading', '…')}</p>

  const days = limit ? data.days.slice(0, limit) : data.days

  return (
    <div className="space-y-1.5">
      {days.map((d) => (
        <Link
          key={d.day}
          to={`/${lang}/40-dni/${d.day}`}
          viewTransition
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">{d.day}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-snug">{d.title}</span>
            <span className="block truncate text-xs text-slate-500">
              {d.dateLabel && <span className="font-semibold text-slate-700">{d.dateLabel}</span>}
              {d.dateLabel && d.ref ? ' · ' : ''}
              {d.ref}
            </span>
          </span>
          {done.has(String(d.day)) && (BETA ? <ReadPill /> : (
            <span className="shrink-0 pt-0.5 text-emerald-600" title={t('reading.done', 'Przeczytane')}>
              ✓
            </span>
          ))}
        </Link>
      ))}
      {limit && data.days.length > limit && (
        <Link to={`/${lang}/40-dni`} viewTransition className="mt-1 block text-sm text-brand-light hover:underline">
          {t('pray40.all', 'Wszystkie 40 dni')}
        </Link>
      )}
    </div>
  )
}

export function Pray40() {
  const { lang, t } = useI18n()
  const { data } = useIndex()
  return (
    <div>
      <BackLink to={`/${lang}`} className="mb-4">
        {t('nav.topics', 'Menu główne')}
      </BackLink>
      <PageHeading icon="prayer" title={t('pray40.title', '40 dni modlitwy')} className="mb-1" />
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
        <BackLink to={backTo} className="mt-3">
          {t('pray40.backToList', 'Wróć do spisu dni')}
        </BackLink>
      </div>
    )
  if (!entry) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const available = (['short', 'long'] as TextVersion[]).filter((v) => entry.versions[v])
  const shown = entry.versions[version] ?? entry.versions[available[0]]
  const total = index?.days.length ?? 40

  return (
    <article className="reading">
      <BackLink to={backTo}>{t('pray40.backToList', 'Wróć do spisu dni')}</BackLink>

      <header className="mb-4 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          {t('pray40.day', 'Dzień')} {entry.day} / {total}
        </p>
        <h1 className="mt-1 text-[1.5em] font-bold text-slate-100">{entry.title}</h1>
        {entry.ref && <p className="mt-1 text-slate-300">{entry.ref}</p>}
        {entry.dateLabel && <p className="mt-0.5 text-sm text-slate-400">{entry.dateLabel}</p>}
        {entry.lead && <p className="mt-3 text-slate-300">{entry.lead}</p>}
        {BETA && <ReadTop kind="pray40" id={entry.day} />}
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <VersionToggle value={version} onChange={pick} available={available} />
        <FontScale className="ml-auto" />
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

      {BETA && entry.day === total && <ContinueToEdu />}

      <ReadingFooter
        kind="pray40"
        id={entry.day}
        title={entry.title}
        showFull={version === 'short' && Boolean(entry.versions.long)}
        onShowFull={() => pick('long')}
        shareTitle={`${t('pray40.day', 'Dzień')} ${entry.day}: ${entry.title}`}
        shareText={entry.lead || entry.title}
      />

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

      <div className="no-print mt-6 flex justify-center">
        <BackLink to={backTo}>{t('pray40.backToList', 'Wróć do spisu dni')}</BackLink>
      </div>

      {entry.note && <p className="mt-8 text-xs text-slate-500">{entry.note}</p>}
    </article>
  )
}
