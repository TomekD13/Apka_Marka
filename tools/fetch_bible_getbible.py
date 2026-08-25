# -*- coding: utf-8 -*-
"""Pobiera wersety przekladu z getbible.net v2 (cala ksiega w jednym pliku - brak
rate-limitu) dla wszystkich osis w studiach danego jezyka i zapisuje
public/content/{lang}/bibles/{TRANSLATION}.json (po osis). Alternatywa dla
fetch_bible.py, gdy api.biblesupersearch.com rate-limituje (429).

Uzycie:
  python tools/fetch_bible_getbible.py <lang> <module> <TRANSLATION> "<Nazwa>" "<licencja>"
  python tools/fetch_bible_getbible.py en web WEB "World English Bible" "Public Domain (WEB)"
"""
import json, os, glob, time, sys, urllib.request, urllib.error

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


def get(url, tries=4):
    delay = 1.5
    for a in range(1, tries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and a < tries:
                print(f'  429 {url} -> czekam {delay:.0f}s'); time.sleep(delay); delay *= 2; continue
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


def book_map(module, num):
    """{chapter:int -> {verse:int -> text}} dla ksiegi 'num' przekladu 'module'."""
    d = get(f'https://api.getbible.net/v2/{module}/{num}.json')
    out = {}
    for ch in d.get('chapters', []):
        cv = {}
        for v in ch.get('verses', []):
            cv[int(v['verse'])] = (v.get('text') or '').strip()
        out[int(ch['chapter'])] = cv
    return out


def verse_text(cv, vspec, offset=0):
    # tekst bierzemy z cv[v+offset] (numeracja zrodla), ale etykietujemy numerem osis (v)
    if '-' in vspec:
        a, b = vspec.split('-', 1)
        rng = range(int(a), int(b) + 1)
    else:
        rng = [int(vspec)]
    out = [(v, cv[v + offset]) for v in rng if (v + offset) in cv and cv[v + offset]]
    if not out:
        return None
    if len(out) == 1:
        return out[0][1]
    return ' '.join(f'({v}) {t}' for v, t in out)


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lang, module, translation = sys.argv[1], sys.argv[2], sys.argv[3]
    _ex = {}
    _exp = os.path.join(CONTENT, lang, 'bibles', f'{translation}.json')
    if os.path.exists(_exp):
        try: _ex = json.load(open(_exp, encoding='utf-8'))
        except Exception: _ex = {}
    name = sys.argv[4] if len(sys.argv) > 4 else _ex.get('name', translation)
    lic = sys.argv[5] if len(sys.argv) > 5 else _ex.get('license', '')
    osis_list = collect_osis(lang)
    by_book = {}
    for o in osis_list:
        by_book.setdefault(o.split('.')[0], []).append(o)

    d = os.path.join(CONTENT, lang, 'bibles')
    outp = os.path.join(d, f'{translation}.json')
    verses = {}
    if os.path.exists(outp):
        try:
            verses = {k: v for k, v in (json.load(open(outp, encoding='utf-8')).get('verses') or {}).items() if v}
        except Exception:
            verses = {}

    # KJV ma numeracje psalmow bez naglowka-wersetu; offset = len(zrodlo) - len(KJV) na rozdzial (0/+1/+2)
    kjv_ps = book_map('kjv', 19) if 'Ps' in by_book else {}
    missing = []
    for bi, (book, osises) in enumerate(sorted(by_book.items()), 1):
        num = OSIS2NUM.get(book)
        if not num:
            print('  ??? nieznana ksiega', book); missing += osises; continue
        cv_all = book_map(module, num)
        for o in osises:
            _, chs, vspec = o.split('.'); ch = int(chs)
            offset = 0
            if book == 'Ps' and ch in cv_all and ch in kjv_ps:
                offset = max(0, len(cv_all[ch]) - len(kjv_ps[ch]))
            txt = verse_text(cv_all.get(ch, {}), vspec, offset)
            if txt:
                verses[o] = txt
            else:
                missing.append(o)
        print(f"[{bi}/{len(by_book)}] {book} (#{num}) -> {len(osises)} osis")
        time.sleep(0.1)

    os.makedirs(d, exist_ok=True)
    out = {'translation': translation, 'name': name, 'lang': lang, 'license': lic, 'verses': verses}
    json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\nZapisano {outp}: {len(verses)} wersetow, brakuje {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
