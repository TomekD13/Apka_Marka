# -*- coding: utf-8 -*-
"""Buduje public/content/{lang}/prayer-texts.json - teksty do modlitwy w konwencji
United Prayer: Uwielbienie, Skrucha, Prosby, Wdziecznosc.

Plik trzyma wylacznie odnosniki (`osis` + `ref`); tekst Pisma dociaga
`build_bible_be.py` do bibles/BE.json - tak samo jak dla okazji i fiszek.
`ref` jest przeliczany na numeracje Biblii Ekumenicznej (Psalmy z tytulem,
Jl, Ml, Iz 64) przez `map_ref` z build_bible_be.

Uzycie:
  python tools/build_prayer_texts.py pl            # zapis JSON
  python tools/build_prayer_texts.py pl --check    # raport: tekst BE + kontrola numeracji
Po zapisie uruchom `python tools/build_bible_be.py pl`, zeby dolozyc wersety.
"""
import io, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_bible_be import OSIS2BE, find_src, load_be, map_ref, resolve, similarity
from fetch_occasions import OSIS2PL

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')

TRANSLATION = 'BE'
TITLE = 'Teksty do modlitwy'
INTRO = ('Modlitwa czterema krokami: najpierw mowisz Bogu, kim jest, potem stajesz '
         'przed Nim w prawdzie o sobie, przynosisz prosby i dziekujesz.')

ONE_CHAPTER = {'Obad', 'Phlm', '2John', '3John', 'Jude'}

