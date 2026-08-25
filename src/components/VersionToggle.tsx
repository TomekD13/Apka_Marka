import { useI18n } from '../i18n'

/** Tekst w dwoch dlugosciach - czytanki „40 dni" i materialy edukacyjne. */
export type TextVersion = 'short' | 'long'

/**
 * Przelacznik dlugosci tekstu. Czytanka otwiera sie w pelnej wersji (decyzja
 * autora 2026-08-25); przelaczenie na krotka przezywa przejscie do nastepnego
 * dnia, ale nie zostaje na stale - stad sessionStorage.
 */
export function rememberedVersion(key: string): TextVersion {
  try {
    return sessionStorage.getItem(key) === 'short' ? 'short' : 'long'
  } catch {
    return 'long'
  }
}

export function rememberVersion(key: string, v: TextVersion) {
  try {
    sessionStorage.setItem(key, v)
  } catch {
    /* prywatne okno - wybor zyje tylko w pamieci */
  }
}

export function VersionToggle({
  value,
  onChange,
  available,
  compact = false,
}: {
  value: TextVersion
  onChange: (v: TextVersion) => void
  available: TextVersion[]
  /** wariant do belki menu - mniejszy, zeby zmiescil sie obok tytulu */
  compact?: boolean
}) {
  const { t } = useI18n()
  const labels: Record<TextVersion, string> = {
    short: t('common.short', 'Krótko'),
    long: t('common.long', 'Pełna wersja'),
  }
  if (available.length < 2) return null
  return (
    <div className="no-print inline-flex rounded-lg border border-slate-500/40 bg-slate-900/40 p-0.5" role="group">
      {available.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md transition ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${
            value === v ? 'bg-brand font-semibold text-white' : 'text-slate-300 hover:text-slate-100'
          }`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  )
}
