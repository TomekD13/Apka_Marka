# -*- coding: utf-8 -*-
"""Erzeugt deutsche Bibelstellen (Feld 'ref') in den DE-Studien:
- Buchabkuerzung (deutscher Stil) aus 'osis',
- Kapitel/Vers-Angabe aus dem polnischen 'ref' UNVERAENDERT (deutscher Stil nutzt
  wie der polnische ein Komma zwischen Kapitel und Vers, z. B. 'Joh 3,16').
Idempotent. Aufruf: python tools/de_refs_from_pl.py
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
DE = os.path.join(ROOT, 'public', 'content', 'de', 'studies')

OSIS2DE = {
    'Gen': '1Mo', 'Exod': '2Mo', 'Lev': '3Mo', 'Num': '4Mo', 'Deut': '5Mo', 'Josh': 'Jos', 'Judg': 'Ri',
    'Ruth': 'Rut', '1Sam': '1Sam', '2Sam': '2Sam', '1Kgs': '1Kön', '2Kgs': '2Kön', '1Chr': '1Chr',
    '2Chr': '2Chr', 'Ezra': 'Esr', 'Neh': 'Neh', 'Esth': 'Est', 'Job': 'Hi', 'Ps': 'Ps', 'Prov': 'Spr',
    'Eccl': 'Pred', 'Song': 'Hld', 'Isa': 'Jes', 'Jer': 'Jer', 'Lam': 'Klgl', 'Ezek': 'Hes', 'Dan': 'Dan',
    'Hos': 'Hos', 'Joel': 'Joel', 'Amos': 'Am', 'Obad': 'Ob', 'Jonah': 'Jona', 'Mic': 'Mi', 'Nah': 'Nah',
    'Hab': 'Hab', 'Zeph': 'Zef', 'Hag': 'Hag', 'Zech': 'Sach', 'Mal': 'Mal', 'Matt': 'Mt', 'Mark': 'Mk',
    'Luke': 'Lk', 'John': 'Joh', 'Acts': 'Apg', 'Rom': 'Röm', '1Cor': '1Kor', '2Cor': '2Kor', 'Gal': 'Gal',
    'Eph': 'Eph', 'Phil': 'Phil', 'Col': 'Kol', '1Thess': '1Thess', '2Thess': '2Thess', '1Tim': '1Tim',
    '2Tim': '2Tim', 'Titus': 'Tit', 'Phlm': 'Phlm', 'Heb': 'Hebr', 'Jas': 'Jak', '1Pet': '1Petr',
    '2Pet': '2Petr', '1John': '1Joh', '2John': '2Joh', '3John': '3Joh', 'Jude': 'Jud', 'Rev': 'Offb',
}


def passages(study):
    for s in study.get('sections', []):
        for it in s.get('items', []):
            for p in it.get('passage', []) or []:
                yield p


def main():
    changed = 0
    for f in sorted(glob.glob(os.path.join(DE, '*.json'))):
        sid = os.path.basename(f)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            print('  kein PL fuer', sid); continue
        d = json.load(open(f, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(d)):
            ab = OSIS2DE.get(p.get('osis', '').split('.')[0])
            if ab and i < len(pl_refs):
                num = pl_refs[i].rsplit(' ', 1)[-1]  # deutscher Stil: Komma beibehalten
                p['ref'] = f"{ab} {num}"
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"Aktualisierte Bibelstellen in {changed} DE-Studien")


if __name__ == '__main__':
    main()
