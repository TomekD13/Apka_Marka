import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider, useI18n } from './i18n'

const loadUi = vi.fn(async (lang: string) => {
  if (lang !== 'pl') throw new Error('404')
  return { edu: { title: 'Człowiek Nadziei' } }
})
vi.mock('./content', () => ({
  loadLangs: async () => ({ languages: [{ code: 'pl', name: 'Polski', defaultTranslation: 'BE' }], default: 'pl' }),
  loadUi: (lang: string) => loadUi(lang),
}))

function Layout() {
  const { lang = 'pl' } = useParams()
  return (
    <I18nProvider lang={lang} sections={['biblia', 'edukacja']}>
      <Outlet />
    </I18nProvider>
  )
}

function Page() {
  const { lang, t } = useI18n()
  const { pathname } = useLocation()
  return <p>{`${lang} ${pathname} ${t('edu.title')}`}</p>
}

function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:lang" element={<Layout />}>
          <Route path="edukacja" element={<Page />} />
          <Route path="edukacja/:nr" element={<Page />} />
          <Route path="*" element={<p>nieznany adres</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('adres bez kodu jezyka', () => {
  it('/edukacja otwiera dzial po polsku', async () => {
    open('/edukacja')
    expect(await screen.findByText('pl /pl/edukacja Człowiek Nadziei')).toBeInTheDocument()
  })
  it('/edukacja/edukacja (link z menu na zlym adresie) wraca do dzialu', async () => {
    open('/edukacja/edukacja')
    expect(await screen.findByText('pl /pl/edukacja Człowiek Nadziei')).toBeInTheDocument()
  })
  it('/edukacja/3 otwiera material 3', async () => {
    open('/edukacja/3')
    expect(await screen.findByText('pl /pl/edukacja/3 Człowiek Nadziei')).toBeInTheDocument()
  })
  it('poprawny adres zostaje bez zmian', async () => {
    open('/pl/edukacja')
    expect(await screen.findByText('pl /pl/edukacja Człowiek Nadziei')).toBeInTheDocument()
  })
})
