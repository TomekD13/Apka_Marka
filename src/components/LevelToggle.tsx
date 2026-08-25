import { useI18n } from '../i18n'
import type { Level } from '../types'

const ORDER: Level[] = ['base', 'extended', 'advanced']

export function levelRank(l: Level) {
  return ORDER.indexOf(l)
}

/**
 * Jasne „karty” na ciemnym tle - ciemny tekst na jasnym dla czytelności.
 * Każdy kolejny poziom = ciemniejszy/bardziej nasycony odcień (base → extended → advanced).
 */
export const LEVEL_STYLES: Record<Level, { card: string; chip: string; toggle: string }> = {
  base:     { card: 'bg-slate-100 border-slate-300',   chip: 'bg-slate-300 text-slate-800',    toggle: 'bg-slate-300 text-slate-900' },
  extended: { card: 'bg-sky-100 border-sky-300',       chip: 'bg-sky-300 text-sky-950',        toggle: 'bg-sky-400 text-sky-950' },
  advanced: { card: 'bg-violet-100 border-violet-300', chip: 'bg-violet-300 text-violet-950',  toggle: 'bg-violet-400 text-violet-950' },
}

export function LevelToggle({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const { t } = useI18n()
  return (
    <div className="no-print inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-sm">
      {ORDER.map((l) => {
        // poziomy są addytywne: wybór wyższego podświetla też niższe (każdy w swoim kolorze)
        const active = levelRank(l) <= levelRank(value)
        return (
          <button
            key={l}
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={
              'px-3 py-1.5 font-medium ' +
              (active
                ? LEVEL_STYLES[l].toggle
                : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
            }
          >
            {t(`reader.${l}`, l)}
          </button>
        )
      })}
    </div>
  )
}
