# -*- coding: utf-8 -*-
"""Eksportuje tekst studiow PL do plaskiego pliku dla zewnetrznego korektora.

Kazde pole redakcyjne dostaje adres (`s2/u6/comment`), a przy jednostkach z odnosnikiem
doklejany jest tekst wersetu z biezacego przekladu – korektor widzi komentarz razem
z tym, co czytelnik ma obok na ekranie, i moze sprawdzic cytaty bez dostepu do dysku.

Uzycie:
  python tools/export_korekta.py <plik_studium.json>... > partia.txt
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIES = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
BIBLE = os.path.join(ROOT, 'public', 'content', 'pl', 'bibles', 'BE.json')


def main():
    verses = (json.load(open(BIBLE, encoding='utf-8')) or {}).get('verses', {})
    out = []
    for name in sys.argv[1:]:
        path = name if os.path.exists(name) else os.path.join(STUDIES, name)
        d = json.load(open(path, encoding='utf-8'))
        out.append('\n=== PLIK: %s' % os.path.basename(path))
        out.append('[title] %s' % d.get('title', ''))
        out.append('[summary] %s' % d.get('summary', ''))
        for sec in d.get('sections', []):
            sid = sec.get('id', '?')
            out.append('\n--- %s/heading' % sid)
            out.append(sec.get('heading', ''))
            for it in sec.get('items', []):
                iid = it.get('id', '?')
                for p in it.get('passage', []) or []:
                    osis, ref = p.get('osis', ''), p.get('ref', '')
                    out.append('\n[WERSET %s = „%s"]' % (osis, ref))
                    out.append('  %s' % (verses.get(osis) or '(BRAK W PRZEKLADZIE)'))
                for key in ('label', 'comment', 'content'):
                    if it.get(key):
                        out.append('\n--- %s/%s/%s' % (sid, iid, key))
                        out.append(it[key])
                for q in it.get('questions', []) or []:
                    out.append('\n--- %s/%s/%s' % (sid, iid, q.get('id', 'q')))
                    out.append(q.get('text', ''))
        app = d.get('application') or {}
        for key in ('text', 'challenge'):
            if app.get(key):
                out.append('\n--- application/%s' % key)
                out.append(app[key])
    sys.stdout.write('\n'.join(out))


if __name__ == '__main__':
    main()
