import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { loadIndex } from '../content'
import { FeaturedVideo } from '../components/FeaturedVideo'
import { StudyCard } from '../components/StudyCard'
import { ContactForm } from '../components/ContactForm'
import { MenuBar, type Accent } from '../components/MenuBar'
import { SabbathSchoolBar } from '../components/SabbathSchoolBar'
import { SongFinder } from './Songs'
import { PrayerJournal } from '../components/PrayerJournal'
import { Pray40List } from './Pray40'
import { EduList } from './Edu'
import { NotesList } from './Notes'
import { BibleFinder } from '../components/BibleFinder'
import type { IndexFile } from '../types'

// Kolor przypisany serii - ten sam porzadek co wczesniej, zeby serie zostaly rozpoznawalne.
const SERIES_ACCENTS: Accent[] = ['sky', 'emerald', 'amber', 'violet', 'rose']

/** Serie tematow - kazda zwija sie osobno, zeby menu zostalo krotkie. */
function StudySeries({ idx }: { idx: IndexFile }) {
  const { t } = useI18n()
  const series = [...idx.series].sort((a, b) => a.order - b.order)
  const known = new Set(series.map((s) => s.id))
  const orphans = idx.studies.filter((s) => !s.seriesId || !known.has(s.seriesId))

  return (
    <div className="space-y-2">
      {series.map((s, i) => {
        const list = idx.studies
          .filter((st) => st.seriesId === s.id)
          .sort((a, b) => a.order - b.order)
        if (list.length === 0) return null
        return (
          <MenuBar
            key={s.id}
            id={`serie-${s.id}`}
            title={s.title}
            badge={`${list.length} ${t('home.topicsCount', 'tematów')}`}
            accent={SERIES_ACCENTS[i % SERIES_ACCENTS.length]}
          >
            <div className="space-y-1.5">
              {list.map((st) => (
                <StudyCard key={st.id} study={st} />
              ))}
            </div>
          </MenuBar>
        )
      })}

      {orphans.length > 0 && (
        <MenuBar
          id="serie-inne"
          title={t('home.topic', 'Różne tematy biblijne')}
          badge={`${orphans.length} ${t('home.topicsCount', 'tematów')}`}
          accent="slate"
        >
          <div className="space-y-1.5">
            {orphans.map((st) => (
              <StudyCard key={st.id} study={st} />
            ))}
          </div>
        </MenuBar>
      )}
    </div>
  )
}

