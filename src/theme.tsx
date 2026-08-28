import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
export type FontSet = 'space' | 'nunito' | 'outfit' | 'sora'

type ThemeContext = {
  theme: Theme
  setTheme: (theme: Theme) => void
  fontSet: FontSet
  setFontSet: (fontSet: FontSet) => void
}

const KEY = 'zywe-slowo:theme'
const FONT_KEY = 'zywe-slowo:font-set'
const Ctx = createContext<ThemeContext | null>(null)

function initialTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function initialFontSet(): FontSet {
  try {
    const saved = localStorage.getItem(FONT_KEY)
    return saved === 'nunito' || saved === 'outfit' || saved === 'sora' ? saved : 'space'
  } catch {
    return 'space'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [fontSet, setFontSet] = useState<FontSet>(initialFontSet)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Brak dostepu do pamieci nie blokuje zmiany wygladu.
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.fontSet = fontSet
    try {
      localStorage.setItem(FONT_KEY, fontSet)
    } catch {
      // Brak dostepu do pamieci nie blokuje zmiany czcionki.
    }
  }, [fontSet])

  return <Ctx.Provider value={{ theme, setTheme, fontSet, setFontSet }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const value = useContext(Ctx)
  if (!value) throw new Error('useTheme poza ThemeProvider')
  return value
}
