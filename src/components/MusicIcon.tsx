import type { ReactNode } from 'react'

// Ikony utworow z Muzyki do modlitwy - ten sam styl co AppIcon (32x32, kreska 2,2).
// Zrodlo: Muzyka_do_modlitwy/do_aplikacji/zbuduj.py - zmieniaj tam i generuj od nowa.
const paths: Record<string, ReactNode> = {
  'lyre': <><path d="M9.5 22.5c0 2.8 2.9 4.5 6.5 4.5s6.5-1.7 6.5-4.5z"/><path d="M10.8 22.5C8 18.5 5.8 12.5 6.8 7.6c.4-1.8 2-2.9 3.7-2.4"/><path d="M21.2 22.5C24 18.5 26.2 12.5 25.2 7.6c-.4-1.8-2-2.9-3.7-2.4"/><path d="M7.2 10h17.6"/><path d="M13 10v12.5M16 10v12.5M19 10v12.5"/></>,
  'sunrise': <><path d="M4 22h24"/><path d="M8 27h16"/><path d="M9.5 22a6.5 6.5 0 0 1 13 0"/><path d="M16 7v3M7.6 11.1l2.1 2.1M24.4 11.1l-2.1 2.1M4.5 17.5H7M25 17.5h2.5"/></>,
  'candle': <><path d="M12.5 15h7v12h-7z"/><path d="M10 27h12"/><path d="M16 4.5c2.6 2.8 3.2 5 .1 7.8-3.1-2.8-2.7-5-.1-7.8z"/><path d="M16 12.4V15"/></>,
  'hand-heart': <><path d="M16 15.5s-5-3-5-6.4c0-1.8 1.4-3.2 3-3.2 1 0 1.6.5 2 1.1.4-.6 1-1.1 2-1.1 1.6 0 3 1.4 3 3.2 0 3.4-5 6.4-5 6.4z"/><path d="M4 19.5c2.3 0 4.6.8 6.5 2.3h5.8c1 0 1.7.7 1.7 1.6s-.7 1.6-1.7 1.6H12"/><path d="M18 23.5l6.4-3.1c1-.5 2.1-.1 2.4.9.3.8-.1 1.6-.9 2l-8.1 4.1c-.8.4-1.7.5-2.6.3L4 25.5"/></>,
  'bell': <><path d="M9.5 21.5V15a6.5 6.5 0 0 1 13 0v6.5l2 2.5h-17z"/><path d="M14 27a2 2 0 0 0 4 0"/><path d="M16 6.5V5"/></>,
  'waves': <><path d="M4 11c3-2.4 5-2.4 8 0s5 2.4 8 0 5-2.4 8 0"/><path d="M4 17c3-2.4 5-2.4 8 0s5 2.4 8 0 5-2.4 8 0"/><path d="M4 23c3-2.4 5-2.4 8 0s5 2.4 8 0 5-2.4 8 0"/></>,
  'boat': <><path d="M6 19.5h20l-3.2 4.5H9.2z"/><path d="M16 19.5v-14"/><path d="M16 6.5l7.5 10H16"/><path d="M4 28c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0 4 1.5 6 0"/></>,
  'stars': <><path d="M13 4.5l2.1 6.4 6.4 2.1-6.4 2.1L13 21.5l-2.1-6.4L4.5 13l6.4-2.1z"/><path d="M23.5 18l1.1 3.4 3.4 1.1-3.4 1.1-1.1 3.4-1.1-3.4-3.4-1.1 3.4-1.1z"/></>,
  'moon': <><path d="M20.5 5.2A11 11 0 1 0 26.8 21a8.8 8.8 0 0 1-6.3-15.8z"/></>,
  'anchor': <><circle cx="16" cy="6.5" r="2.5"/><path d="M16 9v18"/><path d="M11 13h10"/><path d="M6 19.5c0 4.7 4.5 7.5 10 7.5s10-2.8 10-7.5"/><path d="M4 21.5l2-2 2 2M24 21.5l2-2 2 2"/></>,
  'forest-sun': <><path d="M12 5 6.5 12.5h3L5 19h14l-4.5-6.5h3z"/><path d="M12 19v8"/><path d="M4 27h24"/><circle cx="24" cy="9.5" r="3.4"/></>,
  'forest-stream': <><path d="M10 4 5.5 10.5H8L4.5 16h11L12 10.5h2.5z"/><path d="M10 16v3.5"/><path d="M23 7.5l-3.2 4.6h1.6L18.5 16h9l-2.9-3.9h1.6z"/><path d="M23 16v3.5"/><path d="M4 23.5c3-2 5-2 8 0s5 2 8 0 5-2 8 0"/><path d="M7 28c2.5-1.6 4.5-1.6 7 0s4.5 1.6 7 0 4.5-1.6 7 0"/></>,
  'forest-moon': <><path d="M11 5 5.5 12.5h3L4 19h14l-4.5-6.5h3z"/><path d="M11 19v8"/><path d="M4 27h24"/><path d="M24.5 4.5a5 5 0 1 0 4 7.6 4 4 0 0 1-4-7.6z"/></>,
  'marimba': <><rect x="4" y="8" width="3.5" height="16" rx="1"/><rect x="9" y="10" width="3.5" height="14" rx="1"/><rect x="14" y="12" width="3.5" height="12" rx="1"/><rect x="19" y="14" width="3.5" height="10" rx="1"/><path d="M27 27l-2-13.8"/><circle cx="24.7" cy="11" r="2"/></>,
  'ukulele': <><path d="M16 12c-2.6 0-3.9 1.7-3.9 3.6 0 1.1.5 1.8.5 2.4 0 .7-2.6 1.6-2.6 4.6 0 3.2 2.7 5.4 6 5.4s6-2.2 6-5.4c0-3-2.6-3.9-2.6-4.6 0-.6.5-1.3.5-2.4 0-1.9-1.3-3.6-3.9-3.6z"/><circle cx="16" cy="22.5" r="1.6"/><path d="M16 12V6"/><path d="M14.5 3.5h3V6h-3z"/><path d="M12.8 4.2h1.7M17.5 4.2h1.7M12.8 5.6h1.7M17.5 5.6h1.7"/></>,
  'piano': <><rect x="4" y="9" width="24" height="14" rx="2"/><path d="M10 15.5V23M16 15.5V23M22 15.5V23"/><rect x="8.5" y="9" width="3" height="6.5" rx=".5"/><rect x="14.5" y="9" width="3" height="6.5" rx=".5"/><rect x="20.5" y="9" width="3" height="6.5" rx=".5"/></>,
  'guitar': <><g transform="rotate(35 16 16)"><path d="M16 13.5c-2.8 0-4.3 1.8-4.3 3.9 0 1.2.6 1.9.6 2.5 0 .8-3 1.8-3 5C9.3 28 12.3 29 16 29s6.7-1 6.7-4.1c0-3.2-3-4.2-3-5 0-.6.6-1.3.6-2.5 0-2.1-1.5-3.9-4.3-3.9z"/><circle cx="16" cy="22" r="1.8"/><path d="M16 13.5V4"/><path d="M14.8 1.5h2.4V4h-2.4z"/></g></>,
  'cello': <><path d="M15 9c-3 0-4.6 1.6-4.6 3.8 0 1.6 1 2.4 1 3.2 0 .9-2.7 1.9-2.7 5.3 0 3.4 2.8 5.2 6.3 5.2s6.3-1.8 6.3-5.2c0-3.4-2.7-4.4-2.7-5.3 0-.8 1-1.6 1-3.2C19.6 10.6 18 9 15 9z"/><path d="M15 9V4.5"/><circle cx="15" cy="3.3" r="1.2"/><path d="M15 26.5V29"/><path d="M13 18.5V22M17 18.5V22"/><path d="M24.5 4.5 27.5 25"/></>,
  'flute': <><g transform="rotate(-30 16 16)"><rect x="2.5" y="13.8" width="27" height="4.4" rx="2.2"/><circle cx="7" cy="16" r=".4"/><circle cx="14" cy="16" r=".4"/><circle cx="18" cy="16" r=".4"/><circle cx="22" cy="16" r=".4"/></g></>,
  'violin': <><g transform="rotate(-35 16 16)"><path d="M15 9c-3 0-4.6 1.6-4.6 3.8 0 1.6 1 2.4 1 3.2 0 .9-2.7 1.9-2.7 5.3 0 3.4 2.8 5.2 6.3 5.2s6.3-1.8 6.3-5.2c0-3.4-2.7-4.4-2.7-5.3 0-.8 1-1.6 1-3.2C19.6 10.6 18 9 15 9z"/><path d="M15 9V4.5"/><circle cx="15" cy="3.3" r="1.2"/><path d="M15 26.5V29"/><path d="M13 18.5V22M17 18.5V22"/><path d="M24.5 4.5 27.5 25"/></g></>,
  'crook': <><path d="M13 28.5V10.5a4.5 4.5 0 0 1 9 0V12a1.8 1.8 0 0 1-3.6 0"/><path d="M9.5 28.5h7"/></>,
  'organ': <><path d="M5 27.5h22"/><path d="M8 27.5V15M12 27.5V10M16 27.5V5.5M20 27.5V10M24 27.5V15"/><path d="M6.6 15h2.8M10.6 10h2.8M14.6 5.5h2.8M18.6 10h2.8M22.6 15h2.8"/></>,
  'clarinet': <><g transform="rotate(-35 16 16)"><path d="M14.6 4h2.8v18.5l2.6 5.5h-8l2.6-5.5z"/><path d="M15.1 4V2h1.8v2"/><circle cx="16" cy="9" r=".5"/><circle cx="16" cy="13" r=".5"/><circle cx="16" cy="17" r=".5"/></g></>,
  'lamp': <><path d="M4.5 19.5c1.5 3 5 4.5 9.5 4.5h3c3.6 0 6.4-1.8 8-4.8l2.5-4"/><path d="M4.5 19.5c2.4-1.2 6-1.8 10-1.8h11"/><path d="M15 17.7c0-1.8.6-3.3 1.8-4.6"/><path d="M17 4.5c2 2.2 2.4 4 .1 6-2.3-2-2-3.8-.1-6z"/><path d="M11 28h10"/></>,
  'cross': <><path d="M16 4v24"/><path d="M9.5 11h13"/><path d="M10.5 28h11"/></>,
  'star': <><path d="M16 3 18 13l8 3-8 3-2 10-2-10-8-3 8-3z"/></>,
  'rock': <><path d="M3.5 26 12 11l5 8 3.5-5L28.5 26z"/><path d="M12 11l2.5 6"/></>,
  'sun': <><circle cx="16" cy="16" r="5"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M24.5 7.5l-2.1 2.1M9.6 22.4l-2.1 2.1"/></>,
  'crown': <><path d="M5 23 3.5 10l7 5.5L16 7l5.5 8.5 7-5.5L27 23z"/><path d="M5.5 27h21"/></>,
  'harp': <><path d="M8 27V5.5"/><path d="M8 5.5c5 0 8.5 3.8 15 3 1.2-.1 2-.5 2.5-1"/><path d="M25.5 7.5 11 27"/><path d="M6 27h7"/><path d="M12 6v19.7M16 7v13.3M20 8.2v6.7"/></>,
}

export function MusicIcon({ name, className = '' }: { name: string; className?: string }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{paths[name] ?? paths.lyre}</svg>
}
