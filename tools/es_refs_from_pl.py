# -*- coding: utf-8 -*-
"""Generuje hiszpanskie odnosniki (pole 'ref') w studiach ES:
- skrot ksiegi (styl Reina-Valera) z 'osis',
- numery rozdzialu/wersetow z polskiego 'ref' (zachowuje wyliczenia).
Idempotentne. Uzycie: python tools/es_refs_from_pl.py
"""
import json, glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
ES = os.path.join(ROOT, 'public', 'content', 'es', 'studies')

OSIS2ES = {
    'Gen': 'Gn', 'Exod': 'Éx', 'Lev': 'Lv', 'Num': 'Nm', 'Deut': 'Dt', 'Josh': 'Jos', 'Judg': 'Jue',
    'Ruth': 'Rt', '1Sam': '1 S', '2Sam': '2 S', '1Kgs': '1 R', '2Kgs': '2 R', '1Chr': '1 Cr',
    '2Chr': '2 Cr', 'Ezra': 'Esd', 'Neh': 'Neh', 'Esth': 'Est', 'Job': 'Job', 'Ps': 'Sal', 'Prov': 'Pr',
    'Eccl': 'Ec', 'Song': 'Cnt', 'Isa': 'Is', 'Jer': 'Jer', 'Lam': 'Lm', 'Ezek': 'Ez', 'Dan': 'Dn',
    'Hos': 'Os', 'Joel': 'Jl', 'Amos': 'Am', 'Obad': 'Abd', 'Jonah': 'Jon', 'Mic': 'Mi', 'Nah': 'Nah',
    'Hab': 'Hab', 'Zeph': 'Sof', 'Hag': 'Hag', 'Zech': 'Zac', 'Mal': 'Mal', 'Matt': 'Mt', 'Mark': 'Mr',
    'Luke': 'Lc', 'John': 'Jn', 'Acts': 'Hch', 'Rom': 'Ro', '1Cor': '1 Co', '2Cor': '2 Co', 'Gal': 'Gá',
    'Eph': 'Ef', 'Phil': 'Fil', 'Col': 'Col', '1Thess': '1 Ts', '2Thess': '2 Ts', '1Tim': '1 Ti',
    '2Tim': '2 Ti', 'Titus': 'Tit', 'Phlm': 'Flm', 'Heb': 'Heb', 'Jas': 'Stg', '1Pet': '1 P',
    '2Pet': '2 P', '1John': '1 Jn', '2John': '2 Jn', '3John': '3 Jn', 'Jude': 'Jud', 'Rev': 'Ap',
}


def numpart(pl_ref):
    tok = pl_ref.rsplit(' ', 1)[-1]
    if ',' in tok:
        ch, v = tok.split(',', 1)
        return f"{ch}:{v.replace('.', ', ')}"
    return tok.replace('.', ', ')


def passages(study):
    for s in study.get('sections', []):
        for it in s.get('items', []):
            for p in it.get('passage', []) or []:
                yield p


def main():
    changed = 0
    for esf in sorted(glob.glob(os.path.join(ES, '*.json'))):
        sid = os.path.basename(esf)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            print('  brak PL dla', sid); continue
        es = json.load(open(esf, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(es)):
            book = p.get('osis', '').split('.')[0]
            ab = OSIS2ES.get(book)
            if ab and i < len(pl_refs):
                p['ref'] = f"{ab} {numpart(pl_refs[i])}"
        json.dump(es, open(esf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"Zaktualizowano odnosniki w {changed} studiach ES")


if __name__ == '__main__':
    main()
