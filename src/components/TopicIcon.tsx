import type { ReactNode } from 'react'
import { AppIcon } from './AppNavigation'

const aliases: Record<string, string> = {
  uwielbienie: 'sun',
  skrucha: 'drop',
  wdziecznosc: 'heart',
  pocieszenie: 'heart-spark',
  smutek: 'drop',
  lek: 'wave',
  pokoj: 'leaf',
  nadzieja: 'anchor',
  radosc: 'sun',
  zaufanie: 'link',
  samotnosc: 'moon',
  choroba: 'health',
  przebaczenie: 'heart',
  madrosc: 'compass',
  'milosc-boza': 'heart',
  stres: 'wind',
  depresja: 'cloud',
  ochrona: 'shield',
  burze: 'storm',
  pokusa: 'stop',
  'nowy-poczatek': 'sunrise',
  cierpliwosc: 'hourglass',
  odwaga: 'mountain',
  slub: 'rings',
  pogrzeb: 'candle',
  'narodziny-dziecka': 'child',
  urodziny: 'gift',
}

const symbols: Record<string, ReactNode> = {
  sun: <><circle cx="16" cy="16" r="5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M6.8 6.8l3.5 3.5M21.7 21.7l3.5 3.5M25.2 6.8l-3.5 3.5M10.3 21.7l-3.5 3.5"/></>,
  drop: <><path d="M16 4S9 12.5 9 19a7 7 0 0 0 14 0C23 12.5 16 4 16 4Z"/><path d="M13 21c.8 1.3 2 2 3.5 2"/></>,
  heart: <path d="M16 27S6 21.3 6 13c0-5.5 6.6-7.7 10-2.8C19.4 5.3 26 7.5 26 13c0 8.3-10 14-10 14Z"/>,
  'heart-spark': <><path d="M14 27S5 21.7 5 14.2c0-5 6-7 9-2.5 3-4.5 9-2.5 9 2.5C23 21.7 14 27 14 27Z"/><path d="M25 4v6M22 7h6"/></>,
  wave: <><path d="M3 18c3.2 0 3.2-4 6.4-4s3.2 4 6.4 4 3.2-4 6.4-4 3.2 4 6.4 4"/><path d="M3 24c3.2 0 3.2-4 6.4-4s3.2 4 6.4 4 3.2-4 6.4-4 3.2 4 6.4 4"/></>,
  leaf: <><path d="M26 5C15 5 7 10 7 19c0 4 3 7 7 7 9 0 12-10 12-21Z"/><path d="M6 27c4-8 9-12 17-17"/></>,
  anchor: <><circle cx="16" cy="7" r="3"/><path d="M16 10v16M10 15h12M6 21c2 4 5.3 6 10 6s8-2 10-6M6 21l-2 3M26 21l2 3"/></>,
  link: <><path d="M13.5 19.5 10 23a5 5 0 0 1-7-7l5-5a5 5 0 0 1 7 0"/><path d="m18.5 12.5 3.5-3.5a5 5 0 0 1 7 7l-5 5a5 5 0 0 1-7 0"/><path d="m11 21 10-10"/></>,
  moon: <path d="M25 22.5A11 11 0 0 1 10 7a11 11 0 1 0 15 15.5Z"/>,
  health: <><rect x="5" y="5" width="22" height="22" rx="6"/><path d="M16 10v12M10 16h12"/></>,
  compass: <><circle cx="16" cy="16" r="12"/><path d="m20.5 11.5-3 6-6 3 3-6 6-3Z"/></>,
  wind: <><path d="M4 11h15c4 0 4-6 0-6-2 0-3 1-3 2M4 16h21c4 0 4 6 0 6-2 0-3-1-3-2M4 21h10"/></>,
  cloud: <><path d="M8 24h15a6 6 0 0 0 .5-12A8 8 0 0 0 8.4 10 7 7 0 0 0 8 24Z"/><path d="M12 27v2M18 27v2"/></>,
  shield: <path d="M16 3 27 7v8c0 7-4.5 11-11 14C9.5 26 5 22 5 15V7l11-4Z"/>,
  storm: <><path d="M7 20h17a5 5 0 0 0 0-10 8 8 0 0 0-15-2A6 6 0 0 0 7 20Z"/><path d="m16 20-3 6h4l-2 4"/></>,
  stop: <><circle cx="16" cy="16" r="12"/><path d="m8 24 16-16"/></>,
  sunrise: <><path d="M4 25h24M8 21a8 8 0 0 1 16 0M16 5v5M5.5 10.5l4 4M26.5 10.5l-4 4"/></>,
  hourglass: <><path d="M9 4h14M9 28h14M11 4c0 6 1.5 8 5 12-3.5 4-5 6-5 12M21 4c0 6-1.5 8-5 12 3.5 4 5 6 5 12"/></>,
  mountain: <><path d="m3 27 9-16 4 7 3-5 10 14H3Z"/><path d="m9.5 15 2.5 2 2-2"/></>,
  rings: <><circle cx="12" cy="17" r="7"/><circle cx="20" cy="17" r="7"/></>,
  candle: <><path d="M11 14h10v14H11zM9 28h14"/><path d="M16 13c-3-3-1-6 1-9 3 4 4 7-1 9Z"/></>,
  child: <><circle cx="16" cy="9" r="4"/><path d="M8 28c0-6 3.6-11 8-11s8 5 8 11M11 20l-5 3M21 20l5 3"/></>,
  gift: <><rect x="5" y="13" width="22" height="15" rx="2"/><path d="M4 13h24M16 13v15M16 12c-5 0-8-1-8-4 0-2 1.5-3 3-3 3 0 5 4 5 7ZM16 12c5 0 8-1 8-4 0-2-1.5-3-3-3-3 0-5 4-5 7Z"/></>,
}

export function TopicIcon({ topic, className = '' }: { topic: string; className?: string }) {
  if (topic === 'prosby' || topic === 'modlitwa') {
    return <AppIcon name="prayer" className={className} />
  }
  const symbol = symbols[aliases[topic]] ?? symbols.heart
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {symbol}
    </svg>
  )
}
