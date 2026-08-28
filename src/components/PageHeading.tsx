import { AppIcon, type IconName } from './AppNavigation'

export function PageHeading({ icon, title, eyebrow, className = '' }: { icon: IconName; title: string; eyebrow?: string; className?: string }) {
  return <div className={`page-heading-gradient flex w-full items-center gap-3 ${className}`}>
    <span className="page-heading-gradient__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><AppIcon name={icon} className="h-6 w-6" /></span>
    <div className="min-w-0">
      {eyebrow && <p className="text-sm font-semibold text-blue-100">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
    </div>
  </div>
}
