// Lekka bramka do konta - bez Firebase. SDK (lib/account.ts) laduje sie leniwie:
// pobiera go tylko ktos, kto wchodzi w logowanie albo juz jest zalogowany.

import { BETA } from './beta'

/**
 * Konta sa na razie tylko w wydaniu testowym (/beta/) i w dev. Dzieki temu
 * wydanie strony glownej z tego samego repo nie wypuszcza logowania przed czasem.
 */
export const ACCOUNTS_ENABLED = BETA

const ON = 'zywe-slowo:sync:on'

export function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(ON) === '1'
  } catch {
    return false
  }
}

export function markSignedIn(on: boolean): void {
  try {
    if (on) localStorage.setItem(ON, '1')
    else localStorage.removeItem(ON)
  } catch {
    /* prywatne okno - przy nastepnym wejsciu SDK zaladuje sie dopiero na stronie konta */
  }
}

let mod: Promise<typeof import('./account')> | null = null
export function loadAccount() {
  if (!mod) mod = import('./account').then((m) => (m.start(), m))
  return mod
}

/** Przy starcie aplikacji: kto byl zalogowany, temu od razu ruszamy synchronizacje. */
export function bootAccount(): void {
  if (ACCOUNTS_ENABLED && wasSignedIn()) void loadAccount().catch(() => {})
}
