export type Level = 'base' | 'extended' | 'advanced'
export type Category = 'basic_systematic' | 'basic_practical' | 'series' | 'topic'

export interface PassageRef { osis: string; ref: string }
export interface Question { id: string; text: string }
export interface OriginalForm { lang: string; text: string; translit?: string }

export interface PassageItem {
  type: 'passage'
  level: Level
  id: string
  passage: PassageRef[]
  comment: string
  questions: Question[]
}
export interface NoteItem {
  type: 'note'
  level: Level
  id: string
  noteType: 'syntax' | 'verb' | 'background' | 'textual' | 'term' | 'variant' | 'worship' | 'other'
  label: string
  content: string
  original?: OriginalForm[]
  questions?: Question[]
}
export type Item = PassageItem | NoteItem

export interface Section { id: string; heading: string; items: Item[] }

export interface Study {
  id: string
  lang: string
  title: string
  category: Category
  seriesId: string | null
  order: number
  summary: string
  minutes: { base: number; extended: number }
  tags: string[]
  sections: Section[]
  application: { text: string; challenge: string }
  meta?: Record<string, unknown>
}

export interface StudyEntry {
  id: string
  title: string
  category: Category
  seriesId: string | null
  order: number
  summary: string
  minutes: { base: number; extended: number }
  tags: string[]
  refs: string[]
}
export interface SeriesMeta { id: string; title: string; order: number }
export interface IndexFile {
  lang: string
  featured?: { youtube?: { playlistId?: string; videoIds?: string[] } }
  series: SeriesMeta[]
  studies: StudyEntry[]
}

export interface LangMeta { code: string; name: string; dir?: 'ltr' | 'rtl'; defaultTranslation: string; moduleSizeKB?: number; greeting?: string }
export interface LangsFile { languages: LangMeta[]; default: string }

export interface Bible { translation: string; name: string; lang: string; license: string; verses: Record<string, string> }

export interface OccasionVerse { osis: string; ref: string }
export interface OccasionCategory { id: string; name: string; icon?: string; verses: OccasionVerse[] }
export interface Occasions { lang: string; translation: string; title?: string; categories: OccasionCategory[] }

export interface FlashCard { id: string; ref: string; osis: string[] }
export interface FlashTheme { id: string; name: string; bonus?: boolean; cards: FlashCard[] }
export interface Flashcards { lang: string; translation: string; title?: string; quizletUrl?: string; anki?: boolean; themes: FlashTheme[] }

// ui.json - luźna struktura, dostęp przez ścieżkę kropkową
export type Ui = Record<string, any>

export interface SongStanza { n: number; text: string }
export interface Song {
  nr: number
  title: string
  key?: string
  author?: string
  section?: string
  stanzas: SongStanza[]
  refrain?: string
  /** jedna zwrotka bez numeracji w druku - render nie stawia przed nią numeru */
  single?: boolean
  /** mostek (pieśni młodzieżowe) */
  bridge?: string
  /** z którego śpiewnika obozowego wzięta (pieśni młodzieżowe) */
  from?: string
  /** numer w „Śpiewajmy Panu" - rozdział 41 (701-750) stoi w pieśniach młodzieżowych */
  hymnalNr?: number
}

/** Dwie kolekcje pieśni; każda ma własny plik treści, trasę i listę ulubionych. */
export type SongCollection = 'hymnal' | 'youth'
export interface SongsSource {
  name: string
  edition?: string
  publisher?: string
  copyright?: string
  note?: string
  /** numery przeniesione do pieśni młodzieżowych - żeby szukanie po numerze wskazało drogę */
  movedToYouth?: { from: number; to: number }
}
export interface SongsFile { lang: string; title?: string; source?: SongsSource; songs: Song[] }

/** Notatka użytkownika - żyje wyłącznie w przeglądarce (localStorage), nic nie wychodzi na serwer. */
export interface BibleNote {
  id: string
  title: string
  body: string
  ref?: string
  /** skąd notatka powstała - tytuł studium/pieśni i ścieżka powrotu */
  source?: { label: string; path: string }
  createdAt: string
  updatedAt: string
}

/** Pozycja dziennika modlitw - żyje wyłącznie w przeglądarce, jak notatki. */
export interface Prayer {
  id: string
  text: string
  answered: boolean
  /** komentarz do wysłuchanej modlitwy */
  answer?: string
  createdAt: string
  answeredAt?: string
}

