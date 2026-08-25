// Wspolny spod dla danych, ktore zostaja na urzadzeniu czytelnika (notatki, modlitwy).
// Zadnego konta ani backendu - jeden klucz w localStorage na kazda liste.

export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as T[]) : []
  } catch {
    // prywatne okno, wylaczone dane witryn, uszkodzony wpis - aplikacja ma dzialac dalej
    return []
  }
}

/** false = przegladarka nie pozwolila zapisac (tryb prywatny, brak miejsca). */
export function writeList<T>(key: string, items: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export function newId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${rnd}`
}

/** Kopia zapasowa do pliku - jedyna droga, zeby dane przetrwaly czyszczenie przegladarki. */
export function exportJson(kind: string, items: unknown[]): string {
  return JSON.stringify({ app: 'zywe-slowo', kind, [kind]: items }, null, 2)
}

/** Wyciaga liste z kopii zapasowej niezaleznie od tego, czy to goła tablica, czy koperta. */
export function parseBackup(json: string, kind: string): unknown[] {
  const parsed = JSON.parse(json)
  const list = Array.isArray(parsed) ? parsed : parsed?.[kind] ?? parsed?.items
  if (!Array.isArray(list)) throw new Error('bad-format')
  return list
}
