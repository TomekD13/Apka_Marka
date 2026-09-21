import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { FontScale } from '../components/FontScale'
import { PageHeading } from '../components/PageHeading'
import { ShareDialog } from '../components/ShareDialog'
import { loadBible, loadPrayerTexts } from '../content'
import type { Bible, OccasionVerse, PrayerTextGroup, PrayerTexts as PrayerTextsData } from '../types'

type Mode = 'random' | 'list'

/** Losuje nowy indeks w grupie, w miare mozliwosci inny niz poprzedni. */
function draw(size: number, previous?: number) {
  if (size <= 1) return 0
  let i = Math.floor(Math.random() * size)
  if (i === previous) i = (i + 1 + Math.floor(Math.random() * (size - 1))) % size
  return i
}

export function PrayerTexts() {
  const { lang, t } = useI18n()
  const [data, setData] = useState<PrayerTextsData | null>(null)
  const [bible, setBible] = useState<Bible | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('random')
  const [picks, setPicks] = useState<Record<string, number>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [share, setShare] = useState<{ text: string; title: string } | null>(null)
  const [toast, setToast] = useState('')

  // `fresh` rosnie przy recznym ponowieniu - wtedy tresc idzie prosto z sieci,
  // z pominieciem zapasu service workera (moze byc ze starszego wydania)
  const [fresh, setFresh] = useState(0)

  useEffect(() => {
    setData(null); setBible(null); setFailed(null); setOpen(null)
    let alive = true
    ;(async () => {
      try {
        const d = await loadPrayerTexts(lang, fresh > 0)
        if (!alive) return
        const b = await loadBible(lang, d.translation, fresh > 0)
        if (!alive) return
        // zapas w przegladarce bywa ze starszego wydania - nie ma wtedy tekstow
        // do nowych odnosnikow; jedna proba prosto z sieci to naprawia
        const probe = d.groups[0]?.verses[0]?.osis
        if (fresh === 0 && probe && !b.verses?.[probe]) { setFresh(1); return }
        setData(d)
        setPicks(Object.fromEntries(d.groups.map((g) => [g.id, draw(g.verses.length)])))
        setBible(b)
      } catch (e: unknown) {
        if (alive) setFailed(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { alive = false }
  }, [lang, fresh])

  // ten sam zabieg co w „Tekstach na okazje": numery wersetow, znaki akapitu
  // i psalmowe naglowki nie naleza do tego, co czyta sie na glos w modlitwie
  const PSALM_SUP = /^(Przewodnikowi chóru[^.]*\.|Psalm[^.]*\.|Pieśń[^.]*\.|Modlitwa[^.]*\.|Maskil[^.]*\.|Miktam[^.]*\.|Hymn[^.]*\.|Lamentacja[^.]*\.|Dawida\.|Asafa\.)\s*/
  const verseText = useMemo(() => (v: OccasionVerse) => {
    let s = (bible?.verses?.[v.osis] || '').replace(/\(\d+\)\s*/g, '').replace(/¶/g, '')
    let prev = ''
    while (s !== prev) { prev = s; s = s.replace(PSALM_SUP, '') }
    return s.replace(/\s+/g, ' ').trim()
  }, [bible])

  const showToast = (s: string) => { setToast(s); window.setTimeout(() => setToast(''), 2000) }
  const quote = (v: OccasionVerse) => `„${verseText(v)}"\n– ${v.ref}`

  if (failed) return (
    <div>
      <BackLink to={`/${lang}/modlitwa`} className="mb-4">{t('nav.prayer', 'Modlitwa')}</BackLink>
      <p className="text-slate-300">
        {t('prayerTexts.failed', 'Nie udało się wczytać tekstów. Sprawdź połączenie i spróbuj ponownie.')}
      </p>
      <p className="mt-1 text-xs text-slate-500">{failed}</p>
      <button
        type="button"
        onClick={() => setFresh((v) => v + 1)}
        className="mt-4 rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-300"
      >
        ↻ {t('prayerTexts.retry', 'Spróbuj ponownie')}
      </button>
    </div>
  )
  if (!data || !bible) return <p className="text-slate-400">{t('common.loading', '…')}</p>

  const title = data.title || t('prayerTexts.title', 'Teksty do modlitwy')
  const drawn = data.groups.map((g) => ({ group: g, verse: g.verses[picks[g.id] ?? 0] }))

  function drawAll() {
    if (!data) return
    setPicks((prev) => Object.fromEntries(data.groups.map((g) => [g.id, draw(g.verses.length, prev[g.id])])))
  }

  function shareSet() {
    setShare({
      title,
      text: drawn
        .filter((d) => d.verse)
        .map((d) => `${d.group.name}\n${quote(d.verse)}`)
        .join('\n\n'),
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackLink to={`/${lang}/modlitwa`}>{t('nav.prayer', 'Modlitwa')}</BackLink>
        <FontScale />
      </div>
      <PageHeading icon="prayer" title={title} />
      <p className="mt-1 text-slate-300">
        {data.intro || t('prayerTexts.intro', 'Cztery kroki modlitwy: uwielbienie, skrucha, prośby, wdzięczność.')}
      </p>

      <div className="no-print mt-4 flex gap-2 text-sm">
        {(['random', 'list'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            // „Losowo" wciskane ponownie daje kolejny zestaw, a nie ten sam
            onClick={() => { setMode(m); if (m === 'random') drawAll() }}
            aria-pressed={mode === m}
            className={`rounded-lg border px-3 py-1.5 transition ${
              mode === m
                ? 'border-brand bg-brand/10 font-semibold text-brand dark:border-sky-300 dark:text-sky-300'
                : 'border-slate-500/40 text-slate-200 hover:border-slate-300'
            }`}
          >
            {m === 'random'
              ? t('prayerTexts.random', 'Losowo')
              : t('prayerTexts.list', 'Wybierz z listy')}
          </button>
        ))}
      </div>

      {mode === 'random' ? (
        <div className="mt-4 space-y-3">
          {drawn.map(({ group, verse }) =>
            verse ? (
              <section key={group.id} className="overflow-hidden rounded-xl border border-slate-600 bg-slate-800/40">
                <h2 className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100">
                  {group.icon && <span aria-hidden>{group.icon}</span>}
                  {group.name}
                </h2>
                <div className="reading border-t border-white/10 p-3">
                  <div className="rounded-lg bg-white p-3 text-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-brand">{verse.ref}</span>
                      <button
                        onClick={() => setShare({ title: group.name, text: quote(verse) })}
                        className="no-print shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        ↗ {t('prayerTexts.share', 'Udostępnij')}
                      </button>
                    </div>
                    <p className="mt-1 leading-relaxed">{verseText(verse) || t('common.placeholderBible', 'Tekst wersetu pojawi się po podłączeniu przekładu.')}</p>
                  </div>
                </div>
              </section>
            ) : null
          )}
          <div className="no-print flex flex-wrap gap-3 pt-1 text-sm">
            <button
              type="button"
              onClick={drawAll}
              className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-slate-200 hover:border-slate-300"
            >
              ↻ {t('prayerTexts.drawAgain', 'Wylosuj inny zestaw')}
            </button>
            <button
              type="button"
              onClick={shareSet}
              className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-slate-200 hover:border-slate-300"
            >
              ↗ {t('prayerTexts.shareSet', 'Udostępnij cały zestaw')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.groups.map((g: PrayerTextGroup) => {
            const isOpen = open === g.id
            return (
              <div key={g.id} className="overflow-hidden rounded-xl border border-slate-600 bg-slate-800/40">
                <button
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                >
                  {g.icon && <span className="text-xl" aria-hidden>{g.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-100">{g.name}</span>
                    {g.intro && <span className="block text-xs text-slate-400">{g.intro}</span>}
                  </span>
                  <span className="text-xs text-slate-400">{g.verses.length}</span>
                  <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden>▾</span>
                </button>
                {isOpen && (
                  <ul className="reading space-y-2 border-t border-white/10 p-3">
                    {g.verses.map((v) => (
                      <li key={v.osis} className="rounded-lg bg-white p-3 text-slate-800">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-brand">{v.ref}</span>
                          <button
                            onClick={() => setShare({ title: g.name, text: quote(v) })}
                            className="no-print shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                          >
                            ↗ {t('prayerTexts.share', 'Udostępnij')}
                          </button>
                        </div>
                        <p className="mt-1 leading-relaxed">{verseText(v) || t('common.placeholderBible', 'Tekst wersetu pojawi się po podłączeniu przekładu.')}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ShareDialog
        open={!!share}
        onClose={() => setShare(null)}
        initialText={share?.text || ''}
        title={share?.title}
        url={`${window.location.origin}${import.meta.env.BASE_URL}`}
        onResult={(res) => { if (res === 'copied') showToast(t('common.copied', 'Skopiowano do schowka')) }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  )
}
