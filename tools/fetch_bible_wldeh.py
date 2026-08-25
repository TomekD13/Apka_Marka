# -*- coding: utf-8 -*-
"""Pobiera wersety z wldeh/bible-api (jsDelivr CDN, per-werset, bez limitu) dla wszystkich
osis w studiach danego jezyka. Uzywane np. dla swahili (Neno 2015 = modul 'swh-onen'),
ktorego getbible nie ma w pelni. Mapa osis->slug ksiegi jest specyficzna dla modulu.

Uzycie:
  python tools/fetch_bible_wldeh.py <lang> <wldeh_bible_id> <TRANSLATION> "<Nazwa>" "<licencja>"
  python tools/fetch_bible_wldeh.py sw swh-onen NENO "Neno: Biblia Takatifu (2015)" "Biblica Open (licencja otwarta)"
"""
import json, os, glob, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
CDN = 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles'

# osis -> slug ksiegi w module swh-onen (Neno). Pasuje tez do innych modulow,
# jesli uzywaja tych samych slugow; w razie potrzeby rozszerzyc/parametryzowac.
OSIS2SLUG = {
    'Gen': 'mwanzo', 'Exod': 'kutoka', 'Lev': 'walawi', 'Num': 'hesabu', 'Deut': 'kumbukumbu',
    'Josh': 'yoshua', 'Judg': 'waamuzi', 'Ruth': 'ruthu', '1Sam': '1samweli', '2Sam': '2samweli',
    '1Kgs': '1wafalme', '2Kgs': '2wafalme', '1Chr': '1nyakati', '2Chr': '2nyakati', 'Ezra': 'ezra',
    'Neh': 'nehemia', 'Esth': 'esta', 'Job': 'ayubu', 'Ps': 'zaburi', 'Prov': 'mithali',
    'Eccl': 'mhubiri', 'Song': 'wimbo', 'Isa': 'isaya', 'Jer': 'yeremia', 'Lam': 'maombolezo',
    'Ezek': 'ezekieli', 'Dan': 'danieli', 'Hos': 'hosea', 'Joel': 'yoeli', 'Amos': 'amosi',
    'Obad': 'obadia', 'Jonah': 'yona', 'Mic': 'mika', 'Nah': 'nahumu', 'Hab': 'habakuki',
    'Zeph': 'sefania', 'Hag': 'hagai', 'Zech': 'zekaria', 'Mal': 'malaki', 'Matt': 'mathayo',
    'Mark': 'marko', 'Luke': 'luka', 'John': 'yohana', 'Acts': 'matendo', 'Rom': 'warumi',
    '1Cor': '1wakorintho', '2Cor': '2wakorintho', 'Gal': 'wagalatia', 'Eph': 'waefeso',
    'Phil': 'wafilipi', 'Col': 'wakolosai', '1Thess': '1wathesalonike', '2Thess': '2wathesalonike',
    '1Tim': '1timotheo', '2Tim': '2timotheo', 'Titus': 'tito', 'Phlm': 'filemoni', 'Heb': 'waebrania',
    'Jas': 'yakobo', '1Pet': '1petro', '2Pet': '2petro', '1John': '1yohana', '2John': '2yohana',
    '3John': '3yohana', 'Jude': 'yuda', 'Rev': 'ufunuo',
}


def fetch_verse(bible, slug, ch, v):
    url = f"{CDN}/{bible}/books/{slug}/chapters/{ch}/verses/{v}.json"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'}), timeout=30) as r:
            return (json.load(r).get('text') or '').strip()
    except Exception:
        return None


def verses_for(osis, bible):
    parts = osis.split('.')
    if len(parts) != 3:
        return None
    book, ch, vspec = parts
    slug = OSIS2SLUG.get(book)
    if not slug:
        return None
    nums = (lambda a, b: list(range(int(a), int(b) + 1)))(*vspec.split('-')) if '-' in vspec else [int(vspec)]
    out = [(v, t) for v in nums for t in [fetch_verse(bible, slug, ch, v)] if t]
    if not out:
        return None
    return out[0][1] if len(out) == 1 else ' '.join(f'({v}) {t}' for v, t in out)


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


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lang, bible, translation = sys.argv[1], sys.argv[2], sys.argv[3]
    _ex = {}
    _exp = os.path.join(CONTENT, lang, 'bibles', f'{translation}.json')
    if os.path.exists(_exp):
        try: _ex = json.load(open(_exp, encoding='utf-8'))
        except Exception: _ex = {}
    name = sys.argv[4] if len(sys.argv) > 4 else _ex.get('name', translation)
    lic = sys.argv[5] if len(sys.argv) > 5 else _ex.get('license', '')
    osis_list = collect_osis(lang)
    d = os.path.join(CONTENT, lang, 'bibles')
    outp = os.path.join(d, f'{translation}.json')
    verses = {}
    if os.path.exists(outp):
        try:
            verses = {k: v for k, v in (json.load(open(outp, encoding='utf-8')).get('verses') or {}).items() if v}
        except Exception:
            verses = {}
    todo = [o for o in osis_list if not verses.get(o)]
    print(f"Do pobrania: {len(todo)} / {len(osis_list)}")
    with ThreadPoolExecutor(max_workers=16) as ex:
        results = list(ex.map(lambda o: (o, verses_for(o, bible)), todo))
    missing = []
    for o, txt in results:
        if txt:
            verses[o] = txt
        else:
            missing.append(o)
    os.makedirs(d, exist_ok=True)
    out = {'translation': translation, 'name': name, 'lang': lang, 'license': lic, 'verses': verses}
    json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"Zapisano {outp}: {len(verses)} wersetow, brakuje {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
