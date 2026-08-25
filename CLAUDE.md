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
```

Nie ma lintera ani frameworka testowego. `npm run build` musi przechodzić czysto.

## Pipeline treści (`tools/`, Python)

```
python tools/extract_spiewnik.py    # PDF -> songs.json (1-700) + Spiewnik/_701-750.json
python tools/extract_youth.py       # śpiewniki obozowe + rozdział 41 -> songs-youth.json
python tools/extract_pray40.py      # one27/Teksty{Short,Long} -> pray40/
python tools/extract_edu.py         # one27/Szkolenia{Short,Long} -> edu/
python tools/build_bible_full.py    # pełny przekład -> bible/{KOD}/
python tools/build_bible_be.py pl   # wersety do studiów (Biblia Ekumeniczna)
python tools/build_index.py pl      # lista studiów w index.json
```

**Kolejność ma znaczenie:** `extract_spiewnik.py` przed `extract_youth.py` – ten drugi czyta
plik pośredni `Spiewnik/_701-750.json`, żeby dołożyć rozdział 41 do pieśni młodzieżowych.

Na Windowsie dawaj `PYTHONIOENCODING=utf-8`, inaczej konsola psuje polskie znaki.

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
