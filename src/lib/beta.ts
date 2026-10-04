// Flaga nowosci z wydania testowego. Od 2026-10-04 beta zyje na GitHub Pages
// (https://tomekd13.github.io/Apka_Marka/, base /Apka_Marka/), nie na serwerze.
//
// 2026-10-02 autor przeniosl bete na strone glowna: wszystko, co stalo za ta flaga
// (konto, plany czytania, ulubione, przeczytane, notatki z zaznaczenia...), jest
// juz wlaczone wszedzie. Kolejna nowosc tylko na bete = przywroc warunek:
//   export const BETA = import.meta.env.DEV || import.meta.env.BASE_URL === '/Apka_Marka/'
// i schowaj za nim tylko te nowa rzecz (albo daj jej osobna flage).
export const BETA = true
