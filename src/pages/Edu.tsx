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
import { BackLink } from '../components/BackLink'
import { FontScale } from '../components/FontScale'
import { PageHeading } from '../components/PageHeading'
import { listRead } from '../lib/progress'
import { isOpen } from '../lib/availability'
import { AudioPlayer } from '../components/AudioPlayer'
import { ShareButton } from '../components/ShareButton'
import { BETA } from '../lib/beta'
import { ReadPill, ReadTop } from '../components/MaterialActions'
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

/** **pogrubienie** z markdowna zrodlowego („**W myślach.**”) - nic wiecej w tekstach nie ma. */
function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )
}

/** Spis szkoleń - w belce na stronie głównej i na stronie serii. */
export function EduList({ limit }: { limit?: number }) {
  const { lang, t } = useI18n()
  const { data, failed } = useIndex()
  const done = listRead('edu')

  if (failed) return <p className="text-sm text-slate-400">{t('edu.unavailable', 'Materiały są niedostępne.')}</p>
  if (!data) return <p className="text-sm text-slate-400">{t('common.loading', '…')}</p>

  const items = limit ? data.items.slice(0, limit) : data.items

  return (
    <div className="space-y-1.5">
      {items.map((it) => !isOpen(it) ? (
        <div
          key={it.nr}
          aria-disabled="true"
          className="flex items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-100/60 px-3 py-2 text-slate-500"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-400">{it.nr}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-snug">{it.title}</span>
            <span className="block truncate text-xs">
              {t('edu.availableFrom', 'Dostępny od')} <span className="font-semibold text-slate-600">{it.dateLabel}</span>
            </span>
          </span>
          <span className="shrink-0 pt-0.5 text-base" aria-hidden title={t('edu.locked', 'Jeszcze niedostępny')}>🔒</span>
        </div>
      ) : (
        <Link
          key={it.nr}
          to={`/${lang}/edukacja/${it.nr}`}
          viewTransition
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 transition hover:border-brand hover:shadow-sm"
        >
          <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-slate-500">{it.nr}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-snug">
              {it.audio && (
                <span className="mr-1" title={t('audio.hasAudio', 'Z nagraniem do posłuchania')} aria-label={t('audio.hasAudio', 'Z nagraniem do posłuchania')}>🎧</span>
              )}
              {it.title}
            </span>
            {BETA && it.dateLabel ? (
              <span className="block truncate text-xs text-slate-500"><span className="font-semibold text-slate-700">{it.dateLabel}</span>{it.ref ? ` · ${it.ref}` : ''}</span>
            ) : it.ref && <span className="block truncate text-xs text-slate-500">{it.ref}</span>}
          </span>
          {done.has(String(it.nr)) && (BETA ? <ReadPill /> : (
            <span className="shrink-0 pt-0.5 text-emerald-600" title={t('reading.done', 'Przeczytane')}>
              ✓
            </span>
          ))}
        </Link>
      ))}
      {limit && data.items.length > limit && (
        <Link to={`/${lang}/edukacja`} viewTransition className="mt-1 block text-sm text-brand-light hover:underline">
          {t('edu.all', 'Wszystkie materiały')}
        </Link>
      )}
    </div>
  )
}

