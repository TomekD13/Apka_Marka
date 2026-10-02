// Sciezka z danych czytelnika (zrodlo notatki, kopia zapasowa, synchronizacja) trafia
// do <Link to>. Przepuszczamy tylko sciezki wewnatrz aplikacji - bez tego wczytana
// kopia z `javascript:...` albo obcym adresem dzialalaby po kliknieciu w „Zrodlo”.
export function safePath(p: unknown): string {
  if (typeof p !== 'string') return ''
  const inside = p.startsWith('/') && !p.startsWith('//') && !p.includes('\\')
  return inside && !/[\u0000-\u001f]/.test(p) ? p : ''
}
