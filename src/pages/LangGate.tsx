import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { loadLangs } from '../content'
import type { LangMeta } from '../types'

export function LangGate() {
  const [langs, setLangs] = useState<LangMeta[]>([])
  useEffect(() => {
    loadLangs().then((l) => setLangs(l.languages)).catch(() => setLangs([]))
  }, [])

  // Przy jednym wlaczonym jezyku ekran wyboru jest jednym zbednym klikiem -
  // wchodzimy prosto do aplikacji. Wroci sam, gdy dojdzie drugi jezyk.
  if (langs.length === 1) return <Navigate to={`/${langs[0].code}`} replace />

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Desktop: pełnoekranowe tło powitalne. Mobile: brak obrazu - zostaje ciemne tło. */}
      <img
        src={`${import.meta.env.BASE_URL}open.webp`}
        alt=""
        aria-hidden
        className="hidden sm:block absolute inset-0 h-full w-full object-cover"
      />
      {/* Treść wyśrodkowana - w przestrzeni zostawionej na środku obrazu */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3 sm:hidden">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-10 h-10" />
          <h1 className="text-2xl font-semibold text-brand dark:text-brand-light">Studium Biblii</h1>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {langs.map((l) => (
            <Link
              key={l.code}
              to={`/${l.code}`}
              className="flex min-w-[7rem] flex-col items-center rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 text-center hover:border-brand hover:shadow-sm sm:border-white/20 sm:bg-slate-900/50 sm:text-white sm:backdrop-blur-sm sm:hover:border-brand"
            >
              <span className="text-sm font-semibold text-sky-300">{l.greeting ?? l.name}</span>
              <span className="text-base font-medium">{l.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
