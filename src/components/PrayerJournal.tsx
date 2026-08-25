import { useState } from 'react'
import { useI18n } from '../i18n'
import { addPrayer, deletePrayer, listPrayers, updatePrayer } from '../lib/prayers'
import type { Prayer } from '../types'

/**
 * Dziennik modlitw: lista wierszy, ktora rosnie w miejscu. Zaznaczenie "wysluchana"
 * odklada pozycje na dol i otwiera pole na komentarz - co Bog odpowiedzial.
 * Wszystko zostaje w tej przegladarce (lib/prayers.ts).
 */
export function PrayerJournal({ limit }: { limit?: number }) {
  const { lang, t } = useI18n()
  const [items, setItems] = useState<Prayer[]>(() => listPrayers())
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const refresh = () => setItems(listPrayers())

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    if (!addPrayer(draft)) {
      setError(t('prayers.saveFailed', 'Nie udało się zapisać – przeglądarka blokuje zapis danych.'))
      return
    }
    setDraft('')
    setError('')
    refresh()
  }

  function toggle(p: Prayer) {
    updatePrayer(p.id, { answered: !p.answered })
    refresh()
  }

  function setAnswer(p: Prayer, text: string) {
    updatePrayer(p.id, { answer: text.trim() || undefined })
    refresh()
  }

  function remove(p: Prayer) {
    if (!confirm(t('prayers.confirmDelete', 'Usunąć tę pozycję z dziennika?'))) return
    deletePrayer(p.id)
    refresh()
  }

  const open = items.filter((p) => !p.answered)
  const answered = items.filter((p) => p.answered)
  const shown = limit ? items.slice(0, limit) : items

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' })
    } catch {
      return iso.slice(0, 10)
    }
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-300">
          {t('prayers.empty', 'Dziennik jest pusty. Wpisz pierwszą prośbę poniżej.')}
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {shown.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border px-3 py-2 ${
                p.answered ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-slate-900/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={p.answered}
                  onChange={() => toggle(p)}
                  aria-label={t('prayers.markAnswered', 'Modlitwa otrzymała odpowiedź')}
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
                />
                <div className="min-w-0 flex-1">
                  <p className={`leading-snug ${p.answered ? 'text-emerald-100' : 'text-slate-100'}`}>
                    {p.text}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDate(p.createdAt)}
                    {p.answered && p.answeredAt && (
                      <>
                        <span className="mx-1" aria-hidden>→</span>
                        {t('prayers.answeredOn', 'wysłuchana')} {formatDate(p.answeredAt)}
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  title={t('prayers.delete', 'Usuń')}
                  aria-label={t('prayers.delete', 'Usuń')}
                  className="shrink-0 rounded px-1 text-slate-500 hover:text-rose-300"
                >
                  ×
                </button>
              </div>

              {p.answered && (
                <textarea
                  defaultValue={p.answer ?? ''}
                  onBlur={(e) => setAnswer(p, e.target.value)}
                  rows={2}
                  placeholder={t('prayers.answerPlaceholder', 'Jak Bóg odpowiedział?')}
                  aria-label={t('prayers.answerLabel', 'Komentarz do wysłuchanej modlitwy')}
                  className="mt-2 w-full rounded-lg border border-emerald-500/30 bg-white/95 px-3 py-1.5 text-sm leading-relaxed text-slate-900 outline-none focus:border-emerald-500"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {limit && items.length > limit && (
        <p className="mb-3 text-xs text-slate-400">
          {t('prayers.more', 'Dalsze pozycje w pełnym dzienniku')} ({items.length - limit})
        </p>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('prayers.addPlaceholder', 'Dopisz kolejną prośbę…')}
          aria-label={t('prayers.add', 'Dopisz prośbę')}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
        >
          {t('prayers.add', 'Dopisz')}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

      {items.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {t('prayers.openCount', 'W modlitwie')}: {open.length}
          <span className="mx-1.5" aria-hidden>·</span>
          {t('prayers.answeredCount', 'wysłuchane')}: {answered.length}
        </p>
      )}
    </div>
  )
}
