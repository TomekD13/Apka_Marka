# -*- coding: utf-8 -*-
"""Buduje liste przekladow z ph4.org do `public/content/{lang}/bible/sources.json`.

ph4.org ma najwiekszy zbior polskich modulow MyBible (UBG, Gdanska, Tysiaclecia, EIB,
Paulistow, torunski, interlinia). Ten skrypt wyciaga ze strony jezykowej nazwy przekladow
i bezposrednie adresy plikow, zeby czytelnik widzial je w aplikacji i pobieral jednym
kliknieciem, zamiast szukac na obcej stronie.

Czego skrypt NIE robi: nie pobiera modulow i nie kladzie ich u nas. Pliki zostaja na
ph4.org, a przeklady sa chronione prawem autorskim - kopie robi sobie sam czytelnik.

Uzycie:
  python tools/fetch_ph4_catalog.py            # pl, zapis do sources.json
  python tools/fetch_ph4_catalog.py --check    # sam raport, bez zapisu
  python tools/fetch_ph4_catalog.py --sizes    # dolicz wagi plikow (60 zapytan HEAD)
  python tools/fetch_ph4_catalog.py --lang uk  # inny jezyk na ph4

UWAGA: ph4.org nie oddaje naglowka CORS, wiec aplikacja NIE moze pobrac tych plikow sama.
Klikniecie pobiera plik przegladarka (to zwykle pobranie, nie zapytanie z kodu), a czytelnik
wskazuje go potem w „Wczytaj plik modulu". Gdyby ph4 kiedys CORS dodalo, aplikacja sprobuje
pobrac plik sama - kod jest na to gotowy (`installFromUrl`).
"""
import io
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
PAGE = 'https://www.ph4.org/b4_1.php?l={0}'
BASE = 'https://www.ph4.org/'

# Strona dzieli moduly na sekcje: BIBLES, NEW TESTAMENT, DICTIONARIES, COMMENTARIES…
# Slowniki i komentarze pomijamy - aplikacja czyta tylko tekst Pisma.
SECTION = re.compile(r'<big>(?:&nbsp;)*([A-Z][A-Z /]+)</big>')
SKIP_SECTIONS = ('DICTIONAR', 'COMMENTAR', 'DEVOTION', 'BOOK', 'CROSS', 'SUBHEADING')
# pozycja oznaczona <b>BIBLE</b> to caly kanon; reszta to NT, Psalmy, fragmenty
COMPLETE = re.compile(r"<sup>\d+\.\s*<a href='b4_1\.php\?y=bbl'[^>]*><b>BIBLE</b>")

# Jeden modul w tabeli: link do pobrania, skrot z rokiem, kod w nawiasie, nazwa polska.
ENTRY = re.compile(
    r'href="(_dl\.php\?back=bbl&a=(?P<code>[^&"]+)&b=mybible[^"]*)"'      # link do pliku
    r'.*?<nobr><b>(?P<abbr>[^<]+)</b>\s*(?P<year>[^<]*)</nobr>'          # skrot i rok
    r'.*?<div class=btl>(?P<name>[^<]+)</div>',                          # nazwa przekladu
    re.S,
)
TAGS = re.compile(r'<[^>]+>')


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 bibleapp/0.1'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def size_kb(url):
    """Waga pliku z naglowka - bez pobierania calosci."""
    try:
        req = urllib.request.Request(url, method='HEAD',
                                     headers={'User-Agent': 'Mozilla/5.0 bibleapp/0.1'})
        with urllib.request.urlopen(req, timeout=45) as r:
            n = r.headers.get('Content-Length')
            return int(round(int(n) / 1024.0)) if n else None
    except Exception:
        return None


def section_at(html, pos, sections):
    """Nazwa sekcji, w ktorej stoi dana pozycja."""
    name = ''
    for at, label in sections:
        if at > pos:
            break
        name = label
    return name


def parse(html):
    sections = [(m.start(), m.group(1).strip()) for m in SECTION.finditer(html)]
    out = []
    seen = set()
    for m in ENTRY.finditer(html):
        code = m.group('code').strip()
        if code in seen:
            continue
        section = section_at(html, m.start(), sections)
        if any(section.startswith(s) for s in SKIP_SECTIONS):
            continue
        seen.add(code)
        # calosc kanonu poznajemy po etykiecie BIBLE stojacej przy numerze pozycji
        head = html[max(0, m.start() - 600):m.start()]
        complete = bool(COMPLETE.search(head))
        name = TAGS.sub('', m.group('name')).strip()
        abbr = TAGS.sub('', m.group('abbr')).strip()
        year = TAGS.sub('', m.group('year')).strip()
        label = '{0} {1}'.format(name, year).strip() if year and year not in name else name
        out.append({
            'code': code,
            'abbr': abbr,
            'name': label,
            'url': BASE + m.group(1).replace('&amp;', '&'),
            'complete': complete,
        })
    return out


def main(argv):
    lang = 'pl'
    for i, a in enumerate(argv):
        if a == '--lang' and i + 1 < len(argv):
            lang = argv[i + 1]
    check = '--check' in argv
    sizes = '--sizes' in argv

    html = fetch(PAGE.format(lang))
    items = parse(html)
    print('{0}: znaleziono {1} modulow MyBible ({2} pelnych Biblii)'.format(
        lang, len(items), sum(1 for i in items if i['complete'])))
    if not items:
        print('  nic nie sparsowano - uklad strony sie zmienil, popraw wzorzec ENTRY')
        return 1

    if sizes:
        for it in items:
            kb = size_kb(it['url'])
            if kb:
                it['sizeKB'] = kb
            print('  {0:12s} {1:6s} {2}{3}'.format(
                it['code'], str(it.get('sizeKB', '?')), '' if it['complete'] else '(fragment) ', it['name']))
    else:
        for it in items:
            print('  {0:12s} {1}{2}'.format(it['code'], '' if it['complete'] else '(fragment) ', it['name']))

    if check:
        return 0

    path = os.path.join(CONTENT, lang, 'bible', 'sources.json')
    with io.open(path, encoding='utf-8') as f:
        data = json.load(f)
    catalogs = data.get('catalogs') or []
    target = next((c for c in catalogs if 'ph4.' in c.get('url', '')), None)
    if target is None:
        print('  brak wpisu ph4.org w catalogs - dopisz go najpierw recznie')
        return 1
    target['items'] = items
    with io.open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('  zapisano do {0}'.format(path))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
