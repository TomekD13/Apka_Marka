import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { PageHeading } from '../components/PageHeading'
import { useSetPlace } from '../place'
import {
  downloadTranslation,
  getChosenTranslation,
  listTranslations,
  loadBibleIndex,
  setChosenTranslation,
} from '../lib/bible'
import { installFromFile, installFromUrl, removeModule, type InstalledMeta } from '../lib/bibleStore'
import { installFromSource, loadCatalogs, loadSources } from '../lib/bibleOnline'
import { versificationGap } from '../lib/yesModule'
import type { BibleCatalog, BibleCatalogItem, BibleSource } from '../types'
import { BIBLE_LIST_PATH } from './Bible'

// Przeklady i tryb offline.
//
// Aplikacja nie rozprowadza cudzych przekladow: na serwerze lezy tylko to, na co
// pozwala licencja (UBG). Kazdy inny przeklad czytelnik wgrywa sobie sam – z pliku
// na swoim dysku albo spod wlasnego adresu – i modul zostaje wylacznie w jego
// przegladarce (IndexedDB, lib/bibleStore.ts).

interface Row {
  code: string
  name: string
  license: string
  source?: string
  sizeKB?: number
  installed: boolean
}

/**
 * Spis przekladow z jednego repozytorium. Klikniecie „Pobierz" sciaga plik przegladarka
 * (zwykle pobranie - CORS-a nie dotyczy), a zaraz pod spodem stoi przycisk, ktory ten plik
 * wskazuje aplikacji. Dwa klikniecia zamiast jednego, bo serwery repozytoriow nie pozwalaja
 * pobrac pliku z poziomu strony.
 */