export function Edu() {
  const { lang, t } = useI18n()
  const { data } = useIndex()
  return (
    <div>
      <BackLink to={`/${lang}`} className="mb-4">
        {t('nav.topics', 'Menu główne')}
      </BackLink>
      <PageHeading icon="lesson" title={t('edu.title', 'Człowiek Nadziei')} className="mb-1" />
      <p className="mb-3 text-sm text-slate-400">{data?.series || '#JestNadzieja'}</p>
      <p className="mb-5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
        {t('edu.scheduleInfo', 'Każdego dnia otwiera się jeden nowy materiał – w dniu podanym przy tytule. Wcześniejsze możesz czytać w dowolnej chwili.')}
      </p>
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
        <BackLink to={backTo} className="mt-3">
          {t('edu.backToList', 'Wróć do spisu materiałów')}
        </BackLink>
      </div>
    )
  if (!entry) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  if (!isOpen(entry))
    return (
      <div className="mx-auto max-w-xl">
        <BackLink to={backTo}>{t('edu.backToList', 'Wróć do spisu materiałów')}</BackLink>
        <div className="mt-6 rounded-2xl border border-violet-400/40 bg-violet-500/10 p-5 text-center">
          <p className="text-3xl" aria-hidden>🔒</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-300">{t('edu.item', 'Materiał')} {entry.nr}</p>
          <h1 className="mt-1 text-xl font-bold text-slate-100">{entry.title}</h1>
          <p className="mt-3 text-slate-200">
            {t('edu.lockedBody', 'Ten materiał otworzy się')} <strong>{entry.dateLabel}</strong>.
          </p>
          <p className="mt-1 text-sm text-slate-400">{t('edu.lockedHint', 'Codziennie jeden nowy tekst – wróć tego dnia.')}</p>
        </div>
      </div>
    )

  const available = (['short', 'long'] as TextVersion[]).filter((v) => entry.versions[v])
  const shown = entry.versions[version] ?? entry.versions[available[0]]
  const total = index?.items.length ?? 0
  const nextItem = index?.items.find((x) => x.nr === entry.nr + 1)
  const questions = shown?.questions ?? []
  const challenge = shown?.challenge ?? []

  return (
    <article className="reading">
      <BackLink to={backTo}>{t('edu.backToList', 'Wróć do spisu materiałów')}</BackLink>

      <header className="mb-4 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          {t('edu.item', 'Materiał')} {entry.nr}
          {total ? ` / ${total}` : ''}
        </p>
        <h1 className="mt-1 text-[1.5em] font-bold text-slate-100">{entry.title}</h1>
        {BETA && entry.dateLabel && <p className="mt-0.5 text-sm text-slate-400">{entry.dateLabel}</p>}
        {BETA && <ReadTop kind="edu" id={entry.nr} />}
      </header>

      {/* na gorze kazdego odcinka: udostepnianie - przy nagraniu w jego naglowku, bez nagrania osobno */}
      {entry.audio ? (
        <AudioPlayer
          src={entry.audio.src}
          seconds={entry.audio.seconds}
          bytes={entry.audio.bytes}
          title={`${entry.nr}. ${entry.title}`}
          note={t('audio.longVersion', 'nagranie wersji pełnej')}
          action={<ShareButton />}
        />
      ) : (
        <div className="mb-3 flex justify-end">
          <ShareButton />
        </div>
      )}

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
                {bold(p)}
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

      {questions.length > 0 && challenge.length > 0 && (
        <section className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <h2 className="mb-3 font-bold text-slate-100">{t('edu.questionChallenge', 'Pytanie i wyzwanie')}</h2>
          {questions.map((q, i) => (
            <p key={i} className="mb-3 text-lg font-semibold leading-snug text-slate-100">{q}</p>
          ))}
          <div className="border-t border-violet-400/30 pt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-300">{t('edu.challenge', 'Wyzwanie')}</p>
            {challenge.map((c, i) => (
              <p key={i} className="mb-2 leading-relaxed text-slate-200">{bold(c)}</p>
            ))}
          </div>
        </section>
      )}

      {questions.length > 0 && challenge.length === 0 && (
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

      {entry.sources && entry.sources.length > 0 && (
        <section className="mt-6 border-t border-white/10 pt-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-300">{t('edu.sources', 'Źródła')}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300">
            {entry.sources.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      <ReadingFooter
        kind="edu"
        id={entry.nr}
        title={entry.title}
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
        {entry.nr < total && nextItem && !isOpen(nextItem) ? (
          <span className="text-slate-500">
            {t('edu.next', 'Następny materiał')}: {nextItem.dateLabel} 🔒
          </span>
        ) : entry.nr < total ? (
          <Link to={`/${lang}/edukacja/${entry.nr + 1}`} className="text-brand-light hover:underline">
            {t('edu.next', 'Następny materiał')} ›
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="no-print mt-6 flex justify-center">
        <BackLink to={backTo}>{t('edu.backToList', 'Wróć do spisu materiałów')}</BackLink>
      </div>

      {entry.note && <p className="mt-8 text-xs text-slate-500">{entry.note}</p>}

    </article>
  )
}
