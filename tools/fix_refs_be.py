# -*- coding: utf-8 -*-
"""Przelicza polskie odnosniki (`ref`) w studiach PL na numeracje Biblii Ekumenicznej.

Odnosniki `osis` sa w numeracji protestanckiej (KJV), a BE idzie za tekstem
hebrajskim – w Psalmach z tytulem, w Jl, Ml i Iz 64 numery sie rozjezdzaja.
Skoro aplikacja pokazuje tekst BE, `ref` ma prowadzic do BE. `osis` zostaje
nietkniety: to klucz techniczny i podstawa odnosnikow w innych jezykach.

UWAGA: nie uruchamiac po tym `*_refs_from_pl.py` – te skrypty biora numery
z polskiego `ref` i przeniosly by numeracje BE do jezykow, ktore maja przeklady
w numeracji KJV (WEB, SCHL1951, LS1910, …).

Uzycie:
  python tools/fix_refs_be.py            # raport
  python tools/fix_refs_be.py --zapisz   # nanosi zmiany (JSON + Materiały/*.md)
"""
import glob, io, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_bible_be import DEFAULT_SRC, OSIS2BE, load_be, map_ref

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIES = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
MATERIALY = os.path.join(os.path.dirname(ROOT), 'Materiały')

TAIL = re.compile(r'^(.*?)(\d+)[,:](\d+)(?:-(\d+))?$')   # „Ps 88,2-4" -> ksiega + liczby


def new_ref(osis, ref, be):
    """Nowy `ref` w numeracji BE albo None, gdy nic sie nie zmienia."""
    m = TAIL.match(ref.strip())
    if not m:
        return None                                   # np. „Ps 143,8.10" – wyliczenie
    head, ch, v0, v1 = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
    book, o_ch, o_vs = osis.split('.')
    if int(o_ch) != ch or int(o_vs.split('-')[0]) != v0:
        return None                                   # ref juz sie nie pokrywa z osis
    chapters = be.get(OSIS2BE.get(book, ''), {})
    bch, bv0 = map_ref(book, ch, v0, chapters)
    out = '%s%d,%d' % (head, bch, bv0)
    if v1:
        _, bv1 = map_ref(book, ch, int(v1), chapters)
        out += '-%d' % bv1
    return out if out != ref.strip() else None


def main():
    save = '--zapisz' in sys.argv
    be = load_be(DEFAULT_SRC)
    zmiany = []                                        # (osis, stary, nowy)

    for path in sorted(glob.glob(os.path.join(STUDIES, '*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        dirty = False
        for sec in d.get('sections', []):
            for it in sec.get('items', []):
                for p in it.get('passage', []) or []:
                    nowy = new_ref(p.get('osis', ''), p.get('ref', ''), be)
                    if nowy:
                        zmiany.append((os.path.basename(path), p['osis'], p['ref'], nowy))
                        p['ref'] = nowy
                        dirty = True
        if dirty and save:
            json.dump(d, io.open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    for f, osis, stary, nowy in zmiany:
        print('  %-34s %-14s %-14s -> %s' % (f, osis, stary, nowy))
    print('\nRazem odnosnikow do przeliczenia: %d' % len(zmiany))

    # to samo w zrodlowych .md – para „<ref>** `osis: <OSIS>`" jest jednoznaczna
    md = 0
    for path in sorted(glob.glob(os.path.join(MATERIALY, '*.md'))):
        raw = io.open(path, encoding='utf-8').read()
        new = raw
        for _f, osis, stary, nowy in zmiany:
            new = new.replace('%s** `osis: %s`' % (stary, osis), '%s** `osis: %s`' % (nowy, osis))
        if new != raw:
            md += 1
            if save:
                io.open(path, 'w', encoding='utf-8').write(new)
    print('Materiały/*.md – plikow ze zmianami: %d' % md)
    if not save:
        print('\n[RAPORT] uruchom z --zapisz, zeby nanieac zmiany.')


if __name__ == '__main__':
    main()
