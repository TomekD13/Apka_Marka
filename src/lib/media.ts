// Pliki spoza repo (nagrania public/audio/, grafiki public/media/ - oba w .gitignore) leza
// lokalnie i na serwerze. Strona glowna i dev biora je z wlasnego adresu, wersja testowa
// na GitHub Pages - ze strony glownej.
export const MAIN_SITE = 'https://jestnadzieja.adwent.pl/'

export function mediaUrl(src: string): string {
  const base = import.meta.env.BASE_URL
  return (import.meta.env.DEV || base === '/' ? base : MAIN_SITE) + src
}
