import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'

interface Props {
  playlistId?: string
  videoIds?: string[]
}

/**
 * Okienko „na dziś": 3 miniatury w jednym rzędzie (oficjalny iframe YouTube).
 * - są videoIds → losujemy 3 z CAŁEJ playlisty (inny zestaw przy każdym przeładowaniu);
 *   klik na miniaturę odtwarza film w miejscu,
 * - brak videoIds, ale jest playlistId → osadzamy playlistę (fallback),
 * - offline / błąd ładowania → ukrywamy całe okienko (brak zepsutych obrazków).
 */
export function FeaturedVideo({ playlistId, videoIds }: Props) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  // navigator.onLine bywa chwilowo false na komórce przy starcie z cache (PWA);
  // nasłuch zdarzeń sprawia, że sekcja pojawia się sama po odzyskaniu sieci - bez przeładowania.
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  // Tasowanie (Fisher-Yates) + 3: losowy zestaw 3 z całej playlisty przy każdym wejściu/przeładowaniu.
  // useMemo zależne tylko od videoIds → stabilne w obrębie jednej sesji (klik play nie przetasowuje).
  const ids = useMemo(() => {
    const all = (videoIds ?? []).filter(Boolean)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, 3)
  }, [videoIds])

  if (failed || !online) return null

  const hasIds = ids.length > 0
  if (!hasIds && !playlistId) return null

  const listParam = playlistId ? `&list=${playlistId}` : ''

  return (
    <section className="mb-8">
      {hasIds ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {ids.map((id, i) => (
            <div
              key={id}
              className={`aspect-video overflow-hidden rounded-lg bg-black/30 ring-1 ring-slate-700${i === 2 ? ' hidden sm:block' : ''}`}
            >
              {active === id ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1${listParam}`}
                  title={t('home.playVideo', 'Odtwórz wideo')}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onError={() => setFailed(true)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActive(id)}
                  className="group relative block w-full h-full"
                  aria-label={t('home.playVideo', 'Odtwórz wideo')}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white shadow-lg transition group-hover:bg-brand">
                      ▶
                    </span>
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video w-full max-w-[260px] overflow-hidden rounded-lg bg-black/30 ring-1 ring-slate-700">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0`}
            title={t('home.playVideo', 'Odtwórz wideo')}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </section>
  )
}
