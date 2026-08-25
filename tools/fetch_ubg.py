# -*- coding: utf-8 -*-
"""Pobiera wersety UBG (Uwspółcześniona Biblia Gdańska 2017) z API Bible SuperSearch
dla wszystkich odnośników osis występujących w studiach PL i zapisuje
public/content/pl/bibles/UBG.json (kluczowane po osis).

Źródło: https://api.biblesupersearch.com  (moduł pol_ubg). UBG: Fundacja Wrota Nadziei – do swobodnego użytku.
"""
import json, os, glob, time, urllib.parse, urllib.request

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
    # "Ps.139.1-4" -> ("Psalms 139:1-4"), "John.3.16" -> "John 3:16"
    parts = osis.split('.')
    book = OSIS2EN.get(parts[0])
    if not book or len(parts) < 3:
        return None
    return f"{book} {parts[1]}:{parts[2]}"


def fetch(osis):
    ref = osis_to_ref(osis)
    if not ref:
        return None
    url = f"{API}?bible=pol_ubg&reference={urllib.parse.quote(ref)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'bibleapp/0.1'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    res = data.get('results') or []
    if not res:
        return None
    chapters = res[0].get('verses', {}).get('pol_ubg', {})
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
    # zakres: numery wersetów dla orientacji
    return ' '.join(f"({v}) {t}" for v, t in out)


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
    osis_list = collect_osis('pl')
    verses, missing = {}, []
    for i, osis in enumerate(osis_list, 1):
        try:
            txt = fetch(osis)
        except Exception as e:
            txt = None
            print('  ERR', osis, e)
        if txt:
            verses[osis] = txt
        else:
            missing.append(osis)
        print(f"[{i}/{len(osis_list)}] {osis} {'OK' if txt else 'BRAK'}")
        time.sleep(0.15)
    out = {
        'translation': 'UBG', 'name': 'Uwspółcześniona Biblia Gdańska (2017)', 'lang': 'pl',
        'license': 'UBG © Fundacja Wrota Nadziei – do swobodnego użytku; tekst via API Bible SuperSearch (pol_ubg).',
        'verses': verses
    }
    outp = os.path.join(CONTENT, 'pl', 'bibles', 'UBG.json')
    json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"\nZapisano {outp}: {len(verses)} wersetów, brakuje {len(missing)}")
    if missing:
        print('BRAKI:', missing)


if __name__ == '__main__':
    main()
