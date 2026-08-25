import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Belki menu glownego. Trzy warianty tego samego ksztaltu:
//   <MenuBar> z children  -> rozwija tresc w miejscu,
//   <MenuBar to=...>      -> przechodzi na strone w aplikacji,
//   <MenuBar href=...>    -> otwiera strone zewnetrzna w nowej karcie.

export type Accent = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate' | 'hope'

const ACCENT: Record<Accent, { panel: string; hover: string; chip: string }> = {
  sky: { panel: 'border-sky-500/30 bg-sky-500/10', hover: 'hover:border-sky-400', chip: 'bg-sky-500/15 text-sky-200 ring-sky-500/30' },
  emerald: { panel: 'border-emerald-500/30 bg-emerald-500/10', hover: 'hover:border-emerald-400', chip: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30' },
  amber: { panel: 'border-amber-500/30 bg-amber-500/10', hover: 'hover:border-amber-400', chip: 'bg-amber-500/15 text-amber-200 ring-amber-500/30' },
  violet: { panel: 'border-violet-500/30 bg-violet-500/10', hover: 'hover:border-violet-400', chip: 'bg-violet-500/15 text-violet-200 ring-violet-500/30' },
  rose: { panel: 'border-rose-500/30 bg-rose-500/10', hover: 'hover:border-rose-400', chip: 'bg-rose-500/15 text-rose-200 ring-rose-500/30' },
  slate: { panel: 'border-slate-500/30 bg-slate-500/10', hover: 'hover:border-slate-400', chip: 'bg-slate-500/15 text-slate-300 ring-slate-500/30' },
  // kolorystyka akcji #JestNadzieja: nocne niebo z gradientem turkus -> fiolet -> roz
  hope: {
    panel: 'border-fuchsia-500/40 bg-gradient-to-r from-[#0b1026] via-[#231044] to-[#3d1150]',
    hover: 'hover:border-fuchsia-400',
    chip: 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/40',
  },
}

interface Common {
  icon?: string
  title: string
  /** logo zamiast tekstowego tytulu (tytul zostaje jako tekst alternatywny) */
  logo?: string
  desc?: string
  badge?: string
  accent?: Accent
  className?: string
}

function Face({ icon, title, logo, desc, badge, chip, open, expandable }: Common & { chip: string; open?: boolean; expandable?: boolean }) {
  return (
    <div className="flex w-full items-center gap-3 text-left">
      {icon && <span className="text-2xl leading-none" aria-hidden>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={title} className="h-7 w-auto max-w-full sm:h-8" />
          ) : (
            <span className="font-bold text-slate-100">{title}</span>
          )}
          {badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${chip}`}>{badge}</span>
          )}
        </div>
        {desc && <div className="mt-0.5 text-sm text-slate-300">{desc}</div>}
      </div>
      <span
        className={`shrink-0 text-slate-400 transition-transform ${expandable && open ? 'rotate-90' : ''}`}
        aria-hidden
      >
        ›
      </span>
    </div>
  )
}

/** Zwiniecie/rozwiniecie przezywa powrot z czytnika, ale nie zostaje na stale. */
function useRemembered(id: string | undefined, initial: boolean) {
  const key = id ? `zywe-slowo:bar:${id}` : null
  const [open, setOpen] = useState(() => {
    if (!key) return initial
    try {
      const v = sessionStorage.getItem(key)
      return v === null ? initial : v === '1'
    } catch {
      return initial
    }
  })
  useEffect(() => {
    if (!key) return
    try {
      sessionStorage.setItem(key, open ? '1' : '0')
    } catch {
      /* prywatne okno - trudno, stan zyje tylko w pamieci */
    }
  }, [key, open])
  return [open, setOpen] as const
}

export function MenuBar({
  icon,
  title,
  logo,
  desc,
  badge,
  accent = 'slate',
  className = '',
  to,
  href,
  id,
  defaultOpen = false,
  children,
}: Common & {
  to?: string
  href?: string
  id?: string
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const a = ACCENT[accent]
  const [open, setOpen] = useRemembered(id, defaultOpen)
  const face = <Face icon={icon} title={title} logo={logo} desc={desc} badge={badge} chip={a.chip} open={open} expandable={!!children} />
  const shell = `block rounded-2xl border p-4 transition ${a.panel} ${a.hover} ${className}`

  if (to) return <Link to={to} className={shell}>{face}</Link>

  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={shell}>
        {face}
      </a>
    )

  const panelId = `bar-${id || title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className={`rounded-2xl border transition ${a.panel} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full rounded-2xl p-4 text-left"
      >
        {face}
      </button>
      {open && (
        <div id={panelId} className="border-t border-white/10 p-4 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}
