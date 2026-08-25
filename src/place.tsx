import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Etykieta miejsca, w ktorym akurat jest czytelnik (tytul studium, piesni...).
// Uzywa jej plywajacy przycisk notatki, zeby zapisac, przy czym notatka powstala.
const Ctx = createContext<{ label: string; setLabel: (v: string) => void } | null>(null)

export function PlaceProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState('')
  return <Ctx.Provider value={{ label, setLabel }}>{children}</Ctx.Provider>
}

export function usePlace() {
  return useContext(Ctx)?.label ?? ''
}

/** Ustawia etykiete na czas, gdy dany ekran jest widoczny. */
export function useSetPlace(label: string | undefined) {
  const ctx = useContext(Ctx)
  useEffect(() => {
    if (!ctx) return
    ctx.setLabel(label || '')
    return () => ctx.setLabel('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label])
}
