# -*- coding: utf-8 -*-
"""Tlumaczy slug (id = nazwa pliku studstudies/{id}.json i fragment URL /s/...) na jezyk
danego modulu, wyprowadzajac go z przetlumaczonego tytulu. PL zostaje bez zmian.

  python tools/translate_slugs.py            # DRY-RUN: tylko pokazuje mapowanie
  python tools/translate_slugs.py --apply    # zmienia pliki + pole id
Po --apply uruchom: python tools/build_index.py en es pt de fr sw uk
"""
import json, os, sys, glob, unicodedata, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
LANGS = ['en', 'es', 'pt', 'de', 'fr', 'sw', 'uk']  # PL zostaje po polsku

# Ukrainski -> lacinka (uproszczona, do slugow URL)
UK = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh',
    'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia', "'": '', '’': '', 'ʼ': '',
}


def translit_uk(s):
    out = []
    for ch in s:
        low = ch.lower()
        if low in UK:
            r = UK[low]
            out.append(r.upper() if (ch.isupper() and r) else r)
        else:
            out.append(ch)
    return ''.join(out)


def slugify(title, lang):
    s = translit_uk(title) if lang == 'uk' else title
    s = (s.replace('ß', 'ss').replace('ø', 'o').replace('æ', 'ae')
          .replace('œ', 'oe').replace('ð', 'd').replace('þ', 'th'))
    s = re.sub(r"['’ʼ‘`]", '', s)  # apostrofy usuwamy (can't -> cant, god's -> gods)
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return re.sub(r'-+', '-', s).strip('-')


def process(lang, apply):
    sdir = os.path.join(CONTENT, lang, 'studies')
    files = sorted(glob.glob(os.path.join(sdir, '*.json')))
    studies = [(f, json.load(open(f, encoding='utf-8'))) for f in files]
    studies.sort(key=lambda x: x[1].get('order', 0))

    used, mapping = set(), []
    for f, d in studies:
        oldid = d.get('id') or os.path.splitext(os.path.basename(f))[0]
        base = slugify(d.get('title', ''), lang) or oldid
        newid, i = base, 2
        while newid in used:
            newid = f"{base}-{i}"; i += 1
        used.add(newid)
        mapping.append((oldid, newid, d.get('title', '')))

    print(f"\n=== {lang} ({len(mapping)}) ===")
    for oldid, newid, title in mapping:
        print(f"  {oldid}  ->  {newid}")

    if not apply:
        return
    newids = set()
    for (f, d), (_, newid, _) in zip(studies, mapping):
        d['id'] = newid
        json.dump(d, open(os.path.join(sdir, f"{newid}.json"), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        newids.add(newid)
    for f in files:
        if os.path.splitext(os.path.basename(f))[0] not in newids:
            os.remove(f)
    print(f"  -> zapisano {len(newids)} plikow, usunieto stare")


def main():
    apply = '--apply' in sys.argv
    for l in LANGS:
        if os.path.isdir(os.path.join(CONTENT, l)):
            process(l, apply)
    if apply:
        print("\nNastepnie: python tools/build_index.py", ' '.join(LANGS))


if __name__ == '__main__':
    main()
