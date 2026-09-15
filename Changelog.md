# Changelog

## 2026-09-16 — Naprawa udostępniania

- Przycisk „Udostępnij” przy materiale przekazuje wyłącznie jego adres. WhatsApp i zaproszenie nadal przekazują opis wraz z linkiem.

## 2026-09-07 — Diagnostyka

- Dodano lokalny raport instalacji PWA: rejestruje zdarzenia instalacyjne, wynik monitu i stan service workera. Nie odczytuje prywatnych komunikatów Menedżera pakietów Androida.

## 2026-09-07 — Naprawa PWA

- Zmieniono manifest z `manifest.webmanifest` na `manifest.json` oraz wzmocniono konfigurację MIME. Serwer zwraca teraz manifest jako `application/json`, co usuwa błąd instalowania aplikacji internetowej.
