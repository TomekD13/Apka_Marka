# Zasady graficzne interfejsu

## Kierunek

Interfejs jest projektowany przede wszystkim dla telefonu: ma prowadzić do bieżącego materiału szybko, bez przeładowanego ekranu startowego. Styl łączy spokojną, czytelną aplikację do studiowania z charakterem kampanii **#JestNadzieja**.

## Układ i nawigacja

- Górny pasek zawiera: przycisk otwierający menu boczne, nazwę „Żywe Słowo” oraz wyszukiwanie w Biblii.
- Najważniejsze obszary aplikacji są dostępne w dolnym menu: **Biblia**, **Pieśni**, **Modlitwa**, **#JestNadzieja**.
- Każda pozycja dolnego menu otwiera najpierw stronę nadrzędną z kafelkami, a dopiero kafelek prowadzi do konkretnej treści. Dzięki temu użytkownik nie trafia przypadkiem od razu do jednego śpiewnika lub dziennika.
- Sekcja **Pieśni** zawiera kafelki: Śpiewnik, Pieśni młodzieżowe oraz Pieśni z muzyką i tekstem. Sekcja **Biblia** grupuje czytnik, 35 lekcji „Poznaj Boga i Biblię”, bieżące lekcje biblijne oraz osobiste narzędzia. **#JestNadzieja** także zaczyna się od kafelków: „40 dni modlitwy” daje wybór między materiałem wynikającym z kalendarza a pełną listą, a „Materiały edukacyjne” prowadzą najpierw do ich listy.
- Ikony dolnego menu są duże, proste i zawsze takie same dla tego samego punktu nawigacji.
- **Ustawienia** są dostępne wyłącznie z menu bocznego, nie z dolnego paska.
- Panel boczny grupuje pełną strukturę treści. Sekcja **Biblia** rozwija się, a **#JestNadzieja** znajduje się zaraz pod nią.
- Dolne menu jest stale widoczne; treść strony ma dodatkowy odstęp u dołu, aby nie była zasłonięta przez nawigację.
- Strony list mogą mieć jeden kontekstowy przycisk **Menu główne**. Na ekranach szczegółu przycisk powrotu prowadzi do właściwej listy nadrzędnej (np. z pieśni do danego śpiewnika), a menu boczne i nazwa aplikacji w nagłówku pozostają dostępne na każdej stronie.

## Ekran główny

- Pierwszą sekcją jest **Coś na dzisiaj**.
- Główna karta prowadzi bezpośrednio do aktualnego materiału — obecnie „40 dni modlitwy”.
- Karta #JestNadzieja informuje też, że w tym samym miejscu będą pojawiały się materiały edukacyjne.
- **Szkoła Sobotnia** jest osobną, spokojną kartą z linkiem do bieżącej lekcji.
- Sekcja **Kontynuuj** zawiera osobiste narzędzia: czytanie Biblii, notatki i wersety do nauki.
- Nie używamy osobnego bloku „Słowo na dziś”: codzienny tekst z sekcji „Teksty na różne okazje” jest wyświetlany nad bieżącym materiałem. Teksty są losowane raz dziennie i nie powtarzają się przed wyczerpaniem puli.
- „Poznaj Boga i Biblię” grupuje 35 lekcji w pięć rozwijanych serii, po siedem tematów w każdej. Najpierw widoczna jest lista serii, a pełna lista lekcji dopiero po rozwinięciu wybranej serii.

## Kolory

