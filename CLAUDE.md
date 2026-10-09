# CLAUDE.md – aplikacja „Żywe Słowo" (Aplikacja-nowa)

Reguły tej aplikacji. **Zastępują** zasady z `../CLAUDE.md` wszędzie, gdzie się rozchodzą:
tamten plik opisuje starą `../Aplikacja/` i treść kursu, ten opisuje aplikację, która
powstaje teraz (decyzja autora 2026-08-25: „to jest nowa aplikacja z nowymi regułami").

Opis architektury i wszystkich narzędzi: `README.md` w tym katalogu.
Co zostało otwarte: `_HANDOFF_2026-08-25.md`.

## Komendy

```
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b + vite + PWA + prune + gen_og  (jedyna bramka jakości)
npm run preview
bash deploy.sh     # build + publikacja na gh-pages repo pastormarek/aplikacja
bash deploy-ftp.sh # build + wysylka dist/ na jestnadzieja.adwent.pl (adres glowny, FTP)
bash deploy-beta.sh# to samo pod /beta/ - wydanie testowe, glownej strony nie rusza
```

Nie ma lintera ani frameworka testowego. `npm run build` musi przechodzić czysto.

## Pipeline treści (`tools/`, Python)

```
python tools/extract_spiewnik.py    # PDF -> songs.json (1-700) + Spiewnik/_701-750.json
python tools/extract_youth.py       # śpiewniki obozowe + rozdział 41 -> songs-youth.json
python tools/extract_pray40.py      # one27/Teksty{Short,Long} -> pray40/
python tools/extract_edu.py         # one27/Szkolenia{Short,Long} -> edu/  (--nr 1-7 = tylko te)
python tools/build_edu_audio.py 1 <wzorzec.mp3>  # nagranie -> public/audio/edu/001.mp3 (48 kb/s mono, -16 LUFS)
python tools/extract_groups.py      # one27/GrupyBiblijne -> groups/ (Grupy Nadziei)
python tools/build_prayer_texts.py pl  # teksty do modlitwy (United Prayer) -> prayer-texts.json
python tools/build_bible_full.py    # pełny przekład -> bible/{KOD}/
python tools/build_bible_be.py pl   # wersety do studiów (Biblia Ekumeniczna)
python tools/build_index.py pl      # lista studiów w index.json
```

**Kolejność ma znaczenie:** `extract_spiewnik.py` przed `extract_youth.py` – ten drugi czyta
plik pośredni `Spiewnik/_701-750.json`, żeby dołożyć rozdział 41 do pieśni młodzieżowych.
Tak samo `build_prayer_texts.py` przed `build_bible_be.py` – ten drugi zbiera odnośniki
z `prayer-texts.json` i dopiero wtedy dokłada do `bibles/BE.json` teksty wersetów.

Na Windowsie dawaj `PYTHONIOENCODING=utf-8`, inaczej konsola psuje polskie znaki.

**Nagrania Człowieka Nadziei (2026-10-09).** `public/audio/` jest w `.gitignore` (repo publiczne,
setki plików po kilka MB): nagrania leżą lokalnie i na serwerze, a `deploy-ftp.sh` wysyła je z `dist/`.
Po `build_edu_audio.py` uruchom `extract_edu.py` – dopisze pole `audio` (ścieżka z sumą `?v=`, długość,
rozmiar). Odtwarzacz `components/AudioPlayer.tsx` gra **tylko strumieniowo** (decyzja autora):
`preload="none"`, service worker nie cache'uje `/audio/`, `.htaccess` daje `Cache-Control: no-store`.
Wersja testowa na GitHub Pages bierze nagrania ze strony głównej. Flaga `open` w JSON-ie
(`OPEN_NOW` w `extract_edu.py`) otwiera materiał przed jego datą – tak jest z odcinkiem 1.

## Twarde reguły

**Treść**
- **Pismo tylko z plików przekładów.** Kod nie zawiera ani jednego wersetu, a wersetów nie
  wolno przepisywać z pamięci. Studium ma wyłącznie odnośnik (`osis` + `ref`).
- **Nie regeneruj studiów PL przez `md2json.py`** i **nie uruchamiaj `*_refs_from_pl.py`** –
  JSON-y są dalej niż źródłowe `.md`, a polskie `ref` są w numeracji Biblii Ekumenicznej.
  Poprawki nanoś na JSON, a na `.md` równolegle.
- **Pisownia „szabat"**, nigdy „sabat".
- **Bez pauzy (em dash).** W polskim składzie stoi półpauza `–`. Ekstraktory czyszczą to same;
  w regexach pauzę zapisuj jako `\u2014`, żeby czyszczenie tekstu nie rozwaliło wzorca.
- **Tytuły pieśni**: wielka litera tylko na początku i w nazwach własnych. Zaimki odnoszące
  się do Boga idą małą literą. Lista nazw własnych: `PROPER` w `tools/extract_youth.py`.
- **Akordy** stoją na końcu swojej linijki, za `//` – nigdy nad wierszem.
- Nie zmyślać cytatów, nazwisk, ID (np. YouTube `videoIds`), bibliografii ani form
  greckich/hebrajskich.

**Kod**
- **Każdy napis UI z `ui.json`.** W kodzie tylko `t('klucz', 'tekst zapasowy')`.
- Nowy język = nowy folder `content/{lang}/` + wpis w `langs.json`. Zero zmian w kodzie.
- Komentarze w kodzie po polsku, bez ogonków (tak jak reszta plików); napisy dla czytelnika
  z pełną polszczyzną.

**Prywatność (nowa reguła, zastępuje „bez kont, profili, zakładek, notatek")**
- Bez analityki śledzącej i bez profilowania – nigdy.
- Notatki, dziennik modlitw, ulubione i zakładki żyją w `localStorage` tego urządzenia.
- **Konto jest opcjonalne** i służy wyłącznie synchronizacji rzeczy czytelnika między jego
  urządzeniami. Bez konta aplikacja działa w całości.
- Adres e-mail wyłącznie technicznie: do logowania. Żadnych list wysyłkowych.
- Szczegóły i stan decyzji: `_PROPOZYCJA_konta-i-powiadomienia.md`.

**Teologia ADS** – bez zmian, szczegóły w `../Materiały/_BRIEF_dla_autorow.md`: oś to wielki
bój; grzech relacyjnie; bóstwo Jezusa i Ducha; sola scriptura; krytyka nauczania i instytucji,
nigdy ludzi; dar proroctwa i EGW bez nacisku, fundamentem Biblia.

## Beta (`/beta/`) – co siedzi za przełącznikiem

> **2026-10-04: beta zdjęta z serwera** (decyzja autora). Wersja testowa = GitHub Pages
> https://tomekd13.github.io/Apka_Marka/ – buduje się sama po każdym `git push` do `main`.
> `deploy-beta.sh` odmawia pracy; `/beta/` na serwerze przekierowuje 301 na `/pl/`.

> **2026-10-02: beta przeniesiona na stronę główną** (decyzja autora). `BETA = true`
> w `src/lib/beta.ts` – wszystko z tabeli niżej działa już na https://jestnadzieja.adwent.pl/.
> Opis zostaje, bo mówi, gdzie co leży. Następna nowość „tylko na betę” = przywróć warunek
> z komentarza w `beta.ts`. Gałęzie `!BETA` w kodzie są teraz martwe – do sprzątnięcia przy okazji.

**Stan na 2026-10-02.** Decyzja autora: nowe funkcje powstają **najpierw tylko na becie**
(https://jestnadzieja.adwent.pl/beta/). Na GitHubie beta **nie jest osobną gałęzią** –
kod leży w `main`, a wyłącza go flaga:

```ts
// src/lib/beta.ts
export const BETA = import.meta.env.DEV || import.meta.env.BASE_URL === '/beta/'
```

`bash deploy-beta.sh` buduje z `VITE_BASE=/beta/`, więc flaga jest włączona.
`bash deploy-ftp.sh` buduje z `/`, więc wydanie strony głównej z tego samego drzewa
**nie pokazuje** niczego z listy niżej. Commity z takimi zmianami mają w tytule `[BETA]`.

Za flagą (`BETA` albo `ACCOUNTS_ENABLED`, które jest jej aliasem):

| funkcja | pliki |
|---|---|
| konto: logowanie Google albo linkiem na e-mail, synchronizacja, usuwanie konta | `lib/account.ts` (Firebase, ładowany leniwie), `lib/accountGate.ts`, `lib/firebaseConfig.ts`, `pages/Account.tsx` |
| synchronizacja list z `localStorage` (scalanie per pozycja, nagrobki usuniętych) | `lib/syncMeta.ts`, wywołanie w `lib/localStore.ts` → `writeList()` |
| plany czytania (10 planów, przeliczanie tempa) i pasek planu przy rozdziale | `lib/readingPlans.ts`, `pages/ReadingPlans.tsx`, `components/PlanBar.tsx`, `content/pl/reading-plans.json` |
| przeczytane i ulubione materiały, strona `/ulubione` | `lib/progress.ts`, `lib/favMaterials.ts`, `components/MaterialActions.tsx`, `pages/Favorites.tsx` |
| pozycje w menu: Plany czytania, Ulubione, Twoje konto | `components/AppNavigation.tsx` |

**Co jedzie do chmury** (`isSyncedKey` w `lib/syncMeta.ts`): notatki, dziennik modlitw,
zakładki w Biblii, ulubione pieśni, ulubione materiały, plany czytania, przeczytane.
Nowa lista danych czytelnika = dopisz jej klucz tam i zapisuj ją przez `writeList()`;
bezpośredni `localStorage.setItem` omija synchronizację.

**Bezpieczeństwo (test 2026-10-02):**
- Na wspólnym urządzeniu dane jednego konta nie mogą wejść na drugie: `account.ts` pamięta
  uid ostatniego konta (`zywe-slowo:sync:uid`) i przy innym czyści lokalne listy
  (`clearSyncedLocal`). Wylogowanie pyta, czy zostawić dane na urządzeniu.
- Ścieżki z danych czytelnika idą do `<Link>` tylko przez `safePath()` (`lib/safePath.ts`).
- Reguły Firestore wpuszczają tylko znane listy (`users/{uid}/lists/{lista}`, pola `items`,
  `d`, `updated`). **Nowa lista w `isSyncedKey` = dopisz jej nazwę w regułach w konsoli**,
  inaczej zapis będzie odrzucany.
- Panel `/stat/` (źródło: `../Aplikacja-nowa/public/stat/`, wysyłany osobno przez FTP):
  limit prób liczony po samym IP, ciasteczko sesji `HttpOnly; SameSite=Strict`.
- Otwarte: CSP (sprawdzić z logowaniem Google i YouTube), ograniczenie klucza API do domeny,
  App Check.

**Wyszukiwarki (2026-10-04):** `tools/gen_seo.mjs` (postbuild, tylko base `/`) tworzy
`dist/<ścieżka>/index.html` dla działów, 40 dni, Człowieka Nadziei, Grup Nadziei, lekcji
i pieśni – z własnym tytułem, opisem, adresem kanonicznym i początkiem tekstu – oraz
`sitemap.xml` i `robots.txt`. Wcześniej każda podstrona miała kanoniczny adres strony
głównej i Google traktował ją jak duplikat. Nowy dział = dopisz go w `gen_seo.mjs`.

**Firebase:** projekt `jest-nadzieja`, Firestore `europe-central2` (Warszawa), dane
w `users/{uid}/lists/{lista}`, reguły wpuszczają wyłącznie właściciela. Konsolą zarządza
Marek. Dozwolona domena: `jestnadzieja.adwent.pl`.

**Zanim beta pójdzie na stronę główną** (stan 2026-10-02: poszła, punkty 1–2 zostają otwarte):
1. Plan **Blaze** w Firebase – na darmowym planie Spark idzie najwyżej **5 maili z linkiem
   logowania dziennie** (https://firebase.google.com/docs/auth/limits).
2. Przegląd kolejności planu „Biblia chronologicznie” (`reading-plans.json`) – to porządek
   uproszczony, nie z konkretnego źródła.
3. Zmiana flagi: `BETA = true` (albo usunięcie warunków) i jedno wydanie `deploy-ftp.sh`.
   Dotychczasowe oznaczenia „przeczytane” przeniosą się same (`read:v1` → `read:v2`).

## Publikacja

- Repozytorium: **`pastormarek/aplikacja`, publiczne** (decyzja autora 2026-08-25: podgląd
  i możliwość przesłania linku dalej). Historia zaczyna się od jednego commitu – wcześniejsze
  commity zawierały produkcyjne PDF-y śpiewnika i zostały nadpisane przed upublicznieniem.
- **Źródła śpiewników nie wchodzą do repo.** `Spiewnik/*` i `SpiewnikiYouth/*` są w `.gitignore`
  (wyjątek: `Spiewnik/_701-750.json`). Teksty pieśni są w `public/content` i to wystarcza;
  produkcyjny plik wydawnictwa to co innego niż tekst w aplikacji.
- Aplikacja stoi na **https://pastormarek.github.io/aplikacja/**. Publikuje `bash deploy.sh`
  (build + wypchnięcie `dist/` na gałąź `gh-pages`). Pierwsze przebudowanie po stronie GitHuba
  trwa kilka minut.
- `VITE_BASE` musi pasować do adresu: `/aplikacja/` dla GitHub Pages, `/` dla własnej domeny
  (planowana subdomena w `adwent.pl`).
- **Przy jednym włączonym języku** `LangGate` przechodzi prosto do aplikacji, a nagłówki
  Open Graph w `index.html` są po polsku. Gdy wrócą pozostałe języki, wróć tam po angielski.
