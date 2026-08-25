# -*- coding: utf-8 -*-
"""Génère les références en français (champ 'ref') dans les études FR :
- abréviation du livre (style Louis Segond) à partir de 'osis',
- numéros de chapitre/verset à partir du 'ref' polonais (conserve les énumérations).
Idempotent. Usage : python tools/fr_refs_from_pl.py
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
FR = os.path.join(ROOT, 'public', 'content', 'fr', 'studies')

OSIS2FR = {
    'Gen': 'Gn', 'Exod': 'Ex', 'Lev': 'Lv', 'Num': 'Nb', 'Deut': 'Dt', 'Josh': 'Jos', 'Judg': 'Jg',
    'Ruth': 'Rt', '1Sam': '1 S', '2Sam': '2 S', '1Kgs': '1 R', '2Kgs': '2 R', '1Chr': '1 Ch',
    '2Chr': '2 Ch', 'Ezra': 'Esd', 'Neh': 'Né', 'Esth': 'Est', 'Job': 'Jb', 'Ps': 'Ps', 'Prov': 'Pr',
    'Eccl': 'Ec', 'Song': 'Ct', 'Isa': 'És', 'Jer': 'Jr', 'Lam': 'Lm', 'Ezek': 'Éz', 'Dan': 'Dn',
    'Hos': 'Os', 'Joel': 'Jl', 'Amos': 'Am', 'Obad': 'Ab', 'Jonah': 'Jon', 'Mic': 'Mi', 'Nah': 'Na',
    'Hab': 'Ha', 'Zeph': 'So', 'Hag': 'Ag', 'Zech': 'Za', 'Mal': 'Ml', 'Matt': 'Mt', 'Mark': 'Mc',
    'Luke': 'Lc', 'John': 'Jn', 'Acts': 'Ac', 'Rom': 'Rm', '1Cor': '1 Co', '2Cor': '2 Co', 'Gal': 'Ga',
    'Eph': 'Ép', 'Phil': 'Ph', 'Col': 'Col', '1Thess': '1 Th', '2Thess': '2 Th', '1Tim': '1 Tm',
    '2Tim': '2 Tm', 'Titus': 'Tt', 'Phlm': 'Phm', 'Heb': 'Hé', 'Jas': 'Jc', '1Pet': '1 P',
    '2Pet': '2 P', '1John': '1 Jn', '2John': '2 Jn', '3John': '3 Jn', 'Jude': 'Jude', 'Rev': 'Ap',
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
    for f in sorted(glob.glob(os.path.join(FR, '*.json'))):
        sid = os.path.basename(f)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            continue
        d = json.load(open(f, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(d)):
            ab = OSIS2FR.get(p.get('osis', '').split('.')[0])
            if ab and i < len(pl_refs):
                p['ref'] = f"{ab} {numpart(pl_refs[i])}"
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"FR refs updated in {changed} studies")


if __name__ == '__main__':
    main()
