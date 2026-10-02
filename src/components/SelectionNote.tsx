import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { usePlace } from '../place'
import { BETA } from '../lib/beta'
import { QuickNoteDialog } from './QuickNoteDialog'

// Zaznaczony tekst -> notatka. Do systemowego menu zaznaczenia (Kopiuj, Udostepnij...)
// strona nie moze dopisac wlasnej pozycji - ani w przegladarce, ani w zainstalowanej
// PWA. Dlatego po zaznaczeniu pokazujemy wlasny przycisk na dole ekranu, z dala od
// menu systemowego, ktore wyskakuje przy samym zaznaczeniu.

const MIN = 3

function selectedText(): string {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return ''
  const node = sel.getRangeAt(0).commonAncestorContainer
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement
  // tylko tresc strony - nie pola formularzy, nie menu
  if (!el?.closest('main') || el.closest('input, textarea, [contenteditable="true"]')) return ''
  return sel.toString().replace(/\s+\n/g, '\n').trim()
}

export function SelectionNote() {
  const { lang, t } = useI18n()
  const { pathname, search } = useLocation()
  const place = usePlace()
  const [text, setText] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!BETA) return
    let timer: ReturnType<typeof setTimeout>
    const onChange = () => {
      clearTimeout(timer)
      // chwila zwloki - palec jeszcze przeciaga uchwyty zaznaczenia
      timer = setTimeout(() => {
        const s = selectedText()
        setText(s.length >= MIN ? s : '')
      }, 250)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', onChange)
    }
  }, [])

  useEffect(() => setText(''), [pathname])

  if (!BETA || pathname.includes(`/${lang}/notatki`)) return null

  const base = place ? { label: place, path: pathname + search } : undefined
  // poczatek cytatu - po kliknieciu w zrodlo strona przewinie sie do tego akapitu
  const source = base && open ? { ...base, quote: open.slice(0, 80) } : base

  return (
    <>
      {text && !open && (
        <button
          type="button"
          // pointerdown bez domyslnej akcji - inaczej dotkniecie przycisku kasuje zaznaczenie
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(text)}
          className="no-print fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-xl ring-2 ring-white/30 bottom-[calc(5.2rem+var(--plan-bar-h,0px)+env(safe-area-inset-bottom))] dark:bg-sky-500"
        >
          <span aria-hidden>✎</span>
          {t('notes.fromSelection', 'Dodaj do Moje notatki')}
        </button>
      )}

      {open !== null && (
        <QuickNoteDialog
          source={source}
          initialBody={`„${open}”\n\n`}
          onClose={() => setOpen(null)}
          onSaved={() => {
            window.getSelection()?.removeAllRanges()
            setText('')
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        />
      )}

      {saved && (
        <div className="no-print fixed left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-100 shadow-lg bottom-[calc(5.2rem+var(--plan-bar-h,0px))]">
          {t('notes.saved', 'Zapisano notatkę')}
        </div>
      )}
    </>
  )
}