# Cztery dzialy United Prayer. Odnosniki sa w numeracji OSIS (protestanckiej) -
# `ref` przelicza sie sam.
GROUPS = [
    {
        'id': 'uwielbienie',
        'name': 'Uwielbienie',
        'icon': '👑',
        'intro': 'Mow Bogu, kim jest - nie o tym, czego potrzebujesz.',
        'osis': [
            'Exod.15.11', 'Exod.34.6-7', 'Deut.32.3-4', '1Chr.16.25-27', '1Chr.29.11-13',
            'Neh.9.6', 'Job.36.26', 'Ps.8.1-4', 'Ps.18.1-2', 'Ps.19.1-4', 'Ps.24.1-2',
            'Ps.27.1', 'Ps.29.1-2', 'Ps.33.6-9', 'Ps.34.3', 'Ps.36.5-9', 'Ps.46.1-3',
            'Ps.47.6-8', 'Ps.48.1-2', 'Ps.57.9-11', 'Ps.62.11-12', 'Ps.63.1-4',
            'Ps.66.1-4', 'Ps.71.19', 'Ps.72.18-19', 'Ps.77.13-14', 'Ps.86.8-10',
            'Ps.89.5-8', 'Ps.90.1-2', 'Ps.93.1-2', 'Ps.95.1-6', 'Ps.96.1-6', 'Ps.97.1-6',
            'Ps.99.1-3', 'Ps.102.25-27', 'Ps.103.19-22', 'Ps.104.1-4', 'Ps.104.24',
            'Ps.111.2-4', 'Ps.113.1-6', 'Ps.115.1-3', 'Ps.117.1-2', 'Ps.119.68',
            'Ps.135.5-6', 'Ps.139.1-6', 'Ps.139.13-16', 'Ps.145.1-7', 'Ps.145.8-13',
            'Ps.146.5-10', 'Ps.147.1-5', 'Ps.148.1-6', 'Ps.150.1-6', 'Prov.18.10',
            'Isa.6.1-3', 'Isa.9.6', 'Isa.25.1', 'Isa.40.12', 'Isa.40.25-26',
            'Isa.40.28-29', 'Isa.42.8', 'Isa.43.10-11', 'Isa.44.6', 'Isa.46.9-10',
            'Isa.57.15', 'Jer.10.6-7', 'Jer.32.17', 'Dan.2.20-22', 'Mal.3.6',
            'John.1.1-4', 'John.1.14', 'John.8.12', 'John.14.6', 'Rom.11.33-36',
            '1Cor.8.6', 'Eph.3.20-21', 'Phil.2.9-11', 'Col.1.15-17', '1Tim.1.17',
            '1Tim.6.15-16', 'Heb.1.3', 'Heb.13.8', '1John.1.5', '1John.4.8-10',
            'Rev.1.8', 'Rev.4.8', 'Rev.4.11', 'Rev.5.12-13', 'Rev.15.3-4', 'Rev.19.6-7',
        ],
    },
    {
        'id': 'skrucha',
        'name': 'Skrucha',
        'icon': '🕯️',
        'intro': 'Stan przed Bogiem w prawdzie o sobie i przyjmij przebaczenie.',
        'osis': [
            '2Sam.12.13', '1Kgs.8.47-48', '2Chr.7.14', 'Ezra.9.6', 'Neh.1.6-7',
            'Neh.9.33', 'Job.42.5-6', 'Ps.15.1-2', 'Ps.19.12-14', 'Ps.24.3-4',
            'Ps.25.7', 'Ps.25.11', 'Ps.25.18', 'Ps.32.1-5', 'Ps.34.18', 'Ps.38.18',
            'Ps.51.1-4', 'Ps.51.7-10', 'Ps.51.11-12', 'Ps.51.17', 'Ps.66.18',
            'Ps.79.8-9', 'Ps.86.5', 'Ps.103.8-12', 'Ps.130.1-4', 'Ps.139.23-24',
            'Ps.143.1-2', 'Prov.20.9', 'Prov.28.13', 'Eccl.7.20', 'Isa.1.16-18',
            'Isa.6.5', 'Isa.30.15', 'Isa.43.25', 'Isa.53.5-6', 'Isa.55.6-7',
            'Isa.59.1-2', 'Isa.64.6', 'Isa.66.2', 'Jer.3.12-13', 'Jer.17.9-10', 'Jer.31.18-19',
            'Lam.3.40-42', 'Ezek.18.30-32', 'Ezek.36.25-27', 'Dan.9.4-5', 'Dan.9.9-10',
            'Dan.9.18-19', 'Hos.6.1-3', 'Joel.2.12-13', 'Mic.6.8', 'Mic.7.18-19',
            'Zech.1.3', 'Mal.3.7', 'Matt.5.3-6', 'Matt.6.12', 'Matt.26.41',
            'Mark.7.20-23', 'Luke.15.18-21', 'Luke.18.13-14', 'Acts.3.19', 'Rom.2.4',
            'Rom.3.23-24', 'Rom.7.18-19', 'Rom.7.24-25', '1Cor.10.12', '1Cor.11.28',
            '2Cor.7.10', '2Cor.13.5', 'Eph.4.31-32', 'Col.3.8-10', 'Heb.4.12-13',
            'Heb.12.1-2', 'Jas.4.7-10', 'Jas.5.16', '1Pet.5.5-6', '1John.1.8-10',
            '1John.2.1-2', 'Rev.2.4-5', 'Rev.3.19-20',
        ],
    },
    {
        'id': 'prosby',
        'name': 'Prośby',
        'icon': '🙏',
        'intro': 'Przynies Bogu swoje sprawy i ludzi, ktorych nosisz w sercu.',
        'osis': [
            'Exod.33.13-15', 'Num.6.24-26', 'Deut.4.29', '1Kgs.3.9', '1Chr.4.10',
            '2Chr.20.12', 'Ps.5.1-3', 'Ps.17.6', 'Ps.25.4-5', 'Ps.27.4', 'Ps.27.11',
            'Ps.31.1-3', 'Ps.37.4-5', 'Ps.55.22', 'Ps.61.1-3', 'Ps.67.1-2', 'Ps.86.1-7',
            'Ps.86.11', 'Ps.90.12', 'Ps.90.17', 'Ps.119.18', 'Ps.119.33-37',
            'Ps.121.1-2', 'Ps.130.5-6', 'Ps.141.1-3', 'Ps.143.8-10', 'Prov.3.5-6',
            'Isa.40.31', 'Isa.41.10', 'Isa.58.6-9', 'Jer.29.11-13', 'Jer.33.3',
            'Joel.2.28-29', 'Zech.10.1', 'Mal.3.10', 'Matt.6.9-13', 'Matt.6.33',
            'Matt.7.7-8', 'Matt.9.37-38', 'Matt.11.28-30', 'Matt.18.19-20',
            'Matt.21.22', 'Matt.26.39', 'Mark.9.24', 'Mark.11.24-25', 'Luke.11.9-13',
            'Luke.18.1', 'Luke.22.31-32', 'John.14.13-14', 'John.15.7', 'John.16.24',
            'John.17.20-21', 'Acts.1.8', 'Acts.4.29-31', 'Rom.8.26-27', 'Rom.10.1',
            'Rom.15.13', '2Cor.12.8-9', 'Gal.4.19', 'Eph.1.16-19', 'Eph.3.14-19',
            'Eph.6.18-20', 'Phil.1.9-11', 'Phil.4.6-7', 'Phil.4.19', 'Col.1.9-12',
            'Col.4.2-4', '1Thess.5.16-18', '2Thess.3.1-2', '1Tim.2.1-4', 'Heb.4.16',
            'Heb.13.20-21', 'Jas.1.5-6', 'Jas.5.13-16', '1Pet.5.7', '1John.5.14-15',
            'Jude.1.20-21', '3John.1.2', 'Rev.22.20',
        ],
    },
    {
        'id': 'wdziecznosc',
        'name': 'Wdzięczność',
        'icon': '💛',
        'intro': 'Nazwij po imieniu to, co juz otrzymales.',
        'osis': [
            '1Chr.16.8-12', '1Chr.16.34', '1Chr.29.13', '2Chr.5.13', 'Ezra.3.11',
            'Ps.9.1-2', 'Ps.28.6-7', 'Ps.30.4-5', 'Ps.30.11-12', 'Ps.34.8',
            'Ps.40.1-3', 'Ps.50.14-15', 'Ps.52.9', 'Ps.56.12-13', 'Ps.65.9-11',
            'Ps.66.16-20', 'Ps.68.19-20', 'Ps.69.30', 'Ps.75.1', 'Ps.92.1-4',
            'Ps.95.2', 'Ps.100.1-5', 'Ps.103.1-5', 'Ps.106.1', 'Ps.107.1-3',
            'Ps.107.8-9', 'Ps.107.21-22', 'Ps.111.1', 'Ps.116.1-2', 'Ps.116.12-14',
            'Ps.116.17', 'Ps.118.1', 'Ps.118.24', 'Ps.118.28-29', 'Ps.126.2-3',
            'Ps.136.1-4', 'Ps.136.23-26', 'Ps.138.1-3', 'Ps.145.15-16', 'Ps.147.7-9',
            'Isa.12.1-3', 'Isa.12.4-6', 'Isa.63.7', 'Jer.33.11', 'Dan.2.23',
            'Hab.3.17-19', 'Matt.11.25', 'Luke.1.46-49', 'Luke.17.15-19',
            'John.11.41-42', 'Acts.16.25', 'Rom.1.8', 'Rom.6.17-18', 'Rom.7.25',
            '1Cor.15.57', '2Cor.2.14', '2Cor.4.15', '2Cor.9.11-12', '2Cor.9.15',
            'Eph.1.3', 'Eph.5.19-20', 'Phil.1.3-5', 'Col.1.3', 'Col.1.12-14',
            'Col.2.6-7', 'Col.3.15-17', '1Thess.5.18', '2Thess.1.3', '1Tim.4.4-5',
            'Heb.12.28', 'Heb.13.15', 'Jas.1.17', '1Pet.1.3-5', 'Rev.7.12', 'Rev.11.17',
        ],
    },
]


