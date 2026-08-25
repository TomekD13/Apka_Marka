// Odhaczenie „przeczytane" - czytanki „40 dni" i materialy edukacyjne.
// Jak notatki, zakladki i ulubione: zostaje w tej przegladarce, nic nie wychodzi
// na serwer. Klucz to `rodzaj:numer`, wartosc to data odhaczenia (przyda sie,
// gdy dojdzie synchronizacja konta).

const KEY = 'zywe-slowo:read:v1'

export type ReadKind = 'pray40' | 'edu'

type Marks = Record<string, string>

function read(): Marks {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : {}
    return data && typeof data === 'object' ? (data as Marks) : {}
  } catch {
    return {}
  }
}

function write(marks: Marks): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(marks))
    return true
  } catch {
    return false // prywatne okno albo brak miejsca
  }
}

const mark = (kind: ReadKind, id: number | string) => `${kind}:${id}`

export function isRead(kind: ReadKind, id: number | string): boolean {
  return Boolean(read()[mark(kind, id)])
}

/** Ustawia stan i zwraca to, co faktycznie zapisano. */
export function setRead(kind: ReadKind, id: number | string, value: boolean): boolean {
  const marks = read()
  if (value) marks[mark(kind, id)] = new Date().toISOString()
  else delete marks[mark(kind, id)]
  return write(marks) ? value : !value
}

/** Odhaczone pozycje jednego rodzaju - jednym odczytem, dla calej listy. */
export function listRead(kind: ReadKind): Set<string> {
  const prefix = `${kind}:`
  const out = new Set<string>()
  for (const k of Object.keys(read())) if (k.startsWith(prefix)) out.add(k.slice(prefix.length))
  return out
}
