// Wielkosc tekstu w modulach czytania (Biblia, studium, spiewnik, czytanki).
// Jedna wartosc na urzadzenie: czytelnik ustawia raz i ma tak samo wszedzie.
//
// Skala trafia do zmiennej CSS --reading-scale na <html>, a bierze ja stamtad
// klasa .reading (src/index.css). Dzieki temu powiekszenie nie przerysowuje
// drzewa Reacta i - co wazniejsze - rosnie sama tresc, a nie naglowek
// i nawigacja, ktore przy 175% nie zmiescilyby sie na telefonie.
//
// Zmieniaja ja dwie drogi: przyciski A- / A+ (components/FontScale.tsx)
// i szczypanie dwoma palcami (usePinchFontScale w tym samym pliku). Dlatego
// stan siedzi tutaj, w malym sklepiku z subskrypcja - inaczej po gescie
// przycisk pokazywalby staty procent.

const KEY = 'zs.fontScale'

/** Kroki przelacznika. 1 = wielkosc domyslna. */
export const STEPS = [0.9, 1, 1.15, 1.3, 1.5, 1.75]
export const DEFAULT_SCALE = 1
export const MIN_SCALE = STEPS[0]
export const MAX_SCALE = STEPS[STEPS.length - 1]

function fromStorage(): number {
  try {
    const raw = Number(localStorage.getItem(KEY))
    return STEPS.includes(raw) ? raw : DEFAULT_SCALE
  } catch {
    // prywatne okno albo zablokowane dane witryn - czytamy domyslna wielkosc
    return DEFAULT_SCALE
  }
}

let current = fromStorage()
const subs = new Set<() => void>()

export function getScale(): number {
  return current
}

export function subscribeScale(fn: () => void): () => void {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

export function clampScale(v: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, v))
}

/** Najblizszy krok - gest konczy sie na jednej z wartosci, ktore daja przyciski. */
export function nearestStep(v: number): number {
  return STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), STEPS[0])
}

function applyScale(scale: number) {
  document.documentElement.style.setProperty('--reading-scale', String(scale))
}

/** Podglad w trakcie gestu: plynnie, bez zapisu i bez przerysowania Reacta. */
export function previewScale(v: number) {
  applyScale(clampScale(v))
}

export function setScale(next: number) {
  current = clampScale(next)
  applyScale(current)
  try {
    localStorage.setItem(KEY, String(current))
  } catch {
    /* wybor zyje wtedy tylko do konca wizyty */
  }
  subs.forEach((fn) => fn())
}

/** Cofa podglad gestu do zapamietanej wartosci (gest przerwany). */
export function restoreScale() {
  applyScale(current)
}

/** Ustawia zapamietana skale na starcie - zanim czytelnik wejdzie na strone z przelacznikiem. */
export function initFontScale() {
  applyScale(current)
}
