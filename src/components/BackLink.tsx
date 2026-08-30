import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

// Powrot o poziom wyzej. Jeden wyglad w calej aplikacji (decyzja autora
// 2026-08-25): kafelek, nie szary napis - zeby droga powrotna byla widoczna
// od razu, bez szukania.

const SHELL =
  'no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-500/40 bg-slate-800/70 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-brand hover:bg-brand/15'

export function BackLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} viewTransition className={`${SHELL} ${className}`}>
      <span aria-hidden>‹</span>
      {children}
    </Link>
  )
}

/** Ten sam kafelek, gdy powrot jest zmiana stanu, a nie przejsciem na strone. */
export function BackButton({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button type="button" onClick={onClick} className={`${SHELL} ${className}`}>
      <span aria-hidden>‹</span>
      {children}
    </button>
  )
}
