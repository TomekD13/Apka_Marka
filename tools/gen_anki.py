# -*- coding: utf-8 -*-
"""Generuje 2 talie AnkiDroid (.apkg) z zestawu fiszek:
  - Skrot -> Tekst  (front: odnosnik, back: tekst wersetu)
  - Tekst -> Skrot  (front: tekst wersetu, back: odnosnik)
Tekst wersetow z bibles/{TRANSLATION}.json (po osis). Wynik: public/downloads/.

Uzycie:  python tools/gen_anki.py pl UBG
"""
import json, os, sys, html
import genanki

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')

MODEL_ID = 1320581001
DECK_R2T_ID = 1320581002   # ref -> text
DECK_T2R_ID = 1320581003   # text -> ref

MODEL = genanki.Model(
    MODEL_ID, 'Biblia 50 – fiszka',
    fields=[{'name': 'Front'}, {'name': 'Back'}],
    templates=[{'name': 'Karta', 'qfmt': '{{Front}}', 'afmt': '{{FrontSide}}<hr id=answer>{{Back}}'}],
    css='.card{font-family:Georgia,serif;font-size:18px;text-align:center;color:#222;background:#fff;padding:16px}'
        '.ref{font-size:22px;font-weight:bold}.theme{color:#888;font-size:13px;margin-top:6px}'
        '.txt{font-size:18px;line-height:1.5}')


def card_text(verses, osis_list):
    # przy >1 wersecie dodaj numer wersetu w nawiasie; zakres ma numery juz w tresci
    multi = len(osis_list) > 1 or any('-' in o.split('.')[-1] for o in osis_list)
    parts = []
    for o in osis_list:
        tx = verses.get(o, '')
        if not tx:
            continue
        last = o.split('.')[-1]
        if multi and '-' not in last:
            tx = f"({last}) {tx}"
        parts.append(tx)
    return ' '.join(parts).strip()


def main():
    lang = sys.argv[1] if len(sys.argv) > 1 else 'pl'
    translation = sys.argv[2] if len(sys.argv) > 2 else 'UBG'

    fc = json.load(open(os.path.join(CONTENT, lang, 'flashcards.json'), encoding='utf-8'))
    verses = json.load(open(os.path.join(CONTENT, lang, 'bibles', f'{translation}.json'), encoding='utf-8'))['verses']

    deck_r2t = genanki.Deck(DECK_R2T_ID, 'Biblia: 50 tekstów (Skrót → Tekst)')
    deck_t2r = genanki.Deck(DECK_T2R_ID, 'Biblia: 50 tekstów (Tekst → Skrót)')

    n = 0
    for th in fc.get('themes', []):
        tname = html.escape(th.get('name', ''))
        for c in th.get('cards', []):
            ref = html.escape(c.get('ref', ''))
            txt = html.escape(card_text(verses, c.get('osis', [])))
            if not txt:
                print('  BRAK tekstu:', c.get('ref')); continue
            ref_html = f'<div class="ref">{ref}</div>'
            theme_html = f'<div class="theme">{tname}</div>'
            txt_html = f'<div class="txt">{txt}</div>'
            tag = th.get('id', '')
            # kategoria (theme) tylko na ODPOWIEDZI (back), nie na pytaniu
            deck_r2t.add_note(genanki.Note(model=MODEL, fields=[ref_html, txt_html + theme_html], tags=[tag]))
            deck_t2r.add_note(genanki.Note(model=MODEL, fields=[txt_html, ref_html + theme_html], tags=[tag]))
            n += 1

    outdir = os.path.join(ROOT, 'public', 'downloads')
    os.makedirs(outdir, exist_ok=True)
    a = os.path.join(outdir, 'Biblia-50-tekstow_Skrot-do-Tekst.apkg')
    b = os.path.join(outdir, 'Biblia-50-tekstow_Tekst-do-Skrot.apkg')
    genanki.Package(deck_r2t).write_to_file(a)
    genanki.Package(deck_t2r).write_to_file(b)
    print(f"Karty: {n}")
    print('Zapisano:', os.path.basename(a), os.path.getsize(a), 'B')
    print('Zapisano:', os.path.basename(b), os.path.getsize(b), 'B')


if __name__ == '__main__':
    main()
