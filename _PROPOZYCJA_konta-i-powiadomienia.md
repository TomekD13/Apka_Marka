# Konta i powiadomienia: PWA → Firebase Auth → Firestore → FCM

Propozycja z 2026-08-25. **Nic nie zostało wdrożone** – kod czeka na decyzje z tabeli niżej
i na projekt założony w konsoli Firebase.

## Stan decyzji (Marek, 2026-08-25)

| sprawa | decyzja |
|---|---|
| metody logowania | **link na e-mail + konto Google**; bez haseł, bez logowania anonimowego |
| co się synchronizuje | **wszystko**: notatki, dziennik modlitw, ulubione pieśni, zakładki w Biblii |
| wysyłka powiadomień | **harmonogram w chmurze** (Cloud Function, plan Blaze) |
| adresy e-mail | **wyłącznie technicznie**: do logowania, bez list wysyłkowych |
| hosting | GitHub Pages na teraz; **w tym tygodniu subdomena w `adwent.pl`** |

Zostaje jedno: **założenie projektu w konsoli Firebase** (etap 0 niżej). Bez tego nie ma
czego podłączyć.

---

## 1. Co to daje, a czego nie

**Daje:**
- Notatki, dziennik modlitw, ulubione pieśni i zakładki w Biblii **przeżywają zmianę telefonu**
  i widać je na komputerze i w telefonie naraz.
- Czytelnik odzyskuje swoje rzeczy po wyczyszczeniu przeglądarki (dziś traci wszystko).
- Powiadomienie „nowy materiał", „dzień 12 z 40 dni modlitwy" – bez sklepu z aplikacjami.

**Nie daje:**
- Nie przyspiesza aplikacji ani nie zmienia tego, co widać. Cała treść (studia, Biblia,
  śpiewniki) zostaje jak jest: statyczne pliki, offline, bez logowania.
- Nie zwalnia z odpowiedzialności prawnej za dane – patrz punkt 3.

---

## 2. Zasada, na której to stoi: local-first, logowanie opcjonalne

Aplikacja **dalej działa bez konta i bez sieci**, dokładnie jak dziś. `localStorage` zostaje
jako główne miejsce zapisu. Logowanie to **dodatek**, który włącza synchronizację:

```
zapis czytelnika ──► localStorage  (zawsze, natychmiast, offline)
                        │
                        └──► Firestore  (tylko gdy zalogowany; w tle, z kolejką offline)
```

Czytelnik, który się nie zaloguje, nie zauważy żadnej zmiany. To jest ważne dla tej
aplikacji: próg wejścia ma zostać zerowy.

---

## 3. „Ja nie przechowuję żadnych danych" – co to znaczy naprawdę

To zdanie jest prawdziwe technicznie i nieprawdziwe prawnie. Warto to wiedzieć **przed**,
a nie po.

- **Technicznie**: nie stawiasz serwera, nie masz bazy na dysku, nie oglądasz cudzych
  notatek. Dane leżą u Google, a reguły bezpieczeństwa pozwalają czytać je wyłącznie
  właścicielowi konta. Ty też ich nie czytasz.
- **Prawnie (RODO)**: projekt Firebase jest twój, więc jesteś **administratorem danych
  osobowych** (adres e-mail, identyfikator konta, treść notatek i modlitw – a modlitwa
  bywa danymi o zdrowiu albo rodzinie, czyli kategorią szczególną). Google jest
  **podmiotem przetwarzającym**, umowa powierzenia jest częścią warunków Firebase.

Co z tego wynika w praktyce – trzy rzeczy, wszystkie wykonalne:
1. **Krótka polityka prywatności** w aplikacji (jedna strona: co zapisujemy, po co,
   jak długo, jak usunąć konto). Mogę napisać.
2. **Kasowanie konta jednym przyciskiem** – usuwa dokumenty czytelnika i samo konto.
   Bez tego nie ma zgodności.
