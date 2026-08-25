# -*- coding: utf-8 -*-
"""Gera referencias em portugues (campo 'ref') nos estudos PT:
- abreviatura do livro (estilo Almeida) a partir de 'osis',
- numeros de capitulo/versiculo a partir do 'ref' polones (preserva enumeracoes).
Idempotente. Uso: python tools/pt_refs_from_pl.py
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
PT = os.path.join(ROOT, 'public', 'content', 'pt', 'studies')

OSIS2PT = {
    'Gen': 'Gn', 'Exod': 'Êx', 'Lev': 'Lv', 'Num': 'Nm', 'Deut': 'Dt', 'Josh': 'Js', 'Judg': 'Jz',
    'Ruth': 'Rt', '1Sam': '1 Sm', '2Sam': '2 Sm', '1Kgs': '1 Rs', '2Kgs': '2 Rs', '1Chr': '1 Cr',
    '2Chr': '2 Cr', 'Ezra': 'Ed', 'Neh': 'Ne', 'Esth': 'Et', 'Job': 'Jó', 'Ps': 'Sl', 'Prov': 'Pv',
    'Eccl': 'Ec', 'Song': 'Ct', 'Isa': 'Is', 'Jer': 'Jr', 'Lam': 'Lm', 'Ezek': 'Ez', 'Dan': 'Dn',
    'Hos': 'Os', 'Joel': 'Jl', 'Amos': 'Am', 'Obad': 'Ob', 'Jonah': 'Jn', 'Mic': 'Mq', 'Nah': 'Na',
    'Hab': 'Hc', 'Zeph': 'Sf', 'Hag': 'Ag', 'Zech': 'Zc', 'Mal': 'Ml', 'Matt': 'Mt', 'Mark': 'Mc',
    'Luke': 'Lc', 'John': 'Jo', 'Acts': 'At', 'Rom': 'Rm', '1Cor': '1 Co', '2Cor': '2 Co', 'Gal': 'Gl',
    'Eph': 'Ef', 'Phil': 'Fp', 'Col': 'Cl', '1Thess': '1 Ts', '2Thess': '2 Ts', '1Tim': '1 Tm',
    '2Tim': '2 Tm', 'Titus': 'Tt', 'Phlm': 'Fm', 'Heb': 'Hb', 'Jas': 'Tg', '1Pet': '1 Pe',
    '2Pet': '2 Pe', '1John': '1 Jo', '2John': '2 Jo', '3John': '3 Jo', 'Jude': 'Jd', 'Rev': 'Ap',
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
    for f in sorted(glob.glob(os.path.join(PT, '*.json'))):
        sid = os.path.basename(f)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            print('  sem PL para', sid); continue
        d = json.load(open(f, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(d)):
            ab = OSIS2PT.get(p.get('osis', '').split('.')[0])
            if ab and i < len(pl_refs):
                p['ref'] = f"{ab} {numpart(pl_refs[i])}"
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"Atualizadas referencias em {changed} estudos PT")


if __name__ == '__main__':
    main()
