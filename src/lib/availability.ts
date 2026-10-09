// Materialy z data (Czlowiek Nadziei) otwieraja sie dopiero tego dnia - jeden dziennie,
// jak czytanki 40 dni. Data liczona w czasie lokalnym czytelnika, wiec material
// otwiera sie o polnocy u niego, a nie wedlug strefy serwera.

/** Dzisiejsza data jako RRRR-MM-DD w czasie lokalnym. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Bez daty = dostepny zawsze. Z data = od tego dnia wlacznie. */
export function isAvailable(date?: string, now = new Date()): boolean {
  return !date || date <= todayIso(now)
}

/** Material z flaga `open` jest dostepny od razu, reszta od swojej daty. */
export function isOpen(entry: { date?: string; open?: boolean }, now = new Date()): boolean {
  return Boolean(entry.open) || isAvailable(entry.date, now)
}
