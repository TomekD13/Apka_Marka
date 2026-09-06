/** Zlicza anonimowe odslony tylko na produkcyjnej domenie #JestNadzieja. */
const TRACKED_HOST = 'jestnadzieja.adwent.pl'

export function trackPageView(path: string) {
  try {
    if (typeof window === 'undefined' || window.location.hostname !== TRACKED_HOST) return

    const body = JSON.stringify({ p: path, r: document.referrer || '' })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/stat/hit.php', new Blob([body], { type: 'text/plain;charset=UTF-8' }))
      return
    }
    void fetch('/stat/hit.php', { method: 'POST', body, keepalive: true }).catch(() => undefined)
  } catch {
    // Statystyki nie moga zaklocic korzystania z aplikacji.
  }
}