/** Czytanki „40 dni modlitwy" (#JestNadzieja) - każdy dzień w dwóch wersjach. */
export type Pray40Version = 'short' | 'long'
export interface Pray40Section { heading?: string | null; paragraphs: string[] }
export interface Pray40DayEntry { day: number; title: string; ref: string; lead: string }
export interface Pray40Day extends Pray40DayEntry {
  questions: string[]
  note?: string
  versions: Partial<Record<Pray40Version, { sections: Pray40Section[] }>>
}
export interface Pray40Index { lang: string; title?: string; series?: string; days: Pray40DayEntry[] }

/** „Materiały edukacyjne" (#JestNadzieja) - każde szkolenie w dwóch wersjach. */
export interface EduQuote { text: string; ref: string }
export interface EduBody {
  sections: Pray40Section[]
  quote?: EduQuote | null
  questions: string[]
}
export interface EduEntry { nr: number; title: string; ref: string }
export interface EduItem extends EduEntry {
  note?: string
  versions: Partial<Record<'short' | 'long', EduBody>>
}
export interface EduIndex { lang: string; title?: string; series?: string; items: EduEntry[] }

// --- Czytnik Biblii (`/pl/biblia`) ------------------------------------------
// Pelny przeklad lezy w `content/{lang}/bible/{KOD}/`: `index.json` (spis ksiag)
// i jeden plik na ksiege. Ten sam ksztalt maja moduly doinstalowane przez
// czytelnika - tyle ze trzymane w IndexedDB, nie na serwerze.

export interface BibleBookMeta {
  osis: string
  name: string
  /** skrot uzywany w odnosnikach (Rdz, 1 Kor, Ap) */
  abbr: string
  testament: 'ot' | 'nt'
  /** liczba wersetow w kazdym rozdziale - selektor dziala bez pobierania tekstu */
  chapters: number[]
}
export interface BibleIndex {
  translation: string
  name: string
  lang: string
  license: string
  source?: string
  books: BibleBookMeta[]
}
/** Tekst jednej ksiegi: chapters[rozdzial-1][werset-1]; pusty string = wersetu nie ma. */
export interface BibleBookText { osis: string; chapters: string[][] }

/** Spis przekladow lezacych na serwerze (`content/{lang}/bible/translations.json`). */
export interface BibleTranslationEntry {
  code: string
  name: string
  license: string
  sizeKB?: number
  source?: string
}
export interface BibleTranslations {
  lang: string
  default: string
  translations: BibleTranslationEntry[]
}

/** Modul wczytany z pliku albo z adresu - jeden JSON z indeksem i tekstem. */
export interface BibleModuleFile {
  index: BibleIndex
  books: Record<string, string[][]>
}

/** Zakladka czytelnika - jak notatki, zyje tylko w tej przegladarce. */
export interface BibleBookmark {
  id: string
  translation: string
  osis: string
  chapter: number
  verse: number
  /** odnosnik w formie do pokazania, np. „J 3,16" */
  ref: string
  /** tekst wersetu w chwili dodania - zeby lista czytala sie bez pobierania ksiegi */
  text: string
  createdAt: string
}

/** Zrodlo, z ktorego przeklad sciaga sie wprost z cudzego serwera (`bible/sources.json`). */
export interface BibleSource {
  code: string
  name: string
  license: string
  /** kto go serwuje - pokazywane czytelnikowi */
  provider: string
  /** 'getbible' = api.getbible.net v2, 'module' = nasz format pod adresem */
  kind: 'getbible' | 'module'
  url: string
  sizeKB?: number
}
/** Jeden przeklad w katalogu - nazwa i bezposredni adres pliku. */
export interface BibleCatalogItem {
  code: string
  abbr: string
  name: string
  url: string
  /** czy to caly kanon, czy sam Nowy Testament albo Psalmy */
  complete: boolean
  sizeKB?: number
}
/** Strona, z ktorej modul pobiera sie recznie (jej serwer nie oddaje CORS-a). */
export interface BibleCatalog {
  name: string
  url: string
  /** formaty, w ktorych wydaje moduly - czytelnik ma wiedziec, czego szukac */
  formats: string
  note?: string
  /** spis przekladow zbudowany przez tools/fetch_ph4_catalog.py */
  items?: BibleCatalogItem[]
}
export interface BibleSources {
  lang: string
  note?: string
  sources: BibleSource[]
  catalogs?: BibleCatalog[]
}
