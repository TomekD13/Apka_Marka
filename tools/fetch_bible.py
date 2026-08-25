# -*- coding: utf-8 -*-
"""Pobiera wersety przekładu z API Bible SuperSearch dla wszystkich odnośników osis
w studiach danego języka i zapisuje public/content/{lang}/bibles/{TRANSLATION}.json (po osis).

Użycie:
  python fetch_bible.py <lang> <module> <TRANSLATION> "<Nazwa>" "<licencja>"
Przykłady:
  python fetch_bible.py pl pol_ubg UBG "Uwspółcześniona Biblia Gdańska (2017)" "UBG © Fundacja Wrota Nadziei…"
  python fetch_bible.py en web WEB "World English Bible" "Public Domain (WEB)"
"""
import json, os, glob, time, sys, urllib.parse, urllib.request, urllib.error

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


def osis_to_ref(osis):
    parts = osis.split('.')
    book = OSIS2EN.get(parts[0])
    if not book or len(parts) < 3:
        return None
    return f"{book} {parts[1]}:{parts[2]}"


def fetch(osis, module):
    ref = osis_to_ref(osis)
    if not ref:
        return None
    url = f"{API}?bible={module}&reference={urllib.parse.quote(ref)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    res = data.get('results') or []
    if not res:
        return None
    chapters = res[0].get('verses', {}).get(module, {})
    out = []
    for ch in sorted(chapters, key=lambda x: int(x)):
        for v in sorted(chapters[ch], key=lambda x: int(x)):
            t = (chapters[ch][v].get('text') or '').strip()
            if t:
                out.append((int(v), t))
    if not out:
        return None
    if len(out) == 1:
        return out[0][1]
    return ' '.join(f"({v}) {t}" for v, t in out)


def fetch_with_retry(osis, module, tries=6):
    """Pobiera werset; przy 429 (rate limit) ponawia z rosnącym odstępem."""
    delay = 2.0
    for attempt in range(1, tries + 1):
        try:
            return fetch(osis, module)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries:
                print(f'  429 {osis} – czekam {delay:.0f}s (proba {attempt}/{tries})')
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            print('  ERR', osis, e)
            return None
        except Exception as e:
            print('  ERR', osis, e)
            return None
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
    return sorted(s)


def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lang, module, translation = sys.argv[1], sys.argv[2], sys.argv[3]
    name = sys.argv[4] if len(sys.argv) > 4 else translation
    lic = sys.argv[5] if len(sys.argv) > 5 else ''
    osis_list = collect_osis(lang)
    d = os.path.join(CONTENT, lang, 'bibles')
    outp = os.path.join(d, f'{translation}.json')
    # zachowaj już pobrane wersety (przyrostowo) – nie tracimy ich przy ponownym uruchomieniu
    existing = {}
    if os.path.exists(outp):
        try:
            existing = (json.load(open(outp, encoding='utf-8')) or {}).get('verses', {}) or {}
        except Exception:
            existing = {}
    verses = {k: v for k, v in existing.items() if v}
    to_fetch = [o for o in osis_list if not verses.get(o)]
    print(f"Do pobrania: {len(to_fetch)} / {len(osis_list)} (z cache: {len(osis_list) - len(to_fetch)})")
    os.makedirs(d, exist_ok=True)

    def save():
        out = {'translation': translation, 'name': name, 'lang': lang, 'license': lic, 'verses': verses}
        json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    missing = []
    for i, osis in enumerate(to_fetch, 1):
        txt = fetch_with_retry(osis, module)
        if txt:
            verses[osis] = txt
        else:
            missing.append(osis)
        print(f"[{i}/{len(to_fetch)}] {osis} {'OK' if txt else 'BRAK'}")
        if i % 25 == 0:
            save()  # checkpoint - odporne na przerwanie, wznawialne (przyrostowo)
        time.sleep(0.25)
    save()
    print(f"\nZapisano {outp}: {len(verses)} wersetów, brakuje {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
