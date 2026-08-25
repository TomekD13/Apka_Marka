import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadEdu, loadEduItem } from '../content'
import { useSetPlace } from '../place'
import {
  rememberVersion,
  rememberedVersion,
  VersionToggle,
  type TextVersion,
} from '../components/VersionToggle'
import { ReadingFooter } from '../components/ReadingFooter'
import { listRead } from '../lib/progress'
import type { EduIndex, EduItem } from '../types'

const VERSION_KEY = 'zywe-slowo:edu:version'

function useIndex() {
  const { lang } = useI18n()
  const [data, setData] = useState<EduIndex | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setData(null)
    setFailed(false)
    loadEdu(lang)
      .then(setData)
      .catch(() => setFailed(true))
  }, [lang])
  return { data, failed }
}

/** Spis szkoleń - w belce na stronie głównej i na stronie serii. */
export function EduList({ limit }: { limit?: number }) {
  const { lang, t } = useI18n()
  const { data, failed } = useIndex()
  // wersje wybiera sie juz tutaj - material otworzy sie w tej, ktora tu stoi
  const [version, setVersion] = useState<TextVersion>(() => rememberedVersion(VERSION_KEY))
  const done = listRead('edu')

  if (failed) return <p className="text-sm text-slate-400">{t('edu.unavailable', 'Materiały są niedostępne.')}</p>
  if (!data) return <p className="text-sm text-slate-400">{t('common.loading', '…')}</p>

  const items = limit ? data.items.slice(0, limit) : data.items

  return (
    <div className="space-y-1.5">
      <VersionToggle
        value={version}
        onChange={(v) => {
          setVersion(v)
          rememberVersion(VERSION_KEY, v)
        }}
        available={['short', 'long']}
      />
      {items.map((it) => (
        <Link
          key={it.nr}
          to={`/${lang}/edukacja/${it.nr}`}
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">{it.nr}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-snug">{it.title}</span>
            {it.ref && <span className="block truncate text-xs text-slate-500">{it.ref}</span>}
          </span>
          {done.has(String(it.nr)) && (
            <span className="shrink-0 pt-0.5 text-emerald-600" title={t('reading.done', 'Przeczytane')}>
              ✓
            </span>
          )}
        </Link>
      ))}
      {limit && data.items.length > limit && (
        <Link to={`/${lang}/edukacja`} className="mt-1 block text-sm text-brand-light hover:underline">
          {t('edu.all', 'Wszystkie materiały')}
        </Link>
      )}
    </div>
  )
}

export function Edu() {
  const { t } = useI18n()
  const { data } = useIndex()
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-100">{t('edu.title', 'Materiały edukacyjne')}</h1>
      <p className="mb-5 text-sm text-slate-400">{data?.series || '#JestNadzieja'}</p>
      <EduList />
    </div>
  )
}

export function EduItemPage() {
  const { nr = '1' } = useParams()
  const { lang, t } = useI18n()
  const { data: index } = useIndex()
  const [entry, setEntry] = useState<EduItem | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState<TextVersion>(() => rememberedVersion(VERSION_KEY))

  const n = Number(nr)

  useEffect(() => {
    setEntry(null)
    setFailed(false)
    loadEduItem(lang, n)
      .then(setEntry)
      .catch(() => setFailed(true))
  }, [lang, n])

  useSetPlace(entry?.title)

  function pick(v: TextVersion) {
    setVersion(v)
    rememberVersion(VERSION_KEY, v)
  }

  const backTo = `/${lang}/edukacja`

  if (failed)
    return (
      <div>
        <p className="text-slate-400">{t('edu.missing', 'Nie ma takiego materiału.')}</p>
        <Link to={backTo} className="mt-3 inline-block text-brand-light hover:underline">
          {t('edu.backToList', 'Wróć do spisu materiałów')}
        </Link>
      </div>
    )
  if (!entry) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const available = (['short', 'long'] as TextVersion[]).filter((v) => entry.versions[v])
  const shown = entry.versions[version] ?? entry.versions[available[0]]
  const total = index?.items.length ?? 0
  const questions = shown?.questions ?? []

  return (
    <article>
      <Link to={backTo} className="no-print text-sm text-slate-400 hover:text-brand-light">
        ‹ {t('edu.backToList', 'Wróć do spisu materiałów')}
      </Link>

      <header className="mb-4 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          {t('edu.item', 'Materiał')} {entry.nr}
          {total ? ` / ${total}` : ''}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-100">{entry.title}</h1>
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

      {shown?.quote && (
        <blockquote className="mt-5 rounded-xl border-l-4 border-brand bg-slate-900/40 px-4 py-3">
          <p className="leading-relaxed text-slate-100">„{shown.quote.text}”</p>
          {shown.quote.ref && <p className="mt-1 text-sm text-slate-400">{shown.quote.ref}</p>}
        </blockquote>
      )}

      {questions.length > 0 && (
        <section className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <h2 className="mb-2 font-bold text-slate-100">
            {questions.length > 1
              ? t('edu.questions', 'Pytania do przemyślenia')
              : t('edu.question', 'Pytanie do przemyślenia')}
          </h2>
          {questions.length > 1 ? (
            <ol className="list-decimal space-y-1.5 pl-5 text-slate-200">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-200">{questions[0]}</p>
          )}
        </section>
      )}

      <ReadingFooter
        kind="edu"
        id={entry.nr}
        showFull={version === 'short' && Boolean(entry.versions.long)}
        onShowFull={() => pick('long')}
        shareTitle={entry.title}
        shareText={shown?.quote?.text ? `„${shown.quote.text}” (${shown.quote.ref})` : entry.title}
      />

      <nav className="no-print mt-6 flex items-center justify-between text-sm">
        {entry.nr > 1 ? (
          <Link to={`/${lang}/edukacja/${entry.nr - 1}`} className="text-brand-light hover:underline">
            ‹ {t('edu.prev', 'Poprzedni materiał')}
          </Link>
        ) : (
          <span />
        )}
        {entry.nr < total ? (
          <Link to={`/${lang}/edukacja/${entry.nr + 1}`} className="text-brand-light hover:underline">
            {t('edu.next', 'Następny materiał')} ›
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {entry.note && <p className="mt-8 text-xs text-slate-500">{entry.note}</p>}
    </article>
  )
}
