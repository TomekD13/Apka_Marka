import { createBrowserRouter, Outlet, useParams } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { I18nProvider } from './i18n'
import { PlaceProvider } from './place'
import { Header } from './components/Header'
import { AddNoteFab } from './components/AddNoteFab'
import { LangGate } from './pages/LangGate'
import { Home } from './pages/Home'
import { CategoryPage } from './pages/CategoryPage'
import { SearchPage } from './pages/SearchPage'
import { Reader } from './pages/Reader'
import { About } from './pages/About'
import { Flashcards } from './pages/Flashcards'
import { Occasions } from './pages/Occasions'
import { SongsPage, SongPage } from './pages/Songs'
import { Notes, NoteEdit } from './pages/Notes'
import { Prayers } from './pages/Prayers'
import { Pray40, Pray40DayPage } from './pages/Pray40'
import { Edu, EduItemPage } from './pages/Edu'
import { BibleBookmarksPage, BibleChapterPage, BiblePage } from './pages/Bible'
import { BibleSearchPage } from './pages/BibleSearch'
import { BibleModulesPage } from './pages/BibleModules'

registerSW({ immediate: true })

function LangLayout() {
  const { lang = 'pl' } = useParams()
  return (
    <I18nProvider lang={lang}>
      <PlaceProvider>
        <div className="min-h-full flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
            <Outlet />
          </main>
          <AddNoteFab />
        </div>
      </PlaceProvider>
    </I18nProvider>
  )
}

export const router = createBrowserRouter(
  [
    { path: '/', element: <LangGate /> },
    {
      path: '/:lang',
      element: <LangLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: 'c/:category', element: <CategoryPage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 's/:id', element: <Reader /> },
        { path: 'about', element: <About /> },
        { path: 'biblia', element: <BiblePage /> },
        { path: 'biblia/szukaj', element: <BibleSearchPage /> },
        { path: 'biblia/zakladki', element: <BibleBookmarksPage /> },
        { path: 'biblia/przeklady', element: <BibleModulesPage /> },
        { path: 'biblia/:book/:chapter', element: <BibleChapterPage /> },
        { path: 'fiszki', element: <Flashcards /> },
        { path: 'okazje', element: <Occasions /> },
        { path: 'spiewnik', element: <SongsPage collection="hymnal" /> },
        { path: 'spiewnik/:nr', element: <SongPage collection="hymnal" /> },
        { path: 'piesni-mlodziezowe', element: <SongsPage collection="youth" /> },
        { path: 'piesni-mlodziezowe/:nr', element: <SongPage collection="youth" /> },
        { path: 'modlitwy', element: <Prayers /> },
        { path: '40-dni', element: <Pray40 /> },
        { path: '40-dni/:day', element: <Pray40DayPage /> },
        { path: 'edukacja', element: <Edu /> },
        { path: 'edukacja/:nr', element: <EduItemPage /> },
        { path: 'notatki', element: <Notes /> },
        { path: 'notatki/:id', element: <NoteEdit /> }
      ]
    }
  ],
  { basename: import.meta.env.BASE_URL }
)
