# -*- coding: utf-8 -*-
"""Pobiera wersety z bolls.life (cale rozdzialy - bez rate-limitu) dla wszystkich
osis uzytych w studiach jezyka zrodlowego (domyslnie PL = zrodlo prawdy) i zapisuje
public/content/{lang}/bibles/{TRANSLATION}.json (po osis).

Uzyte gl. dla ukrainskiego Ogienko (UBIO): numeracja ROZDZIALOW jest hebrajska
(Ps 23 = Pasterz, jak osis), wiec rozdzialy mapuja sie 1:1. ALE sam tekst Ogienka
liczy naglowek niektorych psalmow jako werset 1 -> dla tych psalmow potrzebne
przesuniecie wersetu +1 (PS_VERSE_OFFSET, zweryfikowane recznie wzgledem PL UBG).

Uzycie:
  python tools/fetch_bible_bolls.py <lang> <bolls_code> <TRANSLATION> "<Nazwa>" "<licencja>" [src_lang]
  python tools/fetch_bible_bolls.py uk UBIO UBIO "Biblia. Przeklad Iwana Ogienki (1962)" "Public Domain" pl
"""
import json, os, glob, time, sys, re, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')

OSIS2NUM = {
    'Gen':1,'Exod':2,'Lev':3,'Num':4,'Deut':5,'Josh':6,'Judg':7,'Ruth':8,'1Sam':9,'2Sam':10,
    '1Kgs':11,'2Kgs':12,'1Chr':13,'2Chr':14,'Ezra':15,'Neh':16,'Esth':17,'Job':18,'Ps':19,'Prov':20,
    'Eccl':21,'Song':22,'Isa':23,'Jer':24,'Lam':25,'Ezek':26,'Dan':27,'Hos':28,'Joel':29,'Amos':30,
    'Obad':31,'Jonah':32,'Mic':33,'Nah':34,'Hab':35,'Zeph':36,'Hag':37,'Zech':38,'Mal':39,'Matt':40,
    'Mark':41,'Luke':42,'John':43,'Acts':44,'Rom':45,'1Cor':46,'2Cor':47,'Gal':48,'Eph':49,'Phil':50,
    'Col':51,'1Thess':52,'2Thess':53,'1Tim':54,'2Tim':55,'Titus':56,'Phlm':57,'Heb':58,'Jas':59,
    '1Pet':60,'2Pet':61,'1John':62,'2John':63,'3John':64,'Jude':65,'Rev':66,
}

# Psalmy, w ktorych tekst Ogienka liczy naglowek jako werset 1 -> osis_verse + 1.
# Zweryfikowane recznie wzgledem UBG (tytul "Dla dyrygenta..." osobnym wersetem,
# w odroznieniu od krotkiego "Psalm Dawida" scalonego w werset 1).
PS_VERSE_OFFSET = {8: 1, 34: 1, 40: 1, 42: 1, 46: 1, 55: 1, 56: 1, 62: 1, 77: 1, 88: 1}

TAG = re.compile(r'<[^>]+>')


def get(url, tries=4):
    delay = 1.5
    for a in range(1, tries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 bibleapp/0.1'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and a < tries:
                print(f'  {e.code} {url} -> czekam {delay:.0f}s'); time.sleep(delay); delay *= 2; continue
            raise
    return None


def collect_osis(lang):
    s = set()
    for f in glob.glob(os.path.join(CONTENT, lang, 'studies', '*.json')):
        d = json.load(open(f, encoding='utf-8'))
        for sec in d.get('sections', []):
            for it in sec.get('items', []):
                for p in it.get('passage', []) or []:
                    if p.get('osis'):
                        s.add(p['osis'])
    # osis z fiszek i okazji sa KANONICZNE (te same we wszystkich jezykach) - bierzemy z PL
    fp = os.path.join(CONTENT, 'pl', 'flashcards.json')
    if os.path.exists(fp):
        for th in json.load(open(fp, encoding='utf-8')).get('themes', []):
            for c in th.get('cards', []):
                s.update(c.get('osis', []))
    op = os.path.join(CONTENT, 'pl', 'occasions.json')
    if os.path.exists(op):
        for cat in json.load(open(op, encoding='utf-8')).get('categories', []):
            for v in cat.get('verses', []):
                s.add(v['osis'] if isinstance(v, dict) else v)
    return sorted(s)


def clean(t):
    return TAG.sub('', t or '').replace('\xa0', ' ').strip()


_cache = {}


def chapter_map(code, booknum, chapter):
    key = (code, booknum, chapter)  # WAZNE: kod w kluczu, inaczej KJV/UBIO sie myli (offset!)
    if key in _cache:
        return _cache[key]
    d = get(f'https://bolls.life/get-chapter/{code}/{booknum}/{chapter}/')
    cv = {int(v['verse']): clean(v.get('text')) for v in (d or [])}
    _cache[key] = cv
    time.sleep(0.05)
    return cv


def verse_text(cv, vspec, offset):
    """Zwraca tekst; etykietuje wersety numerami OSIS (hebr.), tekst bierze z cv[v+offset]."""
    if '-' in vspec:
        a, b = vspec.split('-', 1)
        rng = range(int(a), int(b) + 1)
    else:
        rng = [int(vspec)]
    out = [(v, cv.get(v + offset, '')) for v in rng]
    out = [(v, t) for v, t in out if t]
    if not out:
        return None
    if len(out) == 1:
        return out[0][1]
    return ' '.join(f'({v}) {t}' for v, t in out)


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lang, code, translation = sys.argv[1], sys.argv[2], sys.argv[3]
    _exp = os.path.join(CONTENT, lang, 'bibles', f'{translation}.json')
    _ex = json.load(open(_exp, encoding='utf-8')) if os.path.exists(_exp) else {}
    name = sys.argv[4] if len(sys.argv) > 4 else _ex.get('name', translation)
    lic = sys.argv[5] if len(sys.argv) > 5 else _ex.get('license', '')
    src = sys.argv[6] if len(sys.argv) > 6 else 'pl'

    osis_list = collect_osis(src)
    verses, missing = {}, []
    for o in osis_list:
        book, ch, vspec = o.split('.')
        num = OSIS2NUM.get(book)
        if not num:
            print('  ??? nieznana ksiega', book); missing.append(o); continue
        cv = chapter_map(code, num, int(ch))
        offset = 0
        if book == 'Ps':  # offset dynamiczny = len(zrodlo hebr.) - len(KJV) na rozdzial
            offset = max(0, len(cv) - len(chapter_map('KJV', num, int(ch))))
        txt = verse_text(cv, vspec, offset)
        if txt:
            verses[o] = txt
        else:
            missing.append(o)

    d = os.path.join(CONTENT, lang, 'bibles')
    os.makedirs(d, exist_ok=True)
    outp = os.path.join(d, f'{translation}.json')
    out = {'translation': translation, 'name': name, 'lang': lang, 'license': lic, 'verses': verses}
    json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"Zapisano {outp}: {len(verses)} wersetow, brakuje {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