- Domyślny motyw jest jasny: tło `slate-50`, białe karty, ciemny granatowy tekst.
- Kolor podstawowy interakcji to granat marki `#1f4e79`; służy do przycisków, aktywnej nawigacji i ważnych linków.
- W dark mode tło przechodzi na bardzo ciemny granat (`slate-950`), karty są ciemniejsze, a tekst jasny.
- Kolory #JestNadzieja pochodzą z oryginalnej grafiki kampanii: gradient od cyjanu przez niebieski i fiolet do różu.
- Gradient #JestNadzieja jest akcentem marki, a nie uniwersalnym kolorem wszystkich elementów. Nie stosujemy samodzielnego różu jako głównego koloru light mode.
- Przezroczyste grafiki `Grafiki/Przezroczyste_mniejsze.png` i `Grafiki/Przezroczyste_wieksze.png` są używane odpowiednio w standardowych banerach oraz dużych formatach #JestNadzieja.
- Nagłówki podstron mogą używać gradientowego tła w granacie, błękicie i fiolecie, z jasnym tekstem i ikoną. Ten motyw ma wejść do aplikacji jako ważny element rozpoznawalny.
- Boksy podsumowujące, cytaty i najważniejsze wezwania do działania mogą korzystać z łagodnych gradientów zamiast jednolitego tła. Gradient musi zachować wysoki kontrast tekstu i pozostać spokojny wizualnie.

## Typografia i czytelność

- Domyślny zestaw to **Montserrat + Libre Baskerville**: pierwszy krój służy do interfejsu, drugi do tekstów Biblii, studiów i materiałów czytelniczych.
- W Ustawieniach użytkownik może zmienić cały zestaw typograficzny. Dostępne pary to: **Montserrat + Libre Baskerville** oraz **Outfit + Newsreader**.
- Wybór czcionek jest zapamiętywany lokalnie na urządzeniu i od razu obejmuje zarówno interfejs, jak i treść do czytania.
- Nagłówki są wyraźnie większe i pogrubione; tekst pomocniczy jest mniejszy oraz mniej kontrastowy.
- Treść na kartach ma krótkie opisy i jeden jasny cel działania.
- Minimalny komfort dotykowy jest ważniejszy od gęstości informacji: przyciski i punkty menu mają duże pola klikalne.
- Kontrast tekstu i tła musi działać w obu motywach. Starsze ekrany zachowują czytelność dzięki regułom kompatybilności dla light mode.
- W oknie **Nowa notatka** pod polem edycji, nad przyciskami, widnieje krótka wskazówka, że lista notatek jest dostępna przez: **Biblia → Moje notatki biblijne**.

## Karty, obramowania i ruch

- Zawartość grupujemy w karty o promieniu około `16 px`.
- Karty w jasnym motywie mają subtelne obramowanie i lekki cień; w ciemnym — ciemne tło oraz stonowane obramowanie.
- Efekty ruchu są dyskretne: element klikalny może delikatnie podnieść się lub zmienić obramowanie po najechaniu.
- Przejścia z menu, kafelka albo listy do kolejnego ekranu korzystają z krótkiego przenikania (View Transitions React Routera). Stosujemy je przede wszystkim między listą a szczegółem pieśni, czytanki, materiału edukacyjnego lub lekcji; preferencja systemowa „ogranicz ruch” je wyłącza.
- Nie używamy ciężkich ozdobników, silnych cieni ani wielu konkurujących gradientów.

## Ikony

- Ikony są liniowe, proste i spójne optycznie.
- Te same znaczenia zawsze używają tej samej ikony: książka dla Biblii, nuta dla Pieśni, dłonie dla Modlitwy, znak `#` z gradientem dla #JestNadzieja.
- Ikony dolnej nawigacji mają większy rozmiar niż ikony pomocnicze w panelu bocznym.

## Ustawienia motywu

- Użytkownik wybiera **Light mode** albo **Dark mode** w panelu bocznym, w ekranie Ustawienia.
- Wybrany motyw jest zapamiętywany lokalnie na urządzeniu.
- Przełączenie motywu zmienia kolor całej aplikacji, nie tylko ekranu ustawień.
- Ustawienia zawierają rozwijane sekcje **O aplikacji** (opis, prywatność i autor) oraz **Dodaj aplikację do Twojego telefonu**. Android korzysta z systemowego okna instalacji PWA, a iPhone pokazuje krótką instrukcję Safari.