def pl_ref(osis, be):
    """osis -> polski odnosnik w numeracji BE, np. 'Psalm 34,19'."""
    book, ch, vs = osis.split('.')
    name = OSIS2PL[book]
    chapters = be.get(OSIS2BE.get(book, ''), {})
    ch = int(ch)
    v0, v1 = (vs.split('-') + [None])[:2] if '-' in vs else (vs, None)
    bch, bv0 = map_ref(book, ch, int(v0), chapters)
    if book in ONE_CHAPTER:
        out = '%s %d' % (name, bv0)
    else:
        out = '%s %d,%d' % (name, bch, bv0)
    if v1:
        _, bv1 = map_ref(book, ch, int(v1), chapters)
        out += '-%d' % bv1
    return out


def ubg_full(lang):
    """Pelny tekst UBG po ksiegach (numeracja OSIS) - do kontroli mapowania."""
    d = os.path.join(CONTENT, lang, 'bible', 'UBG')
    out = {}
    if not os.path.isdir(d):
        return out
    for f in os.listdir(d):
        if f == 'index.json' or not f.endswith('.json'):
            continue
        out[f[:-5]] = json.load(io.open(os.path.join(d, f), encoding='utf-8')).get('chapters', [])
    return out


def ubg_passage(full, osis):
    book, ch, vs = osis.split('.')
    chapters = full.get(book) or []
    ch = int(ch)
    if ch > len(chapters):
        return ''
    rows = chapters[ch - 1]
    v0, v1 = (int(x) for x in (vs.split('-') if '-' in vs else (vs, vs)))
    return ' '.join(rows[v - 1] for v in range(v0, v1 + 1) if v <= len(rows))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lang = args[0] if args else 'pl'
    be = load_be(find_src())
    check = '--check' in sys.argv

    seen, dups = set(), []
    groups, missing, suspicious = [], [], []
    full = ubg_full(lang) if check else {}

    for g in GROUPS:
        verses = []
        for osis in g['osis']:
            if osis in seen:
                dups.append(osis)
            seen.add(osis)
            txt, miss = resolve(osis, be)
            if not txt:
                missing.append(osis)
                continue
            verses.append({'osis': osis, 'ref': pl_ref(osis, be)})
            if check:
                other = ubg_passage(full, osis)
                sim = similarity(txt, other) if other else 1.0
                flag = '  <-- SPRAWDZ' if sim < 0.34 else ''
                print('[%s] %-16s %-34s sim=%.2f%s' % (g['id'], osis, verses[-1]['ref'], sim, flag))
                print('    %s' % txt)
        groups.append({'id': g['id'], 'name': g['name'], 'icon': g['icon'],
                       'intro': g['intro'], 'verses': verses})

    if check:
        print('\nDzialy: ' + ', '.join('%s %d' % (g['name'], len(g['verses'])) for g in groups))
        if dups:
            print('Powtorzone odnosniki: ' + ', '.join(dups))
        if missing:
            print('BRAK w BE (%d): %s' % (len(missing), ', '.join(missing)))
        return

    out = {'lang': lang, 'translation': TRANSLATION, 'title': TITLE, 'intro': INTRO,
           'groups': groups}
    path = os.path.join(CONTENT, lang, 'prayer-texts.json')
    with io.open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('Zapisano %s: %s' % (path, ', '.join('%s %d' % (g['name'], len(g['verses'])) for g in groups)))
    if dups:
        print('Powtorzone odnosniki: ' + ', '.join(dups))
    if missing:
        print('BRAK w BE (%d): %s' % (len(missing), ', '.join(missing)))


if __name__ == '__main__':
    main()
