/** Zlicza anonimowe odslony tylko na produkcyjnej domenie #JestNadzieja. */
const TRACKED_HOST = 'jestnadzieja.adwent.pl'

export type AnalyticsEvent =
  | 'account_connected'
  | 'app_installed'
  | 'bible_search'
  | 'material_read'
  | 'plan_started'
  | 'share'
  | 'theme_light'
  | 'theme_dark'
  | 'font_nunito'
  | 'font_outfit'

function send(data: Record<string, string>) {
  try {
    if (typeof window === 'undefined' || window.location.hostname !== TRACKED_HOST) return

    const body = JSON.stringify(data)
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/stat/hit.php', new Blob([body], { type: 'text/plain;charset=UTF-8' }))
      return
    }
    void fetch('/stat/hit.php', { method: 'POST', body, keepalive: true }).catch(() => undefined)
  } catch {
    // Statystyki nie moga zaklocic korzystania z aplikacji.
  }
}

export function trackPageView(path: string) {
  send({ t: 'page', p: path, r: document.referrer || '' })
}

/** Zdarzenia sa celowo zbiorcze: bez tresci, identyfikatora konta i danych czytelnika. */
export function trackEvent(event: AnalyticsEvent) {
  send({ t: 'event', e: event })
}
