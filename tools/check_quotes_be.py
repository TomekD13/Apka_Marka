# -*- coding: utf-8 -*-
"""Wykrywa w studiach PL cytaty, ktore pasowaly do starego przekladu (UBG),
a nie pasuja do biezacego (BE) – czyli komentarze do poprawienia po zmianie tekstu.

Dla kazdego studium bierze wszystkie frazy w cudzyslowie („…") z komentarzy, not
i pytan, po czym sprawdza, czy wystepuja w tekscie wersetow tego studium.

Uzycie: python tools/check_quotes_be.py [pl] [--all]
  --all  pokazuje takze cytaty nieobecne w OBU przekladach (parafrazy autora)
"""
import json, os, glob, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')

QUOTE = re.compile(r'[„"]([^„""]{3,120})["""]')


def norm(t):
    """Do porownan: bez ogonkow interpunkcji, male litery, jeden odstep."""
    t = re.sub(r'\(\d+\)', ' ', t.lower())
    t = re.sub(r'[^\wąćęłńóśźż]+', ' ', t, flags=re.U)
    return ' '.join(t.split())


def texts_of(study, bible):
    """Teksty wszystkich wersetow uzytych w studium, w jednym worku."""
    out = []
    for sec in study.get('sections', []):
        for it in sec.get('items', []):
            for p in it.get('passage', []) or []:
                t = bible.get(p.get('osis', ''))
                if t:
                    out.append(t)
    return norm(' '.join(out))


def strings_of(study):
    """(gdzie, tekst, osis-y itemu) dla wszystkich pol redakcyjnych studium."""
    for sec in study.get('sections', []):
        for it in sec.get('items', []):
            where = '%s/%s' % (sec.get('id', '?'), it.get('id', '?'))
            refs = [p.get('osis') for p in it.get('passage', []) or [] if p.get('osis')]
            for key in ('comment', 'content', 'label'):
                if it.get(key):
                    yield where, it[key], refs
            for q in it.get('questions', []) or []:
                yield where + '/q', q.get('text', ''), refs
    app = study.get('application') or {}
    for key in ('text', 'challenge'):
        if app.get(key):
            yield 'application', app[key], []


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lang = args[0] if args else 'pl'
    show_all = '--all' in sys.argv
    bdir = os.path.join(CONTENT, lang, 'bibles')
    be = (json.load(open(os.path.join(bdir, 'BE.json'), encoding='utf-8')) or {}).get('verses', {})
    ubg_path = os.path.join(bdir, 'UBG.json')
    ubg = ((json.load(open(ubg_path, encoding='utf-8')) or {}).get('verses', {})
           if os.path.exists(ubg_path) else {})

    hard, soft = 0, 0
    for f in sorted(glob.glob(os.path.join(CONTENT, lang, 'studies', '*.json'))):
        study = json.load(open(f, encoding='utf-8'))
        be_text, ubg_text = texts_of(study, be), texts_of(study, ubg)
        rows = []
        for where, s, refs in strings_of(study):
            for q in QUOTE.findall(s):
                nq = norm(q)
                if len(nq.split()) < 2 or nq in be_text:
                    continue
                in_ubg = nq in ubg_text
                if in_ubg:
                    rows.append(('BYLO W UBG', where, q, refs, s))
                elif show_all:
                    rows.append(('parafraza ', where, q, refs, s))
        if rows:
            print('\n=============== %s' % os.path.basename(f))
            for tag, where, q, refs, s in rows:
                print('\n  [%s] %s   cytat: „%s"' % (tag, where, q))
                print('    ZDANIE: %s' % s)
                for osis in refs:
                    print('    %-14s UBG: %s' % (osis, (ubg.get(osis) or '–')[:300]))
                    print('    %-14s BE : %s' % ('', (be.get(osis) or '–')[:300]))
                if tag.startswith('BYLO'):
                    hard += 1
                else:
                    soft += 1
    print('\nRAZEM: %d cytatow z UBG nieobecnych w BE' % hard +
          (', %d parafraz' % soft if show_all else ''))


if __name__ == '__main__':
    main()
