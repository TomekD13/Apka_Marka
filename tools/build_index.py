# -*- coding: utf-8 -*-
"""Przebudowuje listę 'studies' w public/content/{lang}/index.json na podstawie plików studiów.
Zachowuje 'featured' i 'series' z istniejącego index.json. Użycie: python build_index.py [lang ...]"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')


def refs_of(study):
    seen, out = set(), []
    for s in study.get('sections', []):
        for it in s.get('items', []):
            for p in it.get('passage', []) or []:
                r = p.get('ref')
                if r and r not in seen:
                    seen.add(r); out.append(r)
    return out


def build(lang):
    idx_path = os.path.join(CONTENT, lang, 'index.json')
    idx = json.load(open(idx_path, encoding='utf-8')) if os.path.exists(idx_path) else {'lang': lang}
    entries = []
    for f in sorted(glob.glob(os.path.join(CONTENT, lang, 'studies', '*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        entries.append({
            'id': d['id'], 'title': d['title'], 'category': d.get('category'),
            'seriesId': d.get('seriesId'), 'order': d.get('order', 0),
            'summary': d.get('summary', ''), 'minutes': d.get('minutes', {'base': 40, 'extended': 60}),
            'tags': d.get('tags', []), 'refs': refs_of(d)
        })
    entries.sort(key=lambda e: (e.get('order') or 0))
    idx['lang'] = lang
    idx.setdefault('featured', {})
    idx.setdefault('series', [])
    idx['studies'] = entries
    json.dump(idx, open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"{lang}: {len(entries)} studiów -> index.json")


if __name__ == '__main__':
    langs = sys.argv[1:] or ['pl', 'en']
    for l in langs:
        if os.path.isdir(os.path.join(CONTENT, l)):
            build(l)