function CatalogItems({ items, onPicked }: { items: BibleCatalogItem[]; onPicked: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [clicked, setClicked] = useState<string | null>(null)

  const complete = items.filter((i) => i.complete)
  const shown = all ? items : complete

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-left font-semibold text-white shadow-sm transition hover:bg-brand-light"
      >
        <span aria-hidden>↓</span>
        <span className="flex-1">{t('bible.showList', 'Pokaż przekłady')}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">{complete.length}</span>
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>
          ›
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {clicked && (
            <div className="mb-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-sm text-emerald-100">
              <p>
                {t('bible.downloadStarted', 'Pobieranie ruszyło')}: <b>{clicked}</b>.{' '}
                {t('bible.thenPick', 'Gdy plik będzie na dysku, wskaż go tutaj – resztę zrobimy sami.')}
              </p>
              <button
                type="button"
                onClick={onPicked}
                className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light"
              >
                {t('bible.pickDownloaded', 'Wskaż pobrany plik')}
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {shown.map((it) => (
              <li key={it.code} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-100" title={it.name}>
                  {it.name}
                  {!it.complete && (
                    <span className="ml-1.5 text-xs text-slate-400">
                      {t('bible.partial', 'fragment')}
                    </span>
                  )}
                </span>
                {it.sizeKB ? (
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {(it.sizeKB / 1024).toFixed(1)} MB
                  </span>
                ) : null}
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setClicked(it.name)}
                  className="shrink-0 rounded-md border border-brand/50 px-2.5 py-1 text-xs font-semibold text-brand-light hover:bg-brand/10"
                >
                  {t('bible.get', 'Pobierz')}
                </a>
              </li>
            ))}
          </ul>

          {complete.length < items.length && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-2 text-sm text-brand-light hover:underline"
            >
              {all
                ? t('bible.onlyComplete', 'Pokaż tylko całe Biblie')
                : `${t('bible.alsoPartial', 'Pokaż też fragmenty (NT, Psalmy)')} (${items.length - complete.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function BibleModulesPage() {
  const { lang, t } = useI18n()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [chosen, setChosen] = useState(() => getChosenTranslation())
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState<{ code: string; done: number; total: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [url, setUrl] = useState('')
  const [sources, setSources] = useState<BibleSource[]>([])
  const [catalogs, setCatalogs] = useState<BibleCatalog[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useSetPlace(t('bible.translations', 'Przekłady'))

  function refresh() {
    listTranslations(lang)
      .then((r) => setRows(r.translations))
      .catch(() => setRows([]))
  }
  useEffect(refresh, [lang])
  useEffect(() => {
    loadSources(lang).then(setSources).catch(() => setSources([]))
    loadCatalogs(lang).then(setCatalogs).catch(() => setCatalogs([]))
  }, [lang])

  async function offline(code: string) {
    setBusy(code)
    setMsg('')
    try {
      await downloadTranslation(lang, code, (done, total) => setProgress({ code, done, total }))
      setMsg(t('bible.offlineDone', 'Przekład jest dostępny offline.'))
    } catch {
      setMsg(t('bible.offlineFailed', 'Nie udało się pobrać całego przekładu.'))
    } finally {
      setBusy('')
      setProgress(null)
    }
  }

  function errorText(e: unknown): string {
    const code = e instanceof Error ? e.message : ''
    if (code === 'bad-format')
      return t('bible.installBadFormat', 'To nie jest plik modułu w formacie tej aplikacji.')
    if (code === 'quota')
      return t('bible.installQuota', 'Zabrakło miejsca w przeglądarce na ten przekład.')
    if (code === 'no-indexeddb')
      return t('bible.installNoDb', 'Ta przeglądarka nie pozwala zapisać modułu (tryb prywatny?).')
    if (code === 'network') return t('bible.installNetwork', 'Nie udało się pobrać pliku spod tego adresu.')
    if (code === 'zip-empty')
      return t('bible.installZipEmpty', 'W tym archiwum nie ma pliku modułu, który znamy.')
    if (code === 'bad-zip')
      return t('bible.installBadZip', 'Nie udało się rozpakować tego archiwum.')
    if (code === 'not-sqlite')
      return t('bible.installNotSqlite', 'Tego pliku nie da się otworzyć jako bazy modułu.')
    if (code === 'no-books')
      return t(
        'bible.installNoBooks',
        'W tym module nie rozpoznaliśmy ani jednej księgi – nazwy ksiąg są w nieznanym języku.'
      )
    if (code === 'yes-new-format')
      return t(
        'bible.installYesNew',
        'Ten moduł .yes jest w nowszej odmianie formatu, której aplikacja jeszcze nie czyta.'
      )
    return t('bible.installFailed', 'Nie udało się wczytać modułu.')
  }

  async function install(run: () => Promise<InstalledMeta>) {
    setBusy('install')
    setMsg('')
    try {
      const meta = await run()
      let note = `${t('bible.installDone', 'Wczytano przekład')}: ${meta.index.name} (${meta.index.books.length} ${t('bible.booksCount', 'ksiąg')})`
      // przeklady katolickie licza nadpisy psalmow jako wersety i maja dodatki w Dn i Est -
      // odnosnik ze studium trafi wtedy o werset obok; mowimy o tym od razu
      try {
        const template = await loadBibleIndex(lang, chosen)
        const gap = versificationGap(meta.index, template)
        if (gap > 20) note += ` – ${t('bible.versificationWarn', 'uwaga: ten przekład ma inną numerację wersetów niż pozostałe, więc odnośniki mogą trafiać o werset obok')} (${gap})`
      } catch {
        /* brak wzorca do porownania - nie blokuje wczytania */
      }
      setMsg(note)
      refresh()
    } catch (e) {
      setMsg(errorText(e))
    } finally {
      setBusy('')
    }
  }

  async function drop(code: string) {
    await removeModule(code).catch(() => undefined)
    if (chosen === code) {
      const fallback = rows?.find((r) => r.code !== code && !r.installed)?.code || 'UBG'
      setChosenTranslation(fallback)
      setChosen(fallback)
    }
    refresh()
  }

  return (
    <div>
      <PageHeading icon="book" title={t('bible.translations', 'Przekłady i tryb offline')} />

      {msg && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {msg}
        </p>
      )}

      {rows === null ? (
        <p className="mt-4 text-slate-400">{t('common.loading', '…')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.code} className="gradient-panel rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-100">{r.name}</span>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">{r.code}</span>
                {r.installed && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200 ring-1 ring-emerald-500/30">
                    {t('bible.installedTag', 'moduł w tej przeglądarce')}
                  </span>
                )}
                {chosen === r.code && (
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand-light ring-1 ring-brand/40">
                    {t('bible.current', 'czytany teraz')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{r.license}</p>
              {r.sizeKB ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {Math.round(r.sizeKB / 1024 * 10) / 10} MB{r.source ? ` · ${r.source}` : ''}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setChosenTranslation(r.code)
                    setChosen(r.code)
                  }}
                  disabled={chosen === r.code}
                  className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-slate-200 hover:border-slate-300 disabled:opacity-40"
                >
                  {t('bible.choose', 'Czytaj ten przekład')}
                </button>
                {!r.installed && (
                  <button
                    type="button"
                    onClick={() => offline(r.code)}
                    disabled={busy !== ''}
                    className="rounded-lg border border-brand/50 px-3 py-1.5 text-brand-light hover:bg-brand/10 disabled:opacity-40"
                  >
                    {progress?.code === r.code
                      ? `${t('home.downloading', 'Pobieranie…')} ${progress.done}/${progress.total}`
                      : t('bible.offline', 'Pobierz offline')}
                  </button>
                )}
                {r.installed && (
                  <button
                    type="button"
                    onClick={() => drop(r.code)}
                    className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-rose-200 hover:border-rose-400"
                  >
                    {t('bible.remove', 'Usuń moduł')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sources.filter((x) => !rows?.some((r) => r.code === x.code)).length > 0 && (
        <section className="gradient-panel mt-6 rounded-xl border p-3">
          <h2 className="font-semibold text-slate-100">
            {t('bible.onlineTitle', 'Przekłady do pobrania z sieci')}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {t(
              'bible.onlineDesc',
              'Tekst leży na cudzym serwerze – pobiera go twoja przeglądarka i zostaje u ciebie. Aplikacja niczego nie hostuje.'
            )}
          </p>
          <ul className="mt-3 space-y-2">
            {sources
              .filter((x) => !rows?.some((r) => r.code === x.code))
              .map((x) => (
                <li key={x.code} className="rounded-lg border border-white/10 bg-slate-900/40 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-100">{x.name}</span>
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">{x.code}</span>
                    <span className="text-xs text-slate-400">{x.provider}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{x.license}</p>
                  <button
                    type="button"
                    onClick={() =>
                      install(async () => {
                        const meta = await installFromSource(lang, x, chosen, (done, total) =>
                          setProgress({ code: x.code, done, total })
                        )
                        setProgress(null)
                        return meta
                      })
                    }
                    disabled={busy !== ''}
                    className="mt-2 rounded-lg border border-brand/50 px-3 py-1.5 text-sm text-brand-light hover:bg-brand/10 disabled:opacity-40"
                  >
                    {progress?.code === x.code
                      ? `${t('home.downloading', 'Pobieranie…')} ${progress.done}/${progress.total}`
                      : `${t('bible.onlineGet', 'Pobierz do przeglądarki')}${x.sizeKB ? ` (${Math.round(x.sizeKB / 1024 * 10) / 10} MB)` : ''}`}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {catalogs.length > 0 && (
        <section className="gradient-panel mt-6 rounded-xl border p-3">
          <h2 className="font-semibold text-slate-100">
            {t('bible.catalogsTitle', 'Gotowe przekłady do pobrania')}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {t(
              'bible.catalogsDesc',
              'Kliknij „Pobierz”, a potem wskaż pobrany plik – rozpakujemy go i zainstalujemy sami. Dwa kroki zamiast jednego, bo te serwery nie pozwalają aplikacji pobrać pliku za ciebie.'
            )}
          </p>
          <ul className="mt-3 space-y-2">
            {catalogs.map((c) => (
              <li key={c.url} className="rounded-lg border border-white/10 bg-slate-900/40 p-2.5">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-light hover:underline"
                >
                  {c.name} ↗
                </a>
                <p className="mt-0.5 text-xs text-slate-400">{c.formats}</p>
                {c.note && <p className="mt-1 text-sm text-slate-300">{c.note}</p>}
                {c.items && c.items.length > 0 && (
                  <CatalogItems items={c.items} onPicked={() => fileRef.current?.click()} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gradient-panel mt-6 rounded-xl border p-3">
        <h2 className="font-semibold text-slate-100">{t('bible.addTitle', 'Dodaj własny przekład')}</h2>
        <p className="mt-1 text-sm text-slate-300">
          {t(
            'bible.addDesc',
            'Przyjmujemy moduł .yes (Alkitab Bible Study) i nasz plik .json. Wgrywasz go ze swojego dysku – zostaje w tej przeglądarce i nie wychodzi na serwer.'
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,.yes,.sqlite3,.sqlite,.mybible,.zip,application/json,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) install(async () => installFromFile(f, await loadBibleIndex(lang, chosen)))
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== ''}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
          >
            {t('bible.fromFile', 'Wczytaj plik modułu')}
          </button>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-slate-300">{t('bible.fromUrl', 'albo adres pliku')}</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/BW.bible.json"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
            />
          </label>
          <button
            type="button"
            onClick={() => url.trim() && install(() => installFromUrl(url.trim()))}
            disabled={busy !== '' || !url.trim()}
            className="rounded-lg border border-slate-500/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-300 disabled:opacity-40"
          >
            {t('bible.fromUrlGo', 'Wczytaj')}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {t(
            'bible.formatsNote',
            'Moduł zrobisz z formatów, które trzymają czysty tekst z numeracją: Zefania XML, OSIS/USFM, MyBible (SQLite), Alkitab .yes. Konwerter jest w tools/bible_module.py. Adres pliku może wskazywać na dowolny serwer, który pozwala pobierać dane z przeglądarki (CORS). Pamiętaj o prawach autorskich: większość polskich przekładów wolno mieć u siebie, ale nie wolno ich rozpowszechniać.'
          )}
        </p>
      </section>

      <div className="mt-5">
        <BackLink to={`/${lang}/${BIBLE_LIST_PATH}`}>{t('bible.allBooks', 'Spis ksiąg')}</BackLink>
      </div>
    </div>
  )
}
