// Flaga nowosci z wydania testowego (/beta/).
//
// 2026-10-02 autor przeniosl bete na strone glowna: wszystko, co stalo za ta flaga
// (konto, plany czytania, ulubione, przeczytane, notatki z zaznaczenia...), jest
// juz wlaczone wszedzie. Kolejna nowosc tylko na bete = przywroc warunek:
//   export const BETA = import.meta.env.DEV || import.meta.env.BASE_URL === '/beta/'
// i schowaj za nim tylko te nowa rzecz (albo daj jej osobna flage).
export const BETA = true