export function Home() {
  const { lang, t } = useI18n()
  const [idx, setIdx] = useState<IndexFile | null>(null)

  useEffect(() => {
    setIdx(null)
    loadIndex(lang).then(setIdx).catch(() => setIdx(null))
  }, [lang])

  const yt = idx?.featured?.youtube

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-2xl shadow-lg">
        <img
          src={`${import.meta.env.BASE_URL}jestnadzieja-1280.png`}
          srcSet={`${import.meta.env.BASE_URL}jestnadzieja-1280.png 1280w, ${import.meta.env.BASE_URL}jestnadzieja-2560.png 2560w`}
          sizes="(max-width: 768px) 100vw, 768px"
          alt="#JestNadzieja"
          className="block w-full"
        />
      </div>

      <FeaturedVideo playlistId={yt?.playlistId} videoIds={yt?.videoIds} />

      <nav className="space-y-3">
        {/* Biblia stoi pierwsza - to po nia czytelnik siega najczesciej. */}
        <MenuBar
          id="biblia"
          icon="📕"
          accent="emerald"
          title={t('bible.title', 'Biblia')}
          desc={t('bible.desc', 'Cały tekst Pisma – księga, rozdział, werset, wyszukiwanie i zakładki.')}
        >
          <BibleFinder />
        </MenuBar>

        <MenuBar
          id="poznaj-boga"
          icon="📖"
          accent="sky"
          title={t('home.bars.studies', 'Poznaj Boga i Biblię')}
          desc={t('home.bars.studiesDesc', 'Najważniejsze tematy biblijne')}
          badge={idx ? `${idx.studies.length} ${t('home.topicsCount', 'tematów')}` : undefined}
        >
          {idx ? <StudySeries idx={idx} /> : <p className="text-slate-400">{t('common.loading', '…')}</p>}
        </MenuBar>

        <MenuBar
          id="jest-nadzieja"
          accent="hope"
          logo={`${import.meta.env.BASE_URL}jestnadzieja-logo.png`}
          title={t('home.bars.hope', '#JestNadzieja')}
          desc={t('home.bars.hopeDesc', 'Wspólna modlitwa i materiały do dzielenia się nadzieją.')}
        >
          <div className="space-y-2">
            <MenuBar
              id="hope-40"
              title={t('home.bars.pray40', '40 dni modlitwy')}
              desc={t('pray40.desc', '40 biblijnych historii nadziei – w wersji krótkiej i pełnej.')}
              accent="hope"
            >
              <Pray40List limit={8} />
            </MenuBar>
            <MenuBar
              id="hope-edu"
              title={t('home.bars.edu', 'Materiały edukacyjne')}
              desc={t('edu.desc', 'Krótkie szkolenia o człowieku i wierze – w wersji krótkiej i pełnej.')}
              accent="hope"
            >
              <EduList limit={8} />
            </MenuBar>
          </div>
        </MenuBar>

        <SabbathSchoolBar />

        <MenuBar
          id="spiewnik"
          icon="🎵"
          accent="amber"
          title={t('songs.title', 'Śpiewnik')}
          desc={t('songs.desc', 'Pieśni ze śpiewnika „Śpiewajmy Panu”.')}
        >
          <SongFinder collection="hymnal" showAllLink />
        </MenuBar>

        <MenuBar
          id="piesni-mlodziezowe"
          icon="🎸"
          accent="violet"
          title={t('youth.title', 'Pieśni młodzieżowe')}
          desc={t('youth.desc', 'Z Campów i zjazdów młodzieżowych')}
        >
          <SongFinder collection="youth" showAllLink />
        </MenuBar>

        <MenuBar
          icon="▶"
          accent="rose"
          title={t('worship.title', 'Pieśni z muzyką i tekstem')}
          desc={t('worship.desc', 'Kanał „Uwielbienie z Tekstem” w YouTube.')}
          href="https://www.youtube.com/@UwielbieniezTekstem"
        />

        <MenuBar
          id="modlitwy"
          icon="🙏"
          accent="emerald"
          title={t('prayers.title', 'Dziennik modlitw')}
          desc={t('prayers.desc', 'Twoja lista modlitewna')}
        >
          <PrayerJournal limit={8} />
          <div className="mt-3">
            <Link
              to={`/${lang}/modlitwy`}
              className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-300"
            >
              {t('prayers.manage', 'Pełny dziennik i kopia zapasowa')}
            </Link>
          </div>
        </MenuBar>

        <MenuBar
          id="notatki"
          icon="✎"
          accent="rose"
          title={t('notes.title', 'Moje notatki biblijne')}
          desc={t('notes.desc', 'Twoje zapiski - zostają w tej przeglądarce.')}
        >
          <NotesList limit={5} />
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to={`/${lang}/notatki/nowa`}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-light"
            >
              + {t('notes.new', 'Nowa notatka')}
            </Link>
            <Link
              to={`/${lang}/notatki`}
              className="rounded-lg border border-slate-500/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-300"
            >
              {t('notes.manage', 'Wszystkie notatki i kopia zapasowa')}
            </Link>
          </div>
        </MenuBar>

        <MenuBar
          icon="🧠"
          accent="amber"
          title={t('flashcards.cta', 'Ucz się wersetów na pamięć')}
          desc={t('flashcards.ctaDesc', '50 najważniejszych tekstów Biblii - fiszki z powtórkami.')}
          to={`/${lang}/fiszki`}
        />

        <MenuBar
          icon="📖"
          accent="sky"
          title={t('occasions.cta', 'Teksty na różną okazję')}
          desc={t('occasions.ctaDesc', 'Wersety na smutek, radość, lęk, chorobę i wiele innych - gotowe do wysłania.')}
          to={`/${lang}/okazje`}
        />
      </nav>

      <ContactForm />

      <p className="no-print mt-8 text-center text-xs text-slate-400">
        <a href={t('contact.whoUrl', 'https://adwent.pl')} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light">
          {t('contact.who', 'Kim jesteśmy?')}
        </a>
        <span className="mx-2" aria-hidden>·</span>
        <a href={t('about.publisherUrl', 'https://www.facebook.com/pastormarek')} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light">
          {t('about.publisher')}
        </a>
      </p>
    </div>
  )
}
