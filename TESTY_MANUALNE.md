# Scenariusz testów ręcznych

Wykonaj ten zestaw po każdej większej zmianie nawigacji. Wynik każdego punktu oznacz jako **OK** albo **błąd** z adresem strony, urządzeniem i zrzutem ekranu.

## Przygotowanie

1. Uruchom lokalną wersję: `npm run dev -- --host`.
2. Sprawdź ją w Chrome na komputerze i telefonie, a po wdrożeniu także pod adresem GitHub Pages.
3. W telefonie wykonaj punkty zarówno w orientacji pionowej, jak i poziomej.

## Kontrola po uruchomieniu

- [ ] Strona główna ładuje się bez białego ekranu, błędu 404 i błędów w konsoli.
- [ ] Odświeżenie podstrony (np. `/pl/40-dni/1`) na GitHub Pages nie kończy się błędem 404.
- [ ] Dolna nawigacja zawiera: Biblia, Pieśni, Modlitwa i #JestNadzieja; aktywna sekcja jest wyraźnie oznaczona w obu motywach.
- [ ] Przejście z kafelka lub pozycji listy do ekranu szczegółu jest krótkim, płynnym przenikaniem; przy systemowym ustawieniu „ogranicz ruch” nie występuje animacja.

## Menu i treść

- [ ] Każda grupa menu rozwija się niezależnie: Biblia, #JestNadzieja, Pieśni i Modlitwa.
- [ ] Biblia, Pieśni, Modlitwa oraz #JestNadzieja najpierw pokazują właściwe kafelki.
- [ ] #JestNadzieja udostępnia bieżący materiał 40 dni, pełną listę oraz listę materiałów edukacyjnych.
- [ ] Powrót ze szczegółu pieśni, czytanki i materiału edukacyjnego prowadzi najpierw do właściwej listy.
- [ ] Light mode i dark mode zachowują czytelność, a karta „Tekst dla Ciebie / 40 dni modlitwy” nie ma poziomych pasów.
- [ ] Nowa notatka zawiera wskazówkę o sekcji Biblia → Moje notatki biblijne.

## Kryterium akceptacji

Wersja jest gotowa, gdy wszystkie punkty są **OK**, a `npm run test:regression`, `npm test` oraz `npm run build` kończą się powodzeniem.
