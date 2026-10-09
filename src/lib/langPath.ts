// Kazda trasa zaczyna sie od kodu jezyka (/pl/...). Adres bez niego - wpisany recznie
// albo z czyjegos linku, np. /edukacja - router bral za jezyk „edukacja”: nie wczytywala
// sie zadna tresc, a linki w menu robily z tego /edukacja/edukacja. Taki adres
// przekierowujemy pod jezyk domyslny.

/**
 * Adres, pod ktory przekierowac sciezke z nieznanym kodem jezyka, albo null, gdy jezyk
 * jest znany. `sections` to pierwsze czlony tras aplikacji (biblia, edukacja, 40-dni...).
 */
export function fixLangPath(pathname: string, known: string[], fallback: string, sections: string[]): string | null {
  const [, first = '', ...rest] = pathname.split('/')
  if (!first || known.includes(first)) return null
  // /en/biblia - kod jezyka, ktorego nie ma; /edukacja/biblia - link zbudowany z menu,
  // gdy „edukacja” udawala jezyk. W obu razach pierwszy czlon zajmuje miejsce jezyka.
  if (/^[a-z]{2,3}$/i.test(first) || (rest.length > 0 && sections.includes(rest[0]))) {
    return `/${fallback}/${rest.join('/')}`
  }
  // /edukacja, /edukacja/3, /biblia/Gen/1 - brakuje samego kodu jezyka
  return `/${fallback}${pathname}`
}
