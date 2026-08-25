# -*- coding: utf-8 -*-
"""Dociaga teksty wersetow z zestawu fiszek (public/content/{lang}/flashcards.json)
do pliku przekladu bibles/{TRANSLATION}.json (po osis), zachowujac juz pobrane.
Zrodlo: biblesupersearch (jak fetch_bible.py).

Uzycie:
  python tools/fetch_flashcards.py pl pol_ubg UBG
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


def osis_to_ref(osis):
    p = osis.split('.')
    book = OSIS2EN.get(p[0])
    if not book or len(p) < 3:
        return None
    return f"{book} {p[1]}:{p[2]}"


def fetch(osis, module):
    ref = osis_to_ref(osis)
    if not ref:
        return None
    url = f"{API}?bible={module}&reference={urllib.parse.quote(ref)}"
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'}), timeout=30) as r:
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

    fc = json.load(open(os.path.join(CONTENT, lang, 'flashcards.json'), encoding='utf-8'))
    osis_list = []
    for th in fc.get('themes', []):
        for c in th.get('cards', []):
            for o in c.get('osis', []):
                if o not in osis_list:
                    osis_list.append(o)

    outp = os.path.join(CONTENT, lang, 'bibles', f'{translation}.json')
    bible = json.load(open(outp, encoding='utf-8'))
    verses = bible.get('verses', {})

    to_fetch = [o for o in osis_list if not verses.get(o)]
    print(f"Fiszki: {len(osis_list)} segmentow osis; do pobrania {len(to_fetch)} (reszta z cache)")
    missing = []
    for i, o in enumerate(to_fetch, 1):
        t = fetch_retry(o, module)
        if t:
            verses[o] = t
        else:
            missing.append(o)
        print(f"  [{i}/{len(to_fetch)}] {o} {'OK' if t else 'BRAK'}")
        time.sleep(0.25)

    bible['verses'] = verses
    json.dump(bible, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\nZapisano {outp}: {len(verses)} wersetow lacznie; brak: {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
