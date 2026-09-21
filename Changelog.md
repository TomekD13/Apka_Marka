# Changelog

## 2026-09-21 — Teksty do modlitwy

- W sekcji „Modlitwa” nowa strona „Teksty do modlitwy” w konwencji United Prayer: Uwielbienie (89), Skrucha (80), Prośby (79), Wdzięczność (75). Do wyboru lista działu albo losowanie zestawu czterech tekstów – po jednym z każdego działu.
- Teksty w przekładzie Biblii Ekumenicznej, wyłącznie przez odnośniki (`prayer-texts.json` + `bibles/BE.json`).
- Poprawiona numeracja BE: psalmy z tytułem rozpoznaje teraz dopasowanie treści, a nie same słowa nagłówka (Ps 5, 7, 12, 18, 38, 54, 60, 70, 80, 92 i Ps 126), doszedł też przeskok Iz 9. Naprawione czyszczenie tekstu: krótkie „tytuły perykop” z ekstrakcji PDF nie obcinają już końców wersetów (np. Jr 31,32).

## 2026-09-16 — Naprawa udostępniania

- Przycisk „Udostępnij” przy materiale przekazuje wyłącznie jego adres. WhatsApp i zaproszenie nadal przekazują opis wraz z linkiem.

## 2026-09-16 — Nawigacja i Szkoła Sobotnia

- Service worker nie przechwytuje już panelu `/stat/`.
- W sobotę przed 16:00 aplikacja kieruje do lekcji kończącego się tygodnia.

## 2026-09-07 — Diagnostyka

- Dodano lokalny raport instalacji PWA: rejestruje zdarzenia instalacyjne, wynik monitu i stan service workera. Nie odczytuje prywatnych komunikatów Menedżera pakietów Androida.

## 2026-09-07 — Naprawa PWA

- Zmieniono manifest z `manifest.webmanifest` na `manifest.json` oraz wzmocniono konfigurację MIME. Serwer zwraca teraz manifest jako `application/json`, co usuwa błąd instalowania aplikacji internetowej.
