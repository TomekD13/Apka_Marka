# -*- coding: utf-8 -*-
"""Dla kolekcji 'na rozna okazje' (public/content/{lang}/occasions.json):
  - generuje polski odnosnik (ref) z osis i zapisuje verses jako [{osis, ref}],
  - dociaga teksty wersetow do bibles/{TR}.json (po osis), zachowujac istniejace.
Zrodlo: biblesupersearch (jak fetch_bible.py). Uzycie: python tools/fetch_occasions.py pl pol_ubg UBG
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
API = 'https://api.biblesupersearch.com/api'

OSIS2EN = {
    'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy',
    'Josh': 'Joshua', 'Judg': 'Judges', 'Ruth': 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
    '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
    'Ezra': 'Ezra', 'Neh': 'Nehemiah', 'Esth': 'Esther', 'Job': 'Job', 'Ps': 'Psalms',
    'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa': 'Isaiah',
    'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel', 'Dan': 'Daniel', 'Hos': 'Hosea',
    'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah', 'Mic': 'Micah',
    'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai', 'Zech': 'Zechariah',
    'Mal': 'Malachi', 'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
    'Acts': 'Acts', 'Rom': 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
    'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phil': 'Philippians', 'Col': 'Colossians',
    '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '1Tim': '1 Timothy', '2Tim': '2 Timothy',
    'Titus': 'Titus', 'Phlm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James', '1Pet': '1 Peter',
    '2Pet': '2 Peter', '1John': '1 John', '2John': '2 John', '3John': '3 John', 'Jude': 'Jude',
    'Rev': 'Revelation'
}
OSIS2PL = {
    'Gen': 'Księga Rodzaju', 'Exod': 'Księga Wyjścia', 'Lev': 'Księga Kapłańska', 'Num': 'Księga Liczb',
    'Deut': 'Księga Powtórzonego Prawa', 'Josh': 'Księga Jozuego', 'Judg': 'Księga Sędziów', 'Ruth': 'Księga Rut',
    '1Sam': '1 Księga Samuela', '2Sam': '2 Księga Samuela', '1Kgs': '1 Księga Królewska', '2Kgs': '2 Księga Królewska',
    '1Chr': '1 Księga Kronik', '2Chr': '2 Księga Kronik', 'Ezra': 'Księga Ezdrasza', 'Neh': 'Księga Nehemiasza',
    'Esth': 'Księga Estery', 'Job': 'Księga Hioba', 'Ps': 'Psalm', 'Prov': 'Księga Przysłów',
    'Eccl': 'Księga Kaznodziei', 'Song': 'Pieśń nad Pieśniami', 'Isa': 'Księga Izajasza', 'Jer': 'Księga Jeremiasza',
    'Lam': 'Treny', 'Ezek': 'Księga Ezechiela', 'Dan': 'Księga Daniela', 'Hos': 'Księga Ozeasza',
    'Joel': 'Księga Joela', 'Amos': 'Księga Amosa', 'Obad': 'Księga Abdiasza', 'Jonah': 'Księga Jonasza',
    'Mic': 'Księga Micheasza', 'Nah': 'Księga Nahuma', 'Hab': 'Księga Habakuka', 'Zeph': 'Księga Sofoniasza',
    'Hag': 'Księga Aggeusza', 'Zech': 'Księga Zachariasza', 'Mal': 'Księga Malachiasza', 'Matt': 'Ewangelia Mateusza',
    'Mark': 'Ewangelia Marka', 'Luke': 'Ewangelia Łukasza', 'John': 'Ewangelia Jana', 'Acts': 'Dzieje Apostolskie',
    'Rom': 'List do Rzymian', '1Cor': '1 List do Koryntian', '2Cor': '2 List do Koryntian', 'Gal': 'List do Galatów',
    'Eph': 'List do Efezjan', 'Phil': 'List do Filipian', 'Col': 'List do Kolosan', '1Thess': '1 List do Tesaloniczan',
    '2Thess': '2 List do Tesaloniczan', '1Tim': '1 List do Tymoteusza', '2Tim': '2 List do Tymoteusza',
    'Titus': 'List do Tytusa', 'Phlm': 'List do Filemona', 'Heb': 'List do Hebrajczyków', 'Jas': 'List Jakuba',
    '1Pet': '1 List Piotra', '2Pet': '2 List Piotra', '1John': '1 List Jana', '2John': '2 List Jana',
    '3John': '3 List Jana', 'Jude': 'List Judy', 'Rev': 'Objawienie Jana'
}


_off_cache = {}


def _bolls_count(code, ch):
    try:
        u = f"https://bolls.life/get-text/{code}/19/{ch}/"
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30))
        return len(d)
    except Exception:
        return None


def psalm_offset(ch):
    # numeracja druku UBG = hebrajska (Masorecka); zrodlo (biblesupersearch) = KJV.
    # offset = liczba_wersetow_hebr - liczba_wersetow_KJV (0/1/2) -> doliczamy do numeru w ref.
    if ch in _off_cache:
        return _off_cache[ch]
    h, k = _bolls_count('UBIO', ch), _bolls_count('KJV', ch)
    off = (h - k) if (h and k) else 0
    off = off if off and off > 0 else 0
    _off_cache[ch] = off
    return off


def _shift(vspec, off):
    if not off:
        return vspec
    if '-' in vspec:
        a, b = vspec.split('-', 1)
        return f"{int(a) + off}-{int(b) + off}"
    return str(int(vspec) + off)


def osis_to_pl(osis):
    b, ch, v = osis.split('.')
    if b == 'Ps':
        v = _shift(v, psalm_offset(int(ch)))
    return f"{OSIS2PL.get(b, b)} {ch},{v}"


def fetch(osis, module):
    b, ch, v = osis.split('.')
    ref = f"{OSIS2EN[b]} {ch}:{v}"
    url = f"{API}?bible={module}&reference={urllib.parse.quote(ref)}"
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'}), timeout=30) as r:
        data = json.load(r)
    res = data.get('results') or []
    if not res:
        return None
    chapters = res[0].get('verses', {}).get(module, {})
    out = []
    for c in sorted(chapters, key=lambda x: int(x)):
        for vv in sorted(chapters[c], key=lambda x: int(x)):
            tx = (chapters[c][vv].get('text') or '').strip()
            if tx:
                out.append((int(vv), tx))
    if not out:
        return None
    return out[0][1] if len(out) == 1 else ' '.join(f"({vv}) {tx}" for vv, tx in out)


def fetch_retry(osis, module, tries=6):
    delay = 2.0
    for a in range(1, tries + 1):
        try:
            return fetch(osis, module)
        except urllib.error.HTTPError as e:
            if e.code == 429 and a < tries:
                print(f'  429 {osis} – czekam {delay:.0f}s'); time.sleep(delay); delay = min(delay * 2, 30); continue
            print('  ERR', osis, e); return None
        except Exception as e:
            print('  ERR', osis, e); return None
    return None


def main():
    lang = sys.argv[1] if len(sys.argv) > 1 else 'pl'
    module = sys.argv[2] if len(sys.argv) > 2 else 'pol_ubg'
    translation = sys.argv[3] if len(sys.argv) > 3 else 'UBG'

    op = os.path.join(CONTENT, lang, 'occasions.json')
    oc = json.load(open(op, encoding='utf-8'))

    # normalizuj verses -> [{osis, ref}], zbierz unikalne osis
    osis_all = []
    for cat in oc['categories']:
        norm = []
        for v in cat['verses']:
            osis = v if isinstance(v, str) else v['osis']
            norm.append({'osis': osis, 'ref': osis_to_pl(osis)})
            if osis not in osis_all:
                osis_all.append(osis)
        cat['verses'] = norm
    json.dump(oc, open(op, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    bp = os.path.join(CONTENT, lang, 'bibles', f'{translation}.json')
    bible = json.load(open(bp, encoding='utf-8'))
    verses = bible.get('verses', {})
    to_fetch = [o for o in osis_all if not verses.get(o)]
    print(f"Okazje: {len(oc['categories'])} kategorii, {len(osis_all)} unikalnych wersetow; do pobrania {len(to_fetch)}")
    missing = []
    for i, o in enumerate(to_fetch, 1):
        tx = fetch_retry(o, module)
        if tx:
            verses[o] = tx
        else:
            missing.append(o)
        print(f"  [{i}/{len(to_fetch)}] {o} {'OK' if tx else 'BRAK'}")
        time.sleep(0.25)
    bible['verses'] = verses
    json.dump(bible, open(bp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\nUBG: {len(verses)} wersetow lacznie; brak: {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