3. **Region danych: Europa.** Firestore w `eur3` albo `europe-central2` (Warszawa).
   **Regionu nie da się zmienić po założeniu bazy** – to trzeba ustawić za pierwszym razem.

Zabezpieczenie minimalizujące ryzyko: **do chmury idą tylko rzeczy czytelnika**
(notatki, modlitwy, ulubione, zakładki, ustawienia). Ani jednego bajtu Pisma, śpiewnika
czy statystyk czytania. Na konto przypada kilkanaście kilobajtów.

---

## 4. Model danych w Firestore

```
users/{uid}                       profil: dataZalozenia, ostatniaSynchronizacja
users/{uid}/notes/{id}            notatki       (dziś: lib/notes.ts)
users/{uid}/prayers/{id}          dziennik      (dziś: lib/prayers.ts)
users/{uid}/favorites/{id}        ulubione      (dziś: lib/favorites.ts)
users/{uid}/bookmarks/{id}        zakładki      (dziś: lib/bookmarks.ts)
users/{uid}/devices/{tokenId}     token powiadomień + kiedy nadany
```

Reguły bezpieczeństwa – całość mieści się w kilku wierszach:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Nikt poza właścicielem nie ma dostępu. Nie ma zapytań „po wszystkich użytkownikach",
więc nie ma jak wyciec czegoś cudzego.

**Uwaga o kluczach:** `apiKey` Firebase leży jawnie w kodzie strony i **tak ma być** –
to identyfikator projektu, nie hasło. Bezpieczeństwa pilnują reguły powyżej
i lista dozwolonych domen w konsoli.

---

## 5. Logowanie: czym i dlaczego

> **ROZSTRZYGNIĘTE (Marek, 2026-08-25): link na e-mail + konto Google.**
> Haseł nie ma wcale, logowania anonimowego nie ma wcale.

| metoda | za | przeciw | werdykt |
|---|---|---|---|
| **Link na e-mail** (passwordless) | żadnych haseł do zapominania, działa u każdego | trzeba kliknąć w mejla | **wchodzi, główna** |
| **Google** | jedno kliknięcie | nie każdy ma i nie każdy chce | **wchodzi, druga** |
| hasło | znane wszystkim | zapominane, wycieki, reset hasła na twojej głowie | **odpada** |
| anonimowe | zero progu | konto ginie z czyszczeniem przeglądarki, czyli pozór synchronizacji | **odpada** |

Pułapka do ominięcia: **`signInWithRedirect` psuje się** w przeglądarkach blokujących
ciasteczka firm trzecich (Safari, Firefox). Robimy `signInWithPopup` plus link
e-mailowy jako drogę zapasową. Domena `pastormarek.github.io` musi trafić na listę
„Authorized domains" w konsoli Firebase.

---

## 6. Powiadomienia (FCM) – tu jest jedyny prawdziwy haczyk

Odbiór powiadomienia w przeglądarce jest darmowy i prosty. Problem jest po stronie
**wysyłania**: przeglądarkowy SDK **nie potrafi zapisać się do tematu** (`topic`) –
to operacja serwerowa. Czyli ktoś musi wysłać.

Trzy warianty, od najtańszego:

**A. Skrypt na twoim laptopie.**
Tokeny urządzeń leżą w Firestore. Piszesz `node tools/push.mjs "Nowy materiał" "treść"`,
skrypt loguje się kluczem serwisowym (`firebase-admin`), czyta tokeny i wysyła paczkami
po 500. Zero kosztów, zero serwera, plan darmowy (Spark). Wada: wysyłasz ręcznie,
z komputera. Klucz serwisowy **nie może** trafić do repozytorium.

