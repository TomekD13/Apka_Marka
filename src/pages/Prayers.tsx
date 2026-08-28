import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { BackLink } from '../components/BackLink'
import { PrayerJournal } from '../components/PrayerJournal'
import { PageHeading } from '../components/PageHeading'
import { exportPrayers, importPrayers, listPrayers } from '../lib/prayers'

export function Prayers() {
  const { lang, t } = useI18n()
  const [key, setKey] = useState(0) // przeladowanie dziennika po wczytaniu kopii
  const fileRef = useRef<HTMLInputElement>(null)

  function download() {
    const blob = new Blob([exportPrayers()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dziennik-modlitw.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function upload(file: File) {
    try {
      const n = importPrayers(await file.text())
      setKey((v) => v + 1)
      alert(t('prayers.imported', 'Wczytano pozycji:') + ' ' + n)
    } catch {
      alert(t('prayers.importFailed', 'Nie udało się wczytać tego pliku.'))
    }
  }

  return (
    <div>
      <BackLink to={`/${lang}`} className="mb-4">
        {t('nav.topics', 'Menu główne')}
      </BackLink>
      <PageHeading icon="prayer" title={t('prayers.title', 'Dziennik modlitw')} className="mb-4" />

      <p className="mb-5 rounded-xl border border-slate-500/25 bg-slate-500/10 p-3 text-sm text-slate-300">
        {t(
          'prayers.privacy',
          'Dziennik jest zapisany wyłącznie w tej przeglądarce – nie wysyłamy go nigdzie i nie mamy do niego wglądu. Wyczyszczenie danych przeglądarki go usunie, dlatego warto co jakiś czas zapisać kopię do pliku.'
        )}
      </p>

      <PrayerJournal key={key} />

      <div className="no-print mt-8 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={download}
          disabled={listPrayers().length === 0}
          className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-slate-200 hover:border-slate-300 disabled:opacity-40"
        >
          {t('prayers.export', 'Zapisz kopię do pliku')}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-slate-200 hover:border-slate-300"
        >
          {t('prayers.import', 'Wczytaj kopię z pliku')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
