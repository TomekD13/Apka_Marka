# Moduły przekładów – do wczytania w aplikacji, **nie do publikacji**

Pliki w tym katalogu są **poza `public/`**, więc nie wchodzą do builda i nie trafiają
na serwer. To celowe: te przekłady są chronione prawem autorskim i wolno je mieć
u siebie, ale **nie wolno ich rozpowszechniać**.

| plik | przekład | wersetów | waga |
|---|---|---:|---:|
| `BW.bible.json` | Biblia Warszawska (1975), Towarzystwo Biblijne w Polsce | 31 163 | 3,8 MB |
| `BT.bible.json` | Biblia Tysiąclecia, wyd. IV (1989), Pallottinum | 31 440 | 3,8 MB |
| `BWP.bible.json` | Biblia warszawsko-praska (1997), bp K. Romaniuk | 31 423 | 4,3 MB |

Źródło: moduły Alkitab `.yes` z `../../Biblie/`. Zrobione przez
`python tools/bible_module.py yes ../Biblie/Warszawska.yes BW "Biblia Warszawska (1975)" --license "…" -o Moduly/BW.bible.json`.

## Jak wczytać

W aplikacji: **Biblia → Przekłady i tryb offline → Wczytaj plik modułu** i wskaż plik
z tego katalogu. Aplikacja przyjmuje też **plik `.yes` wprost** (`../../Biblie/*.yes`) –
konwersja dzieje się w przeglądarce, więc na telefonie nie potrzebujesz tych `.json`
w ogóle, wystarczy sam moduł Alkitaba. Tak samo wchodzą moduły **MyBible** (`*.SQLite3`)
i **MySword** (`*.bbl.mybible`). Moduł ląduje w IndexedDB tej jednej przeglądarki – nie wychodzi na
serwer, nie synchronizuje się między urządzeniami i znika przy czyszczeniu danych witryny.

Na telefonie: przenieś plik na urządzenie (albo udostępnij go sobie przez chmurę)
i wskaż tak samo. 4 MB w IndexedDB mieści się bez problemu.

## Czego tu nie ma

- **Biblii Ekumenicznej** – `Biblia-Ekumeniczna.yes` jest w nowszej odmianie formatu
  Alkitab, której `yes_bible.py` nie otwiera (patrz `../../Biblie/README.md`).
  Do zrobienia modułu BE trzeba pójść przez epub albo przez `build_bible_be.py`.
- **Deuterokanonicznych** – BT i BWP mają w module 73 księgi, aplikacja bierze kanon 66.
  Siedem ksiąg (Tb, Jdt, 1-2 Mch, Mdr, Syr, Ba) jest pomijanych.

## Ostrzeżenie o numeracji

Aplikacja trzyma odnośniki w numeracji protestanckiej (KJV) – tak jak `osis` w studiach
i tak jak UBG. Wszystkie trzy moduły powyżej też są w tej numeracji, więc odnośniki się
zgadzają. Gdybyś robił moduł z przekładu idącego za tekstem hebrajskim (Biblia Ekumeniczna),
psalmy z nadpisem rozjadą się o werset – `bible_module.py` tego nie przelicza.
