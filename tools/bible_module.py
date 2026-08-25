# -*- coding: utf-8 -*-
"""Robi MODUL przekladu do wczytania w aplikacji (`/pl/biblia` → „Dodaj własny przekład").

Modul to jeden plik JSON:

    {"index": {"translation": "BW", "name": "...", "lang": "pl", "license": "...",
               "books": [{"osis": "Gen", "name": "...", "abbr": "Rdz",
                          "testament": "ot", "chapters": [31, 25, ...]}]},
     "books": {"Gen": [["werset 1", "werset 2", ...], ...]}}

Czytelnik wgrywa taki plik ze swojego dysku; modul zostaje w jego przegladarce
(IndexedDB) i nigdzie nie jest wysylany. Dzieki temu mozna czytac przeklad, ktorego
aplikacji nie wolno rozpowszechniac – plik nie trafia na serwer.

Zrodla, ktore ten skrypt czyta:

  yes       moduly Alkitab `.yes` (czytnik `yes_bible.py`): `Biblie/Warszawska.yes`,
            `Biblie/Tysiaclecia.yes`, `Biblie/Warszawsko-praska.yes`
  zefania   Zefania XML (`<BIBLEBOOK bnumber><CHAPTER cnumber><VERS vnumber>`)
  osis      OSIS XML (`<div type="book" osisID><chapter><verse osisID="Gen.1.1">`)
  json      katalog zbudowany przez `build_bible_full.py`
            (`public/content/pl/bible/UBG/`) – do zrobienia pliku z gotowego przekladu

Uzycie:
  python tools/bible_module.py yes ../Biblie/Warszawska.yes BW "Biblia Warszawska (1975)" \
      --license "© Towarzystwo Biblijne w Polsce. Kopia na wlasny uzytek." -o BW.bible.json
  python tools/bible_module.py zefania PBG.xml PBG "Biblia Gdanska (1881)" --license "Domena publiczna"
  python tools/bible_module.py json public/content/pl/bible/UBG UBG "Uwspolczesniona Biblia Gdanska"

UWAGA – wersyfikacja. Aplikacja trzyma odnosniki w numeracji protestanckiej (KJV),
tak jak `osis` w studiach. Modul z przekladu idacego za tekstem hebrajskim (numeracja
psalmow przesunieta o nadpis – tak ma Biblia Ekumeniczna) bedzie sie o werset rozjezdzal
z odnosnikami w studiach. Skrypt tego nie przelicza i nie zgaduje.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Nazwy i skroty ksiag – jedno zrodlo prawdy dla wszystkich zrodel.
from build_bible_full import BOOKS, OT_COUNT  # noqa: E402

BY_OSIS = dict((osis, (name, abbr)) for osis, name, abbr in BOOKS)
ORDER = dict((osis, i) for i, (osis, _n, _a) in enumerate(BOOKS))

# OSIS -> skrot natywny w modulach Alkitab (`yes_bible.py` przyjmuje jedno i drugie,
# ale numeracja ksiag w pliku idzie po kolejnosci kanonu, wiec pytamy po osis).
CLEAN_WS = re.compile('[ \\t\\u00a0]+')


def _finish(chapters):
    """Przycina puste ogony i liczy dlugosci rozdzialow."""
    while chapters and not any(chapters[-1]):
        chapters.pop()
    return chapters, [len(c) for c in chapters]


def from_yes(path):
    """Modul Alkitab `.yes` – przez czytnik `yes_bible.py` (bez zaleznosci zewnetrznych).

    Liczby rozdzialow i wersetow bierzemy z naglowka modulu (`nayat`), nie z prob
    odczytu „az do None" – inaczej pojedyncza luka w tekscie urwalaby ksiege.
    """
    from yes_bible import OSIS2YES, YesBible

    b = YesBible(path)
    out = {}
    for osis, _name, _abbr in BOOKS:
        info = b.books.get(OSIS2YES.get(osis, osis))
        if not info:
            continue
        chapters = []
        for ch, count in enumerate(info['nayat'], start=1):
            verses = []
            for v in range(1, count + 1):
                text = b.verse(osis, ch, v) or ''
                verses.append(CLEAN_WS.sub(' ', text).strip())
            chapters.append(verses)
        if chapters:
            out[osis] = chapters
    return out


def from_zefania(path):
    """Zefania XML – ksiegi numerowane 1-66 w kolejnosci kanonu."""
    import xml.etree.ElementTree as ET

    root = ET.parse(path).getroot()
    out = {}
    for book in root.iter('BIBLEBOOK'):
        try:
            n = int(book.get('bnumber'))
        except (TypeError, ValueError):
            continue
        if not 1 <= n <= len(BOOKS):
            continue
        osis = BOOKS[n - 1][0]
        chapters = []
        for chapter in book.iter('CHAPTER'):
            verses = {}
            for vers in chapter.iter('VERS'):
                try:
                    vn = int(vers.get('vnumber'))
                except (TypeError, ValueError):
                    continue
                verses[vn] = CLEAN_WS.sub(' ', ''.join(vers.itertext())).strip()
            top = max(verses) if verses else 0
            chapters.append([verses.get(i, '') for i in range(1, top + 1)])
        if chapters:
            out[osis] = chapters
    return out


def from_osis(path):
    """OSIS XML – wersety maja osisID w postaci `Gen.1.1`."""
    import xml.etree.ElementTree as ET

    root = ET.parse(path).getroot()
    verses = {}
    for el in root.iter():
        if not el.tag.endswith('}verse') and el.tag != 'verse':
            continue
        osis_id = el.get('osisID')
        if not osis_id:
            continue
        for one in osis_id.split():
            parts = one.split('.')
            if len(parts) != 3:
                continue
            book, ch, v = parts[0], parts[1], parts[2]
            try:
                verses.setdefault(book, {}).setdefault(int(ch), {})[int(v)] = CLEAN_WS.sub(
                    ' ', ''.join(el.itertext())).strip()
            except ValueError:
                continue
    out = {}
    for book, chs in verses.items():
        if book not in BY_OSIS:
            continue
        top_ch = max(chs)
        chapters = []
        for c in range(1, top_ch + 1):
            vs = chs.get(c, {})
            top_v = max(vs) if vs else 0
            chapters.append([vs.get(i, '') for i in range(1, top_v + 1)])
        out[book] = chapters
    return out


def from_json_dir(path):
    """Katalog zbudowany przez `build_bible_full.py`."""
    out = {}
    for osis, _name, _abbr in BOOKS:
        f = os.path.join(path, osis + '.json')
        if not os.path.exists(f):
            continue
        with io.open(f, encoding='utf-8') as fh:
            out[osis] = json.load(fh).get('chapters') or []
    return out


READERS = {'yes': from_yes, 'zefania': from_zefania, 'osis': from_osis, 'json': from_json_dir}


def build(kind, src, code, name, license_text, out_path, lang='pl'):
    books = READERS[kind](src)
    if not books:
        print('Nie udalo sie odczytac ani jednej ksiegi z: ' + src)
        return 2

    index_books = []
    payload = {}
    total = 0
    for osis in sorted(books, key=lambda o: ORDER.get(o, 999)):
        if osis not in BY_OSIS:
            continue
        chapters, lengths = _finish(books[osis])
        if not chapters:
            continue
        bname, abbr = BY_OSIS[osis]
        index_books.append({
            'osis': osis, 'name': bname, 'abbr': abbr,
            'testament': 'ot' if ORDER[osis] < OT_COUNT else 'nt',
            'chapters': lengths,
        })
        payload[osis] = chapters
        total += sum(1 for c in chapters for v in c if v)

    module = {
        'index': {
            'translation': code, 'name': name, 'lang': lang,
            'license': license_text, 'source': os.path.basename(src),
            'books': index_books,
        },
        'books': payload,
    }
    with io.open(out_path, 'w', encoding='utf-8') as f:
        json.dump(module, f, ensure_ascii=False, separators=(',', ':'))
    size = os.path.getsize(out_path) / 1024.0 / 1024.0
    print('{0}: {1} ksiag, {2} wersetow -> {3} ({4:.2f} MB)'.format(
        code, len(index_books), total, out_path, size))
    missing = [o for o, _n, _a in BOOKS if o not in payload]
    if missing:
        print('  brak ksiag ({0}): {1}'.format(len(missing), ', '.join(missing)))
    return 0


def main(argv):
    if len(argv) < 4:
        print(__doc__)
        return 2
    kind, src, code, name = argv[0], argv[1], argv[2], argv[3]
    if kind not in READERS:
        print('Nieznane zrodlo: {0}. Dostepne: {1}'.format(kind, ', '.join(READERS)))
        return 2
    license_text = ''
    out_path = code + '.bible.json'
    lang = 'pl'
    rest = argv[4:]
    for i, a in enumerate(rest):
        if a == '--license' and i + 1 < len(rest):
            license_text = rest[i + 1]
        elif a in ('-o', '--out') and i + 1 < len(rest):
            out_path = rest[i + 1]
        elif a == '--lang' and i + 1 < len(rest):
            lang = rest[i + 1]
    if not license_text:
        license_text = 'Przekład wgrany przez czytelnika – kopia na własny użytek.'
    return build(kind, src, code, name, license_text, out_path, lang)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
