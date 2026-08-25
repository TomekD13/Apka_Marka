# -*- coding: utf-8 -*-
"""Hutengeneza marejeo ya Kiswahili (uwanja 'ref') katika masomo ya SW:
- kifupi cha kitabu (mtindo wa Biblia ya Kiswahili) kutoka 'osis',
- namba za sura/mstari kutoka 'ref' ya Kipolandi (huhifadhi orodha za mistari).
Idempotent. Matumizi: python tools/sw_refs_from_pl.py
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
SW = os.path.join(ROOT, 'public', 'content', 'sw', 'studies')

OSIS2SW = {
    'Gen': 'Mwa', 'Exod': 'Kut', 'Lev': 'Law', 'Num': 'Hes', 'Deut': 'Kum', 'Josh': 'Yos', 'Judg': 'Amu',
    'Ruth': 'Rut', '1Sam': '1Sam', '2Sam': '2Sam', '1Kgs': '1Fal', '2Kgs': '2Fal', '1Chr': '1Nya',
    '2Chr': '2Nya', 'Ezra': 'Ezr', 'Neh': 'Neh', 'Esth': 'Est', 'Job': 'Ayu', 'Ps': 'Zab', 'Prov': 'Mit',
    'Eccl': 'Mhu', 'Song': 'Wim', 'Isa': 'Isa', 'Jer': 'Yer', 'Lam': 'Oma', 'Ezek': 'Eze', 'Dan': 'Dan',
    'Hos': 'Hos', 'Joel': 'Yoe', 'Amos': 'Amo', 'Obad': 'Oba', 'Jonah': 'Yon', 'Mic': 'Mik', 'Nah': 'Nah',
    'Hab': 'Hab', 'Zeph': 'Sef', 'Hag': 'Hag', 'Zech': 'Zek', 'Mal': 'Mal', 'Matt': 'Mt', 'Mark': 'Mk',
    'Luke': 'Lk', 'John': 'Yoh', 'Acts': 'Mdo', 'Rom': 'Rum', '1Cor': '1Kor', '2Cor': '2Kor', 'Gal': 'Gal',
    'Eph': 'Efe', 'Phil': 'Flp', 'Col': 'Kol', '1Thess': '1The', '2Thess': '2The', '1Tim': '1Tim',
    '2Tim': '2Tim', 'Titus': 'Tit', 'Phlm': 'Flm', 'Heb': 'Ebr', 'Jas': 'Yak', '1Pet': '1Pet',
    '2Pet': '2Pet', '1John': '1Yoh', '2John': '2Yoh', '3John': '3Yoh', 'Jude': 'Yud', 'Rev': 'Ufu',
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
    for f in sorted(glob.glob(os.path.join(SW, '*.json'))):
        sid = os.path.basename(f)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            continue
        d = json.load(open(f, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(d)):
            ab = OSIS2SW.get(p.get('osis', '').split('.')[0])
            if ab and i < len(pl_refs):
                p['ref'] = f"{ab} {numpart(pl_refs[i])}"
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"Marejeo yamesasishwa katika masomo {changed} ya SW")


if __name__ == '__main__':
    main()
