# -*- coding: utf-8 -*-
"""Generuje ukraińskie odnośniki (pole 'ref') w studiach UK:
- skrót księgi (styl Ohienko) z 'osis',
- numery rozdziału/wersetu z polskiego 'ref' (zachowuje wyliczenia).
Dwukropek jako separator (Іс 53:5). Idempotentne. Użycie: python tools/uk_refs_from_pl.py
"""
import json, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
UK = os.path.join(ROOT, 'public', 'content', 'uk', 'studies')

OSIS2UK = {
    'Gen': 'Бут', 'Exod': 'Вих', 'Lev': 'Лев', 'Num': 'Чис', 'Deut': 'Повт', 'Josh': 'Нав', 'Judg': 'Суд',
    'Ruth': 'Рут', '1Sam': '1 Сам', '2Sam': '2 Сам', '1Kgs': '1 Цар', '2Kgs': '2 Цар', '1Chr': '1 Хр',
    '2Chr': '2 Хр', 'Ezra': 'Езд', 'Neh': 'Неєм', 'Esth': 'Ест', 'Job': 'Йов', 'Ps': 'Пс', 'Prov': 'Пр',
    'Eccl': 'Екл', 'Song': 'Пісн', 'Isa': 'Іс', 'Jer': 'Єр', 'Lam': 'Плач', 'Ezek': 'Єз', 'Dan': 'Дан',
    'Hos': 'Ос', 'Joel': 'Йоіл', 'Amos': 'Ам', 'Obad': 'Авд', 'Jonah': 'Йона', 'Mic': 'Мих', 'Nah': 'Наум',
    'Hab': 'Авак', 'Zeph': 'Соф', 'Hag': 'Ог', 'Zech': 'Зах', 'Mal': 'Мал', 'Matt': 'Мт', 'Mark': 'Мр',
    'Luke': 'Лк', 'John': 'Ів', 'Acts': 'Дії', 'Rom': 'Рим', '1Cor': '1 Кор', '2Cor': '2 Кор', 'Gal': 'Гал',
    'Eph': 'Еф', 'Phil': 'Флп', 'Col': 'Кол', '1Thess': '1 Сол', '2Thess': '2 Сол', '1Tim': '1 Тим',
    '2Tim': '2 Тим', 'Titus': 'Тит', 'Phlm': 'Флм', 'Heb': 'Євр', 'Jas': 'Як', '1Pet': '1 Пет',
    '2Pet': '2 Пет', '1John': '1 Ів', '2John': '2 Ів', '3John': '3 Ів', 'Jude': 'Юд', 'Rev': 'Об',
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
    for f in sorted(glob.glob(os.path.join(UK, '*.json'))):
        sid = os.path.basename(f)
        plf = os.path.join(PL, sid)
        if not os.path.exists(plf):
            continue
        d = json.load(open(f, encoding='utf-8'))
        pl = json.load(open(plf, encoding='utf-8'))
        pl_refs = [p.get('ref', '') for p in passages(pl)]
        for i, p in enumerate(passages(d)):
            ab = OSIS2UK.get(p.get('osis', '').split('.')[0])
            if ab and i < len(pl_refs):
                p['ref'] = f"{ab} {numpart(pl_refs[i])}"
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed += 1
    print(f"UK refs updated in {changed} studies")


if __name__ == '__main__':
    main()
