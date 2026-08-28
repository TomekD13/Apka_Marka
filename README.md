# Aplikacja-nowa – wersja rozwojowa czytnika

Kopia robocza aplikacji z `../Aplikacja/`, założona **2026-08-25** pod modyfikacje.
Tu pracujemy; `../Aplikacja/` zostaje nietknięta jako działająca wersja na
https://pastormarek.github.io/biblestudy/ i jako punkt odniesienia.

## Czym się różni od `../Aplikacja/`

| | `Aplikacja/` (stara) | `Aplikacja-nowa/` (ta) |
|---|---|---|
| adres publikacji | `pastormarek.github.io/biblestudy/` | `pastormarek.github.io/aplikacja/` |
| repo GitHub Pages | `pastormarek/biblestudy` | `pastormarek/aplikacja` **(do założenia)** |
| `VITE_BASE` przy buildzie | `/biblestudy/` | `/aplikacja/` |
| języki widoczne w apce | 8 (en, pl, es, pt, de, fr, sw, uk) | **tylko `pl`** |
| strona główna | wszystkie tematy rozwinięte | **menu belek, treść po kliknięciu** |
| baner na górze | `allthingsnew.png` | **`jestnadzieja-*.png`** (z `Grafiki/`) |

Treść pozostałych języków **nie została usunięta** – pliki dalej leżą w
`public/content/{de,en,es,fr,pt,sw,uk}/`, są tylko wyłączone z `langs.json`.
Pełna lista ośmiu języków jest odłożona w `public/content/langs.all.json` –
przywrócenie języka to skopiowanie z niej jednego wpisu.

## Menu główne (`src/pages/Home.tsx`)

Belki w kolejności, wszystkie zbudowane z `components/MenuBar.tsx`:

1. **Biblia** – cały tekst Pisma (UBG). W okienku: wybór przez kafelki (Testament → księga →
   rozdział → werset), szukanie słowa, powrót do ostatnio czytanego rozdziału i zakładki.
   Pełny czytnik na `/pl/biblia`
