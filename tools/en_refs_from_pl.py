# -*- coding: utf-8 -*-
"""Generuje angielskie odnosniki (pole 'ref') w studiach EN:
- skrot ksiegi bierze z 'osis' (kanoniczny, niezawodny),
- numery rozdzialu/wersetow z polskiego 'ref' w odpowiadajacym studium PL
  (zachowuje wyliczenia, np. 'Mt 4,4.7.10' -> 'Matt 4:4, 7, 10').
Idempotentne (zrodlem numerow jest zawsze PL). Uzycie: python tools/en_refs_from_pl.py
"""
import json, glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
EN = os.path.join(ROOT, 'public', 'content', 'en', 'studies')


def disp(book):
    # '1John' -> '1 John', 'Ps' -> 'Ps' (spacja po wiodacej cyfrze)
    return re.sub(r'^(\d)', r'\1 ', book)


def numpart(pl_ref):
    # ostatni token to spec rozdzial,werset(y): '139,1-4' / '4,4.7.10' / '1,27'
    tok = pl_ref.rsplit(' ', 1)[-1]
    if ',' in tok:
        ch, v = tok.split(',', 1)
        return f"{ch}:{v.replace('.', ', ')}"  # przecinek->dwukropek, kropki->przecinki
    return tok.replace('.', ', ')


def passages(study):
    for s in study.get('sections', []):
        for it in s.get('items', []):
            for p in it.get('passage', []) or []:
                yield p


def main():
    changed = 0
    for enf in sorted(glob.glob(os.path.join(EN, '*.json'))):
        sid = os.path.basename(enf)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            print('  brak PL dla', sid); continue
        en = json.load(open(enf, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(en)):
            book = p.get('osis', '').split('.')[0]
            if book and i < len(pl_refs):
                p['ref'] = f"{disp(book)} {numpart(pl_refs[i])}"
        json.dump(en, open(enf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"Zaktualizowano odnosniki w {changed} studiach EN")


if __name__ == '__main__':
    main()
