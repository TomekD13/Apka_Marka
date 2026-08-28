import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContext = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const KEY = 'zywe-slowo:theme'
const Ctx = createContext<ThemeContext | null>(null)

function initialTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Brak dostepu do pamieci nie blokuje zmiany wygladu.
    }
  }, [theme])

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const value = useContext(Ctx)
  if (!value) throw new Error('useTheme poza ThemeProvider')
  return value
}