2. **Poznaj Boga i Biblię** – rozwija 5 serii, każda seria zwija się osobno (7 tematów każda, 35 razem)
3. **#JestNadzieja** – rozwija dwie belki: *40 dni modlitwy* (**40 czytanek w dwóch wersjach**) i *Materiały edukacyjne* (**10 szkoleń w dwóch wersjach**)
4. **Lekcje biblijne** – link do bieżącego tygodnia szkoły sobotniej (Adventech)
5. **Śpiewnik** – **745 pieśni** (całe wydanie XII). Okienko wyboru: numer 1–750 albo szukanie słowa (w tytule / w treści). Lista tytułów **nie rozwija się sama**; pełna, pogrupowana działami, jest na `/pl/spiewnik`
6. **Pieśni młodzieżowe** – **177 pieśni** ze śpiewników obozowych, alfabetycznie; własna wyszukiwarka i ulubione
7. **Pieśni z muzyką i tekstem** → kanał YouTube [@UwielbieniezTekstem](https://www.youtube.com/@UwielbieniezTekstem)
8. **Dziennik modlitw** – lista próśb rosnąca w miejscu; pełny dziennik na `/pl/modlitwy`
9. **Moje notatki biblijne** – lista + dodawanie
10. **Ucz się wersetów na pamięć** → `/pl/fiszki`
11. **Teksty na różną okazję** → `/pl/okazje`

Stan zwinięcia belki przeżywa przejście do czytnika i powrót (`sessionStorage`), ale nie zostaje na stałe.

### Lekcje biblijne – skąd bierze się bieżąca lekcja

`src/lib/sabbathSchool.ts` pyta publiczne API Adventech (`sabbath-school.adventech.io/api/v2`,
otwarty CORS, polski dostępny), wybiera kwartał i tydzień obejmujące dzisiejszą datę i buduje
link `…/pl/{kwartał}/{lekcja}/`. Nic nie wymaga aktualizacji przy zmianie kwartału.
Bez sieci belka prowadzi do `sabbath-school.adventech.io/pl/`.

### Grafika akcji #JestNadzieja

Źródłem są przezroczyste grafiki `Grafiki/Przezroczyste_mniejsze.png` i
`Grafiki/Przezroczyste_wieksze.png`. Do `public/` trafiają ich odpowiedniki używane w banerach
i dużych formatach. Belka #JestNadzieja ma własny wariant kolorystyczny `hope` w
`components/MenuBar.tsx` – nocne niebo z gradientem turkus → fiolet → róż, zgodnie z grafiką akcji.

### Dziennik modlitw

`components/PrayerJournal.tsx` + `lib/prayers.ts`. Nowe prośby dopisuje się w polu na dole listy.
Zaznaczenie „modlitwa otrzymała odpowiedź” przenosi pozycję na dół, stempluje datą wysłuchania
i otwiera pole na komentarz (zapisuje się przy wyjściu z pola). Odznaczenie kasuje datę.
Pełny widok z kopią zapasową: `/pl/modlitwy` (`pages/Prayers.tsx`).

### Notatki – prywatność

Notatki i dziennik modlitw żyją **wyłącznie w localStorage przeglądarki**
(`src/lib/notes.ts`, `src/lib/prayers.ts`, wspólny spód w `src/lib/localStore.ts`): bez konta,
bez backendu, bez synchronizacji, nic nie wychodzi na serwer. Wyczyszczenie danych witryny
je kasuje, dlatego strona `/pl/notatki` ma zapis kopii do pliku i wczytanie jej z powrotem.
Pływający przycisk (`components/AddNoteFab.tsx`) otwiera okienko nad tekstem
(`components/QuickNoteDialog.tsx`) – jedno pole, bez tytułu i odnośnika, Ctrl+Enter zapisuje.
Tytuł na liście bierze się z pierwszej linii treści; pełna edycja (tytuł, odnośnik) jest na
`/pl/notatki/{id}`. Okienko zapamiętuje, przy którym studium lub pieśni notatka powstała
(`src/place.tsx`).

> Uwaga: `../CLAUDE.md` w regułach twardych wymienia „bez zakładek, notatek”. Notatki weszły
> na wyraźne życzenie autora (2026-08-25) i nie łamią sensu tej reguły – nie ma kont ani
> śledzenia – ale zapis reguły w `CLAUDE.md` wymaga aktualizacji.

## Uruchomienie

```
cd Aplikacja-nowa
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build → dist/
npm run preview   # podgląd produkcyjnego builda
```

Publikacja (wymaga istniejącego repo `pastormarek/aplikacja` na GitHubie):

```
bash deploy.sh    # build z VITE_BASE=/aplikacja/ + force push dist na galaz gh-pages
```

## Biblia – czytnik i przekłady

Pełny tekst Pisma, osobno od studiów: `/pl/biblia` (spis ksiąg), `/pl/biblia/{Osis}/{rozdział}`
(czytnik), `/pl/biblia/szukaj`, `/pl/biblia/zakladki`, `/pl/biblia/przeklady`.
Belka „Biblia" na stronie głównej pokazuje to samo w skrócie (`components/BibleFinder.tsx`).

### Skąd bierze się tekst

```
python tools/build_bible_full.py            # UBG -> public/content/pl/bible/UBG/
python tools/build_bible_full.py --check    # sam raport, bez zapisu
python tools/build_bible_full.py BG         # Biblia Gdańska 1881 (domena publiczna)
```

Źródło: **bolls.life**, moduł `UBG18` – całe rozdziały jednym zapytaniem, bez klucza
i bez rate-limitu (tak samo jak `fetch_bible_bolls.py` bierze stamtąd wersety do studiów).
Pobrane rozdziały zostają w `tools/.cache/`, więc powtórzenie skryptu nie bije w serwer.
Wynik: **66 ksiąg, 1189 rozdziałów, 31 102 wersety, 3,86 MB** – bez luk i bez obcych
znaczników (skrypt raportuje jedno i drugie).

Układ plików – **jeden plik na księgę**, nie na rozdział i nie jeden na całość:

```
public/content/pl/bible/translations.json     spis przekładów na serwerze
public/content/pl/bible/UBG/index.json        księgi: osis, nazwa, skrót, testament,
                                              liczba wersetów w każdym rozdziale
public/content/pl/bible/UBG/{Osis}.json       {"osis": "...", "chapters": [[w1, w2, …], …]}
```

Dzięki temu czytelnik pobiera 3–225 KB (największe są Psalmy), a nie 3,86 MB, a wyszukiwarka
ma do ściągnięcia 66 plików zamiast 1189.

**Od 2026-08-25 Biblia wchodzi do „Pobierz offline"** (decyzja autora): moduł polski ciągnie
też pełny tekst każdego przekładu z `bible/translations.json`, księga po księdze, oraz wersety
do studiów we wszystkich przekładach, nie tylko domyślnym. Osobny przycisk
w `/pl/biblia/przeklady` zostaje – pobiera jeden wybrany przekład bez reszty modułu.

W tekście zostają dwa znaczniki ze składu przekładu: `<i>` (słowa dopowiedziane przez
tłumaczy) i `<b>` (nadpis psalmu wpleciony w werset 1). Renderuje je `components/VerseText.tsx`
własnym parserem – do przeglądarki nie trafia nic, czego sami nie zbudowaliśmy (żadnego
`innerHTML`).

### Numeracja

bolls oddaje UBG18 w numeracji **KJV** – tej samej, w której są `osis` w studiach
(Ps 3 ma 8 wersetów, nadpis siedzi w wersecie 1). Nie mylić z Biblią Ekumeniczną
(`build_bible_be.py`), która idzie za tekstem hebrajskim i przesuwa numery psalmów.

### Wybór miejsca – kafelkami, bez wpisywania

`src/components/BiblePicker.tsx` prowadzi w czterech krokach: **Testament → księga →
rozdział → werset**. Obie belki testamentów zostają widoczne, a księgi rozwijają się pod
wybraną – przejście ST ↔ NT to jedno kliknięcie, bez cofania się. Księgi stoją jako
**skróty** (`Rdz`, `1 Kor`, `Ap`) w siatce 5/8 kolumn, więc cały Stary Testament mieści się
naraz; pełna nazwa jest w `title` i pojawia się w ścieżce po wybraniu. Rozdziały i wersety
idą po 8/12 w rzędzie. Ostatni krok można pominąć („Otwórz cały rozdział").

Ścieżka wyboru stoi na górze jako okruszki i każdy jej człon cofa o krok. Wybór przeżywa
przejście do czytnika i powrót (`sessionStorage`), więc kolejny rozdział tej samej księgi
bierze się jednym kliknięciem. Ten sam komponent stoi na `/pl/biblia` i w belce menu.

### Odnośniki, szukanie, zakładki

`src/lib/bible.ts` – dostęp do tekstu, parser odnośników i wyszukiwarka.
Parser (`parseRef`) rozumie skróty z indeksu, pełne nazwy i formy z nawyku
(„1 Moj 1", „Objawienie 21,4", „ps23", „Jan 3:16-18"). Osobnego pola na odnośnik nie ma
(zastąpiły je kafelki) – parser pracuje w wyszukiwarce: wpisany odnośnik daje nad wynikami
skrót „Przejdź do". Wyszukiwarka idzie księga po księdze i oddaje
trafienia partiami, więc pierwsze wyniki widać, zanim ściągnie się cała Biblia
(limit 300 trafień, zakres: całość / ST / NT).

Zakładki (`src/lib/bookmarks.ts`) i „ostatnio czytane" żyją – jak notatki i ulubione
pieśni – **wyłącznie w localStorage tej przeglądarki**. Zakładka zapamiętuje tekst wersetu
z chwili dodania, żeby lista czytała się bez pobierania księgi.

### Własne przekłady (moduły)

Aplikacja nie rozprowadza cudzych przekładów – na serwerze leży tylko to, na co pozwala
licencja. Każdy inny przekład czytelnik wgrywa sobie sam: **Biblia → Przekłady → Wczytaj
plik modułu** (albo adres pliku). Moduł ląduje w **IndexedDB** tej przeglądarki
(`src/lib/bibleStore.ts`) – nie wychodzi na serwer i nie synchronizuje się między urządzeniami.

Moduł `.yes` (Alkitab Bible Study) wgrywa się **wprost w przeglądarce** – parser siedzi
w `src/lib/yesModule.ts` (odpowiednik `tools/yes_bible.py`, sprawdzony co do bajtu przeciw
niemu). Kod przekładu, tytuł i notę o prawach bierze z sekcji `infoEdisi` samego modułu,
a nazwy i kolejność ksiąg z przekładu, który już mamy. Moduły katolickie mają 73 księgi –
siedem deuterokanonicznych odpada, reszta dopasowuje się po nazwie natywnej. Nowsza odmiana
formatu (`versionInfo`/`booksInfo`, tak ma `Biblia-Ekumeniczna.yes`) nie jest czytana i mówi
o tym wprost. Po wczytaniu porównujemy wersyfikację z bieżącym przekładem
(`versificationGap`) i ostrzegamy, gdy się rozjeżdża – Warszawska różni się od UBG w 131
rozdziałach (Lb 16-17, Pwt 12-13, 22-23, 28-29…), Tysiąclecia w 168.

Moduły **MyBible** (`*.SQLite3`) i **MySword** (`*.bbl.mybible`) też wchodzą wprost –
`src/lib/sqliteModule.ts` czyta je przez własny czytnik baz SQLite (`src/lib/sqliteReader.ts`),
bez `sql.js` i bez WebAssembly, więc działa tak samo offline. Czytnik robi jedno: przechodzi
drzewo stron tabeli i składa rekordy (razem ze stronami nadmiarowymi) – żadnego SQL-a.
Obsługiwane są oba układy tabel: `verses(book_number, chapter, verse, text)` z `books`/`info`
(MyBible) i `Bible(Book, Chapter, Verse, Scripture)` z `Details` (MySword). Numery Stronga
(`<S>…</S>`), przypisy i śródtytuły są zdejmowane, kursywa i nadpisy psalmów zostają.
Księgi rozpoznajemy najpierw po nazwie z tabeli `books`, a numer jest zapasem. Numery
MyBible mają **dwa układy Nowego Testamentu** i różnią się między modułami (520 to raz
List do Rzymian, raz List Jakuba) – układ wykrywamy po liczbie rozdziałów księgi 520.
Czego nie da się rozpoznać, tego nie bierzemy; liczba wczytanych ksiąg jest w komunikacie
po wgraniu. Sprawdzone na prawdziwym module UBG 2018 z ph4.org: 66 ksiąg, 31 102 wersety,
133 ms.

Z pozostałych formatów moduł robi `tools/bible_module.py` – plik JSON (`{index, books}`):

```
python tools/bible_module.py yes ../Biblie/Warszawska.yes BW "Biblia Warszawska (1975)"     --license "© Towarzystwo Biblijne w Polsce…" -o Moduly/BW.bible.json
python tools/bible_module.py zefania PBG.xml PBG "Biblia Gdańska (1881)" --license "Domena publiczna"
python tools/bible_module.py osis  ksiega.osis.xml KOD "Nazwa"
python tools/bible_module.py json  public/content/pl/bible/UBG UBG "Uwspółcześniona Biblia Gdańska"
```

Gotowe moduły z przekładów, które leżą w `../Biblie/`, są w `Moduly/` – **poza `public/`**,
więc nie wchodzą do builda i nie trafiają na serwer. Patrz `Moduly/README.md`.

Modułów może być wiele naraz – każdy siedzi w IndexedDB pod swoim kodem, a lista na
`/pl/biblia/przeklady` pokazuje wszystkie razem z tym, co leży u nas. Czyta się jeden naraz
(przełącznik w nagłówku czytnika, w belce menu i na liście przekładów); wybór zostaje na stałe.
Moduł o kodzie zajętym przez przekład z serwera przesłania go – lista pokazuje wtedy moduł,
nie wpis serwerowy.

### Skąd czytelnik bierze moduły

`public/content/{lang}/bible/sources.json` ma dwie listy i to jest cała konfiguracja
(kod nie zna żadnego adresu):

- **`sources`** – przekłady, które **przeglądarka ściąga sama**; wymaga otwartego CORS
  po stronie źródła. Dziś: Biblia Gdańska 1881 z `getbible.net`.
- **`catalogs`** – strony, z których moduł pobiera się ręcznie, bo ich serwery CORS-a nie
  oddają. Dziś dwie: **ph4.org** i **alkitab.mobi** (ta druga bez polskich przekładów, ma
  indonezyjskie i kilkanaście angielskich). `mybible.zone` wypadło, bo nie ma tam plików –
  same instrukcje i pobieranie z poziomu aplikacji na telefonie; `mysword.info` na życzenie autora.
  Wpis ph4.org ma dodatkowo `items` – **spis 49 polskich przekładów z bezpośrednimi adresami
  plików** (25 pełnych Biblii, reszta to Nowy Testament i Psałterze), więc czytelnik nie
  wychodzi na obcą stronę szukać: widzi nazwy u nas, klika „Pobierz", a potem wskazuje
  pobrany plik. Sekcja stoi **nad** „Dodaj własny przekład", bo to droga, którą czytelnik
  pójdzie najczęściej. Spis buduje `tools/fetch_ph4_catalog.py`:

```
python tools/fetch_ph4_catalog.py            # zapis do sources.json
python tools/fetch_ph4_catalog.py --check    # sam raport
python tools/fetch_ph4_catalog.py --sizes    # dolicz wagi plików (49 zapytań HEAD)
```

  Skrypt pomija słowniki i komentarze (aplikacja czyta tylko tekst Pisma) i oznacza, które
  pozycje to cały kanon. Nic nie kopiuje do nas – pliki zostają na ph4.org.

Format pliku rozpoznajemy **po zawartości, nie po nazwie** (`sniff()` w `bibleStore.ts`) –
adresy pobrania z ph4.org nie mają rozszerzenia. Repozytoria wydają moduły spakowane, więc
**`.zip` wchodzi tak samo jak plik modułu** –
`src/lib/unzip.ts` czyta spis archiwum i rozpakowuje wpis przez `DecompressionStream`
(deflate w samej przeglądarce, bez biblioteki). Na telefonie to jedyna wygodna droga:
ściągasz `.zip` z ph4.org i od razu wskazujesz go w aplikacji.

### Przekłady prosto z cudzego serwera

Nie trzeba hostować tekstu u siebie. `public/content/{lang}/bible/sources.json` to katalog
źródeł, z których **przeglądarka czytelnika** pobiera przekład sama; `src/lib/bibleOnline.ts`
przerabia go na nasz format i zapisuje jako moduł. Warunkiem jest otwarty CORS po stronie
źródła – `getbible.net` i `bolls.life` oddają `Access-Control-Allow-Origin: *`.

```json
{ "code": "BG", "name": "Biblia Gdańska (1881)", "license": "Domena publiczna.",
  "provider": "getbible.net", "kind": "getbible",
  "url": "https://api.getbible.net/v2/polgdanska", "sizeKB": 9400 }
```

`kind` to `getbible` (v2, jeden plik na księgę) albo `module` (nasz format pod adresem).
Nazwy i kolejność ksiąg biorą się z przekładu, który już mamy – dlatego przekład ściągnięty
z angielskiego serwera ma u nas polskie nazwy ksiąg i nie powtarzamy tabeli kanonu w kodzie.

## Śpiewnik – skąd się bierze treść

```
python tools/extract_spiewnik.py            # cały śpiewnik -> public/content/pl/songs.json
python tools/extract_spiewnik.py 1 40       # wybrany zakres numerów
python tools/extract_spiewnik.py --check    # sam raport, bez zapisu
python tools/extract_spiewnik.py --akordy   # zachowaj akordy rozdziału 41
```

Źródło: `Spiewnik/Spiewnik Spiewajmy Panu (12B - 2013) PRESS.pdf` (600 stron).
**745 pieśni**, numeracja 1–750 (numerów 176, 386, 431, 458 i 460 nie ma w wydaniu).

Skrypt rozpoznaje elementy po wielkości fontu składu DTP i obsługuje trzy układy pieśni:
zwrotki numerowane z refrenem, pieśni jednozwrotkowe bez numeracji (`single: true` – render
nie stawia im numeru) oraz rozdział 41 (pieśni młodzieżowe, ~701–750), gdzie łamanie wierszy
jest znaczące i zostaje zachowane, a akordy wplecione między wiersze są odrzucane.

Skład PDF miejscami gubi literę „l” (drukuje cyfrę 1 albo wielkie I): `bó1`, `modIitw`,
`Paw dobry jest`. Poprawki trzyma jawna tabela `TYPOS` w skrypcie – każda sprawdzona
w kontekście zdania, żadna nie jest zgadywana.

Tekst jest **© Wydawnictwo „Znaki Czasu” (2013)** – przed publiczną publikacją trzeba mieć
na to zgodę wydawnictwa.

## 40 dni modlitwy – skąd się bierze treść

```
python tools/extract_pray40.py                  # -> public/content/pl/pray40/
python tools/extract_pray40.py --check          # sam raport, bez zapisu
python tools/extract_pray40.py --src <katalog>  # inne źródło niż ~/AIprojekty/one27
```

Źródło: projekt **one27** (poza tym repo) – `TekstyShort/` i `TekstyLong/`, po 40 plików
`.docx` każdy. Obie wersje to ten sam dzień: krótka (~2 tys. znaków) i pełna (~9 tys.,
ze śródtytułami). Strukturę niesie stopień pisma: 24 pt = tytuł dnia, 14 pt pogrubione =
śródtytuł, 12 pt = akapit, 10,5 pt = wiersz „Tekst:" i zdanie wprowadzające.
Pytania i nota o przekładzie są w obu wersjach te same, więc trzymamy je raz.

Wynik idzie do `public/content/pl/pray40/`: `index.json` (spis 40 dni, 9 KB) i `01.json`
… `40.json` (~13 KB na dzień) – tak samo jak studia, więc czytelnik pobiera tylko ten
dzień, który otwiera. W trybie offline pobiera się sam spis; czytanki dociągają się
przy czytaniu.

**Daty**: akcja zaczyna się **5 września 2026 (sobota)** – `START` w `extract_pray40.py`.
Skrypt dopisuje do każdego dnia `date` (ISO) i `dateLabel` („5 września, sobota"), więc
etykiety są w treści, a nie w kodzie. Przesunięcie akcji na inny rok to zmiana jednej stałej
i ponowne uruchomienie skryptu.

Przełącznik **Krótko / Pełna wersja** stoi w dwóch miejscach: nad spisem dni (wybór decyduje,
w której wersji otworzy się czytanka) i w samej czytance. Wybór trzyma `sessionStorage`
(`components/VersionToggle.tsx`).

Pod czytanką stoi `components/ReadingFooter.tsx`: odhaczenie **„Przeczytane"**, **„Oceń
materiał"** (gwiazdki 1-5), przejście do pełnej wersji (gdy czytamy krótką) oraz dzielenie
się: **WhatsApp**, **Messenger**, systemowe **„Udostępnij"** i **„Zaproś przyjaciół"**
(link do strony głównej zamiast do czytanki). Odhaczone dni dostają ✓ na liście.
Stan czytania i oceny trzyma `lib/progress.ts` (`localStorage`) – ten sam mechanizm
obsługuje materiały edukacyjne.

### Zbieranie ocen w arkuszu

Aplikacja nie ma backendu, więc oceny idą do arkusza przez formularz. Adres siedzi
w treści: `ui.json` → `reading.rateUrl`, jako wzorzec z miejscami `{ocena}` i `{material}`.
**Pusty adres znaczy, że ocena zostaje tylko w przeglądarce czytelnika** – tak jest dziś.

Google Forms (oceny lądują w Arkuszach Google, aplikacja nie przeładowuje strony):
1. Formularz z dwoma pytaniami: *Ocena* (1-5) i *Materiał* (tekst).
2. Menu ⋮ → **„Uzyskaj wypełniony wcześniej link"**, wpisz przykładowe wartości, skopiuj link.
3. W skopiowanym adresie zamień `/viewform?usp=pp_url` na `/formResponse`, a przykładowe
   wartości na `{ocena}` i `{material}`.
4. Wklej do `reading.rateUrl`. Adres z `/formResponse` aplikacja wysyła w tle
   (`fetch` z `mode: 'no-cors'`), więc czytelnik zostaje w czytance.
5. W formularzu: *Odpowiedzi* → *Połącz z Arkuszami*.

Microsoft Forms zapisuje odpowiedzi wprost do skoroszytu Excela w OneDrive – wtedy zostaw
zwykły adres formularza (bez `/formResponse`), a aplikacja otworzy go w nowej karcie.

### Kontakt bez programu pocztowego

Ten sam mechanizm obsługuje formularz kontaktu (`components/ContactForm.tsx`):
`ui.json` → `contact.postUrl`, wzorzec z miejscami `{wiadomosc}`, `{imie}` i `{email}`.
- **pusty** (tak jest dziś) – wiadomość otwiera się w programie pocztowym (`mailto:`);
- **adres z `/formResponse`** (Google Forms) – wysyłka w tle, czytelnik zostaje w aplikacji,
  a odpowiedzi lądują w arkuszu (bez powiadomień e-mail – decyzja autora: wiadomości
  czyta się w arkuszu);
- **inny adres** (Formspree, FormSubmit, własny punkt) – zwykły POST z polami
  `message`, `name`, `email`, `_subject`; wynik sprawdzamy po statusie odpowiedzi.

**Kolejność przycisków**: „Udostępnij" (systemowe okno) stoi pierwsze, dalej WhatsApp.

**Messenger** wymaga własnego identyfikatora aplikacji Facebooka: okno wysyłki
(`facebook.com/dialog/send`) bez `app_id` nie działa, a odnośnik `fb-messenger://` milczy
na komputerze. Dlatego przycisk pokazuje się **tylko wtedy, gdy `ui.json` → `reading.fbAppId`
jest wypełniony**; dziś jest pusty. Na telefonie Messenger i tak jest w systemowym oknie
„Udostępnij".

## Materiały edukacyjne – skąd się bierze treść

```
python tools/extract_edu.py                  # -> public/content/pl/edu/
python tools/extract_edu.py --check          # sam raport, bez zapisu
python tools/extract_edu.py --src <katalog>  # inne źródło niż ~/AIprojekty/one27
```

Źródło: projekt **one27** (poza tym repo) – `SzkoleniaShort/` i `SzkoleniaLong/`, po 10
plików `.md`. Numer bierze się z nazwy pliku (`001_...md`), reszta z markdowna: `#` to
tytuł, `##` śródtytuł (w wersji pełnej „Podsumowanie" i „Spójrz wyżej"), blokquote to
werset z odnośnikiem, dalej pytania do przemyślenia i nota o przekładzie.

Werset i pytania **różnią się między wersjami** (pełna cytuje szerzej i ma dwa pytania
zamiast jednego), więc siedzą przy wersji, a nie przy szkoleniu. Nota o przekładzie jest
ta sama, więc trzymamy ją raz.

Wynik: `public/content/pl/edu/index.json` (spis) i `01.json` … `10.json` (~13 KB każdy),
razem 133 KB. Strona szkolenia (`pages/Edu.tsx`) ma ten sam przełącznik
**Krótko / Pełna wersja** co czytanki – wspólny komponent `components/VersionToggle.tsx`.
Trasy: `/pl/edukacja` i `/pl/edukacja/{nr}`. Wybór wersji nad spisem, stopka z odhaczeniem
i udostępnieniem – tak samo jak w czytankach, tyle że bez dat.

## Pieśni młodzieżowe – skąd się bierze treść

```
python tools/extract_youth.py            # -> public/content/pl/songs-youth.json
python tools/extract_youth.py --check    # sam raport, bez zapisu
```

Źródło: `SpiewnikiYouth/` – osiem śpiewników obozowych z lat 2018–2023 (6 PDF + 2 DOCX),
każdy o innym układzie. DOCX-y (Camp 2023) czyta się po stylach (`Heading 1` = tytuł,
akapit pogrubiony = akordy), PDF-y po stopniu pisma, z podziałem stron na łamy – akordy
stoją w osobnej kolumnie, a spisy treści są pomijane.

**Akordy** (decyzja autora 2026-08-25): w druku stoją nad wierszem albo w prawej kolumnie.
Przy tekście, który się przelewa, żadnej z tych pozycji nie da się utrzymać, więc skrypt
przenosi je **na koniec swojej linijki, za `//`** – najpierw cały tekst, potem akordy
(`CHORD_MARK`). Wyświetla je `SongBody` w `src/pages/Songs.tsx`: drobnym pismem o barwie
bursztynu, obok wiersza. Akordów doczekało się 112 ze 173 pieśni.

**Tytuły** wracają do zwykłego zapisu (`nice_title`): wielka litera tylko na początku
i w nazwach własnych – śpiewniki obozowe składają je wersalikami. Zaimki odnoszące się
do Boga idą małą literą, zgodnie z regułą „tylko początek i nazwy własne". Lista nazw
własnych, które zostają wielką literą (imiona Boże, przymiotnik „Boży", epitety
w rodzaju „Zbawiciel"), siedzi w tabeli `PROPER` w skrypcie.

**Przy powtórzeniu wygrywa najnowszy rocznik** (decyzja autora) – kolejność w tabeli
`PRIORITY` w skrypcie. Deduplikacja idzie po tytule (także bez spacji, bo skład potrafi je
pogubić) i po początku tekstu.

Odsiew pieśni obecnych w „Śpiewajmy Panu" (1–700):
- litera **S** przy numerze (`ACH, JAK MOJE SERCE (112 S)`) – pieśń odpada;
- litera **T** i inne – pieśń zostaje (to odsyłacz do innego śpiewnika);
- sam numer bez litery (Camp 2023, `GDY NA TEN ŚWIAT SPOGLĄDAM (17)`) – odpada dopiero
  po sprawdzeniu, że pieśń o tym numerze faktycznie zgadza się tytułem lub tekstem.

Z 451 wyciągniętych pozycji zostaje **173** po deduplikacji i 56 odsianych.

## Ulubione pieśni

`src/lib/favorites.ts` – gwiazdka przy każdej pieśni, osobna lista dla każdej kolekcji
(numery w obu zaczynają się od 1). Ulubione, jak notatki i dziennik, żyją tylko
w localStorage tej przeglądarki. W okienku wyszukiwania pojawia się zwijana belka
„★ Ulubione" – tylko wtedy, gdy jakieś są.

## Waga aplikacji

`npm run build` kończy się dwoma krokami porządkowymi (`postbuild`):
`prune_dist_langs.mjs` wycina z `dist/` treść języków spoza `langs.json` (dziś 7,6 MB),
a `gen_og_pages.mjs` robi strony Open Graph dla języków włączonych.

| co | rozmiar | po kompresji |
|---|---|---|
| cały serwis na GitHub Pages | 7,54 MB | – |
| pierwsze wejście (kod + ikony + baner + spis) | 581 KB | **ok. 200 KB** |
| śpiewnik, 745 pieśni (dociągany po otwarciu belki) | 779 KB | 210 KB |
| pieśni młodzieżowe, 200 pieśni (z rozdziałem 41 „Śpiewajmy Panu") | 239 KB | 66 KB |
| materiały edukacyjne – spis | 1 KB | 1 KB |
| materiały edukacyjne – jedno szkolenie (obie wersje) | ~13 KB | ~5 KB |
| 40 dni modlitwy – spis dni | 9 KB | 3 KB |
| 40 dni modlitwy – jedna czytanka (obie wersje) | ~13 KB | ~5 KB |
| Biblia Ekumeniczna (wersety do studiów) | 372 KB | 127 KB |
| Biblia UBG – cały tekst (66 plików, pobierany po księdze) | 3,86 MB | 1,3 MB |
| Biblia UBG – jedna księga przy otwarciu rozdziału | 3–225 KB | 1–75 KB |
| jedno studium | ~22 KB | ~7 KB |
| „Pobierz offline” – cały moduł polski (z czytankami, materiałami i całą Biblią) | 6,4 MB | 2,1 MB |

## Czytanie dwóch przekładów naraz

W pasku nad tekstem stoi przycisk **„Dwa przekłady"** (widoczny, gdy na urządzeniu jest więcej
niż jeden przekład). Wybór drugiego przekładu i kierunek podziału ekranu – **obok siebie**
albo **jeden pod drugim** – zostają w `localStorage` (`lib/bible.ts`,
`getSecondTranslation` i `getBibleSplit`).

Osobno działa podgląd pojedynczego wersetu: klikasz werset, w pasku akcji wybierasz
**„Inne przekłady"** i widzisz ten sam werset we wszystkich przekładach, jakie masz na
urządzeniu – także w Biblii Ekumenicznej z pliku wersetów do studiów
(`components/VerseCompare.tsx`).

## Zasady projektu

Reguły tej aplikacji stoją w `CLAUDE.md` **w tym katalogu** – one biorą górę nad `../CLAUDE.md`.
Z tamtego pliku dalej obowiązują pułapki pipeline'u treści:
**nie regenerować studiów PL przez `md2json.py`** i **nie uruchamiać `*_refs_from_pl.py`**.
Poprawki treści nanosi się na JSON i równolegle na `.md`.
