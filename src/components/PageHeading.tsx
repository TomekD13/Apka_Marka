import { AppIcon, type IconName } from './AppNavigation'

export function PageHeading({ icon, title, eyebrow, className = '' }: { icon: IconName; title: string; eyebrow?: string; className?: string }) {
  return <div className={`flex items-center gap-3 ${className}`}>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-sky-400/15 dark:text-sky-300"><AppIcon name={icon} className="h-6 w-6" /></span>
    <div className="min-w-0">
      {eyebrow && <p className="text-sm font-semibold text-brand dark:text-sky-300">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
    </div>
  </div>
}
