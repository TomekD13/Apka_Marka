# -*- coding: utf-8 -*-
"""Czytnik przekladow w formacie .yes (moduly Alkitab) – Warszawska, Tysiaclecia.

Sluzy do siegania po pojedyncze wersety, gdy Biblia Ekumeniczna ma w danym
miejscu slabe rozwiazanie translatorskie. Cytat spoza BE oznaczamy skrotem.

Struktura pliku (wersja 1):
  naglowek 8B, potem sekcje: nazwa (12B ASCII, dopelniona '_') + dlugosc (4B BE) + dane.
  `infoKitab___` – pola klucz-wartosc na ksiege: nama/judul (1B dlugosci + UTF-16BE),
                   npasal (4B BE, liczba rozdzialow), nayat (npasal bajtow = liczby wersetow).
  `teks________` – caly tekst w UTF-8, wersety rozdzielone '\\n', w kolejnosci kanonicznej.

Uzycie z linii polecen:
  python tools/yes_bible.py <plik.yes> <SKROT> <rozdzial> <werset>[-<werset>]
  python tools/yes_bible.py <plik.yes> --ksiegi
"""
import os, re, struct, sys

# skrot OSIS -> `nama` w module .yes (nazwy polskie, wielkimi literami)
OSIS2YES = {
    'Gen': 'RDZ', 'Exod': 'WYJ', 'Lev': 'KPŁ', 'Num': 'LB', 'Deut': 'PWT',
    'Josh': 'JOZ', 'Judg': 'SDZ', 'Ruth': 'RUT', '1Sam': '1SM', '2Sam': '2SM',
    '1Kgs': '1KRL', '2Kgs': '2KRL', '1Chr': '1KRN', '2Chr': '2KRN',
    'Ezra': 'EZD', 'Neh': 'NE', 'Esth': 'EST', 'Job': 'HI', 'Ps': 'PS',
    'Prov': 'PRZ', 'Eccl': 'KOH', 'Song': 'PNP', 'Isa': 'IZ', 'Jer': 'JER',
    'Lam': 'LAM', 'Ezek': 'EZ', 'Dan': 'DAN', 'Hos': 'OZ', 'Joel': 'LJ',
    'Amos': 'AM', 'Obad': 'AB', 'Jonah': 'JON', 'Mic': 'MI', 'Nah': 'NA',
    'Hab': 'HA', 'Zeph': 'SO', 'Hag': 'AG', 'Zech': 'ZA', 'Mal': 'ML',
    'Matt': 'MT', 'Mark': 'MK', 'Luke': 'ŁK', 'John': 'JAN', 'Acts': 'DZ',
    'Rom': 'RZ', '1Cor': '1KOR', '2Cor': '2KOR', 'Gal': 'GAL', 'Eph': 'EF',
    'Phil': 'FLP', 'Col': 'KOL', '1Thess': '1TES', '2Thess': '2TES',
    '1Tim': '1TM', '2Tim': '2TM', 'Titus': 'TYT', 'Phlm': 'FLM', 'Heb': 'HEB',
    'Jas': 'JK', '1Pet': '1P', '2Pet': '2P', '1John': '1J', '2John': '2J',
    '3John': '3J', 'Jude': 'JUD', 'Rev': 'AP',
}


def _sections(data):
    """{nazwa: bytes} – sekcje pliku."""
    out, pos = {}, 8
    while pos + 16 <= len(data):
        name = data[pos:pos + 12].decode('ascii', 'replace').rstrip('_')
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', name or ''):
            break
        ln = struct.unpack('>I', data[pos + 12:pos + 16])[0]
        out[name] = data[pos + 16:pos + 16 + ln]
        pos += 16 + ln
    return out


def _key(body, pos):
    """Odczyt nazwy pola: 1B dlugosci + UTF-16BE. Zwraca (nazwa, nowa_pozycja)."""
    n = body[pos]
    return body[pos + 1:pos + 1 + 2 * n].decode('utf-16-be'), pos + 1 + 2 * n


class YesBible:
    """Przeklad z modulu .yes; `verse('Ps', 23, 1)` -> tekst wersetu."""

    def __init__(self, path):
        data = open(path, 'rb').read()
        secs = _sections(data)
        self.name = os.path.splitext(os.path.basename(path))[0]
        self.lines = secs['teks'].decode('utf-8', 'replace').split('\n')
        self.books = {}                       # nama -> {'first': indeks, 'nayat': [...]}
        body, first = secs['infoKitab'], 0
        # Pola maja zmienne typy, wiec zamiast isc bajt po bajcie szukamy kluczy
        # po ich zakodowanej postaci (1B dlugosci + UTF-16BE nazwy).
        def enc(name):
            return bytes([len(name)]) + name.encode('utf-16-be')
        K_NAMA, K_NPASAL, K_NAYAT = enc('nama'), enc('npasal'), enc('nayat')
        pos = 0
        while True:
            i = body.find(K_NAMA, pos)
            if i < 0:
                break
            nama, p = _key(body, i + len(K_NAMA))
            j = body.find(K_NPASAL, p)
            if j < 0:
                break
            npasal = struct.unpack('>I', body[j + len(K_NPASAL):j + len(K_NPASAL) + 4])[0]
            k = body.find(K_NAYAT, j)
            if k < 0:
                break
            start = k + len(K_NAYAT)
            nayat = list(body[start:start + npasal])
            self.books[nama] = {'first': first, 'nayat': nayat}
            first += sum(nayat)
            pos = start + npasal

    def verse(self, osis_book, chapter, verse):
        """Tekst wersetu albo None. `osis_book` to skrot OSIS (np. '1Cor')."""
        b = self.books.get(OSIS2YES.get(osis_book, osis_book))
        if not b or not (1 <= chapter <= len(b['nayat'])):
            return None
        if not (1 <= verse <= b['nayat'][chapter - 1]):
            return None
        idx = b['first'] + sum(b['nayat'][:chapter - 1]) + verse - 1
        return self.lines[idx].strip() if idx < len(self.lines) else None

    def passage(self, osis_book, chapter, v0, v1=None):
        """Sklejony zakres w formacie uzywanym przez aplikacje: '(N) tekst …'."""
        v1 = v1 or v0
        parts = [(v, self.verse(osis_book, chapter, v)) for v in range(v0, v1 + 1)]
        parts = [(v, t) for v, t in parts if t]
        if not parts:
            return None
        if len(parts) == 1 and v0 == v1:
            return parts[0][1]
        return ' '.join('(%d) %s' % (v, t) for v, t in parts)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    bib = YesBible(sys.argv[1])
    if '--ksiegi' in sys.argv:
        print('%d ksiag: %s' % (len(bib.books), ', '.join(bib.books)))
        return
    book, ch, spec = sys.argv[2], int(sys.argv[3]), sys.argv[4]
    v0, v1 = (int(x) for x in (spec.split('-') if '-' in spec else (spec, spec)))
    print(bib.passage(book, ch, v0, v1) or '(brak)')


if __name__ == '__main__':
    main()
