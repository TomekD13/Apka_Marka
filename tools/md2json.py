# -*- coding: utf-8 -*-
"""Konwerter scenariuszy studium .md (format z folderu Materiały) -> JSON wg schematu aplikacji.

Użycie:
  python md2json.py <plik.md> [<plik2.md> ...] --out <katalog public/content>
Domyślnie zapisuje do Aplikacja/public/content/{lang}/studies/{id}.json
"""
import re, json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Aplikacja/
DEFAULT_OUT = os.path.join(ROOT, 'public', 'content')

LEVELS = {'BASE': 'base', 'EXTENDED': 'extended', 'ADVANCED': 'advanced'}


def grab(pattern, text, default=None, flags=0):
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else default


def parse(md):
    out = {}
    # ---- front-matter ----
    out['id'] = grab(r'\*\*id:\*\*\s*([^\s·*]+)', md)
    out['lang'] = grab(r'\*\*lang:\*\*\s*([^\s·*]+)', md)
    out['title'] = re.sub(r'^\s*\d+\.\s*', '', grab(r'^#\s+(.+)$', md, '', re.M))
    out['category'] = grab(r'\*\*category:\*\*\s*([^\s·*]+)', md)
    series = grab(r'\*\*seriesId:\*\*\s*([^\s·*]+)', md)
    out['seriesId'] = None if (series in (None, 'null', 'None')) else series
    order = grab(r'\*\*order:\*\*\s*(\d+)', md)
    out['order'] = int(order) if order else None
    out['summary'] = grab(r'\*\*summary:\*\*\s*(.+)', md, '')
    mb = re.search(r'base\s*(\d+)\s*[·/]\s*extended\s*(\d+)', md)
    out['minutes'] = {'base': int(mb.group(1)), 'extended': int(mb.group(2))} if mb else {'base': 40, 'extended': 60}
    tags = grab(r'\*\*tags:\*\*\s*(.+)', md, '')
    out['tags'] = [t.strip() for t in re.split(r'[,;]', tags) if t.strip()]

    # ---- split na sekcje (## ...), pomijając front-matter / Zastosowanie / Application / meta ----
    parts = re.split(r'^##\s+(.+)$', md, flags=re.M)
    # parts[0] = przed pierwszą sekcją; potem pary (nagłówek, treść)
    sections = []
    app = {'text': '', 'challenge': ''}
    meta_notes = ''
    sec_i = 0
    for i in range(1, len(parts), 2):
        head = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ''
        low = head.lower()
        if (low.startswith('podsumowanie') or low.startswith('summary')
                or low.startswith('zastosowanie') or low.startswith('application')):
            app['text'] = grab(r'\*\*(?:Tekst|Text):\*\*\s*(.+)', body, '')
            app['challenge'] = grab(r'\*\*(?:Wyzwanie|Challenge):\*\*\s*(.+)', body, '')
            continue
        if low.startswith('meta'):
            meta_notes = body.strip()
            continue
        # sekcja merytoryczna (także "Warstwa advanced" / "Advanced layer")
        sec_i += 1
        heading = re.sub(r'^(Sekcja|Section)\s*\d+\s*[-\u2014–]\s*', '', head).strip()
        items = parse_items(body)
        if items:
            sections.append({'id': f's{sec_i}', 'heading': heading, 'items': items})
    out['sections'] = sections
    out['application'] = app
    out['meta'] = {'status': 'draft', 'needsReview': True, 'generatedBy': 'claude',
                   'notes': re.sub(r'\s+', ' ', re.sub(r'[-*]\s|\*\*', '', meta_notes)).strip()[:1200]}
    return out


def parse_items(body):
    items = []
    # bloki zaczynają się od **[LEVEL] · id · ...**
    chunks = re.split(r'(?=^\*\*\[(?:BASE|EXTENDED|ADVANCED)\]\s*·)', body, flags=re.M)
    for ch in chunks:
        ch = ch.strip()
        if not ch.startswith('**['):
            continue
        head = ch.splitlines()[0]
        lvl = LEVELS[re.search(r'\[(BASE|EXTENDED|ADVANCED)\]', head).group(1)]
        uid = grab(r'·\s*(\w+)\s*·', head)
        questions = [{'id': qid, 'text': qt.strip()}
                     for qid, qt in re.findall(r'-\s*\*\*(q\d+):\*\*\s*(.+)', ch)]
        if 'noteType:' in head:
            m = re.search(r'noteType:\s*(\w+)\s*[-\u2014–]\s*(.+?)\*\*', head)
            note_type = m.group(1) if m else 'other'
            label = m.group(2).strip() if m else ''
            # content = linie po nagłówku, bez "- original" i "- **qN**"
            lines = ch.splitlines()[1:]
            content_lines = [l for l in lines
                             if l.strip() and not re.match(r'-\s*original', l) and not re.match(r'-\s*\*\*q\d+', l)]
            content = ' '.join(x.strip() for x in content_lines).strip()
            originals = []
            for lng, txt, tr in re.findall(r'-\s*original\s*\(([^)]+)\):\s*`([^`]+)`\s*[-\u2014\u2013]\s*\*?([^*\n]+)\*?', ch):
                originals.append({'lang': lng.split()[0].strip(), 'text': txt.strip(), 'translit': tr.strip()})
            item = {'type': 'note', 'level': lvl, 'id': uid, 'noteType': note_type,
                    'label': label, 'content': content}
            if originals:
                item['original'] = originals
            if questions:
                item['questions'] = questions
            items.append(item)
        else:
            ref = grab(r'·\s*\w+\s*·\s*(.+?)\*\*', head)
            osis = grab(r'`osis:\s*([^`]+)`', head)
            comment = grab(r'(?:Komentarz|Comment):\s*(.+)', ch)
            item = {'type': 'passage', 'level': lvl, 'id': uid,
                    'passage': [{'osis': osis, 'ref': ref}],
                    'comment': comment or '', 'questions': questions}
            items.append(item)
    return items


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_dir = DEFAULT_OUT
    if '--out' in sys.argv:
        out_dir = sys.argv[sys.argv.index('--out') + 1]
    for path in args:
        md = open(path, encoding='utf-8').read()
        data = parse(md)
        d = os.path.join(out_dir, data['lang'], 'studies')
        os.makedirs(d, exist_ok=True)
        outp = os.path.join(d, data['id'] + '.json')
        json.dump(data, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        nb = sum(1 for s in data['sections'] for it in s['items'] if it.get('level') == 'base')
        print(f"OK {path} -> {outp}  (sekcje={len(data['sections'])}, base={nb}, lang={data['lang']})")


if __name__ == '__main__':
    main()