**B. Cloud Function (WYBRANE)** – wysyłka z harmonogramu („codziennie 7:00 w czasie 40 dni modlitwy")
albo z panelu. Wymaga planu **Blaze** (karta), ale przy tej skali rachunek to
praktycznie 0 zł (2 mln wywołań miesięcznie w darmowym progu). Wada: karta i limit
budżetu do ustawienia.

**C. Konsola Firebase** – wygodna tylko do wysyłki testowej na jedno urządzenie.
Do rozesłania wszystkim się nie nadaje bez wariantu A albo B.

**iOS:** powiadomienia web push działają od iOS 16.4 i **tylko wtedy, gdy czytelnik
doda aplikację do ekranu początkowego**. Trzeba mu to napisać wprost w aplikacji.

**Service worker:** aplikacja ma już swój (`vite-plugin-pwa`, tryb `generateSW`). FCM też
chce swojego. Nie stawiamy dwóch – przełączamy wtyczkę na `injectManifest` i dokładamy
obsługę wiadomości do naszego workera. To jedyna zmiana w budowie aplikacji.

---

## 7. Koszty

| składnik | plan darmowy (Spark) | czy wystarczy |
|---|---|---|
| Authentication | bez limitu dla e-mail/Google | tak |
| Firestore | 1 GiB, 50 tys. odczytów i 20 tys. zapisów dziennie | tak z ogromnym zapasem (kilkanaście kB na konto) |
| Cloud Messaging | bez limitu | tak |
| Cloud Functions (wariant B) | wymaga planu Blaze | tylko jeśli chcesz harmonogram |

Przy wariancie A (skrypt lokalny) **wszystko mieści się w planie darmowym.**

---

## 8. Plan wdrożenia

**Etap 0 – projekt w konsoli (30 min, twoje).**
Założenie projektu Firebase, Firestore **w regionie europejskim** (nie do zmiany później),
włączenie logowania linkiem e-mail i przez Google, **plan Blaze** (potrzebny do harmonogramu
powiadomień) z ustawionym limitem budżetu, dopisanie domen: `pastormarek.github.io`
i przyszłej subdomeny w `adwent.pl`. Poprowadzę krok po kroku.

**Etap 1 – logowanie i synchronizacja (największy kawałek).**
```
src/lib/firebase.ts     inicjalizacja SDK (ładowana leniwie, żeby nie rosła strona startowa)
src/lib/auth.ts         stan zalogowania, logowanie, wylogowanie, kasowanie konta
src/lib/sync.ts         localStorage ⇄ Firestore, scalanie po znaczniku czasu
src/pages/Konto.tsx     strona konta: zaloguj, synchronizuj, wyeksportuj, skasuj konto
```
`localStore.ts` dostaje wywołanie „zmieniło się" – reszta modułów (`notes`, `prayers`,
`favorites`, `bookmarks`) zostaje bez zmian. Scalanie: przy pierwszym logowaniu suma
zbiorów (nic nie ginie), potem wygrywa nowszy znacznik czasu.

**Etap 2 – powiadomienia.**
Przełączenie PWA na `injectManifest`, zgoda na powiadomienia (pytana **dopiero** przy
świadomym włączeniu, nigdy przy wejściu na stronę), zapis tokenu, skrypt `tools/push.mjs`.

**Etap 3 – porządki prawne.**
Strona polityki prywatności, kasowanie konta, informacja o iOS.

Waga aplikacji urośnie o mniej więcej 90–120 kB po spakowaniu (SDK Firebase, ładowany
leniwie – kto się nie loguje, nie pobiera go wcale).

---

## 9. Co trzeba rozstrzygnąć

Wszystkie pytania z pierwszej wersji tego dokumentu zostały rozstrzygnięte – patrz tabela
na początku. Reguła prywatności jest już przepisana w `CLAUDE.md` tego katalogu.

Zostaje tylko to, czego nie zrobię za ciebie:

1. **Projekt w konsoli Firebase** (etap 0). Powiedz, kiedy siadasz – przeprowadzę cię przez
   ekrany i od razu podłączę kod.
2. **Plan Blaze** – harmonogram powiadomień bez niego nie ruszy. Przy tej skali rachunek
   to praktycznie 0 zł, ale karta musi być wpięta, a limit budżetu ustawiony.
