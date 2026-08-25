# -*- coding: utf-8 -*-
"""Buduje public/content/{lang}/bibles/BE.json (Biblia Ekumeniczna) z lokalnego
zrzutu tekstu (qbible/Robocze/all_data.json) – bez sieci, offline.

Uwzglednia roznice wersyfikacji: Ekumeniczna idzie za tekstem hebrajskim (MT),
a odnosniki `osis` w studiach sa w numeracji protestanckiej (KJV/OSIS):
  * Psalmy z tytulem jako osobnym wersetem 1  -> przesuniecie +1 (czasem +2),
    wykrywane automatycznie (patrz psalm_offset),
  * Joel: OSIS 2,28-32 = BE 3,1-5;  OSIS 3 = BE 4,
  * Malachiasz: OSIS 4,1-6 = BE 3,19-24.
Numery wersetow w wyniku ("(N) tekst") sa podawane w numeracji OSIS – zgodnie
z polem `ref` w scenariuszach.

Uzycie:
  python tools/build_bible_be.py pl [--src SCIEZKA_all_data.json] [--compare UBG]
"""
import json, os, glob, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
DEFAULT_SRC = r'C:\Users\MarekMicyk\AIprojekty\qbible\Robocze\all_data.json'

TRANSLATION = 'BE'
NAME = 'Biblia Ekumeniczna (2018)'
LICENSE = ('Biblia Ekumeniczna. Pismo Święte Starego i Nowego Testamentu, '
           '© Towarzystwo Biblijne w Polsce. Fragmenty cytowane w celach studyjnych.')

# OSIS -> skrot ksiegi w all_data.json (kanon 66)
OSIS2BE = {
    'Gen': 'Rdz', 'Exod': 'Wj', 'Lev': 'Kpł', 'Num': 'Lb', 'Deut': 'Pwt',
    'Josh': 'Joz', 'Judg': 'Sdz', 'Ruth': 'Rt', '1Sam': '1 Sm', '2Sam': '2 Sm',
    '1Kgs': '1 Krl', '2Kgs': '2 Krl', '1Chr': '1 Krn', '2Chr': '2 Krn',
    'Ezra': 'Ezd', 'Neh': 'Ne', 'Esth': 'Est', 'Job': 'Hi', 'Ps': 'Ps',
    'Prov': 'Prz', 'Eccl': 'Koh', 'Song': 'Pnp', 'Isa': 'Iz', 'Jer': 'Jr',
    'Lam': 'Lm', 'Ezek': 'Ez', 'Dan': 'Dn', 'Hos': 'Oz', 'Joel': 'Jl',
    'Amos': 'Am', 'Obad': 'Ab', 'Jonah': 'Jon', 'Mic': 'Mi', 'Nah': 'Na',
    'Hab': 'Ha', 'Zeph': 'So', 'Hag': 'Ag', 'Zech': 'Za', 'Mal': 'Ml',
    'Matt': 'Mt', 'Mark': 'Mk', 'Luke': 'Łk', 'John': 'J', 'Acts': 'Dz',
    'Rom': 'Rz', '1Cor': '1 Kor', '2Cor': '2 Kor', 'Gal': 'Ga', 'Eph': 'Ef',
    'Phil': 'Flp', 'Col': 'Kol', '1Thess': '1 Tes', '2Thess': '2 Tes',
    '1Tim': '1 Tm', '2Tim': '2 Tm', 'Titus': 'Tt', 'Phlm': 'Flm', 'Heb': 'Hbr',
    'Jas': 'Jk', '1Pet': '1 P', '2Pet': '2 P', '1John': '1 J', '2John': '2 J',
    '3John': '3 J', 'Jude': 'Jud', 'Rev': 'Ap',
}

FOOTNOTE = re.compile('\ue000\\d+\ue001')          # placeholder odsylacza do przypisu
PLACEHOLDER_ANY = re.compile('[\ue000-\ue00f]')
# Artefakty ekstrakcji z PDF: naglowek nastepnego psalmu doklejony do ostatniego
# wersetu ("\u2026 Psalm 56 [55]") oraz litery akrostychu jako aparat ("[Alef]").
# --- Miejsca, w ktorych BE ustepuje innemu przekladowi -----------------------
# Cytat spoza BE jest oznaczany skrotem przekladu doklejonym na koncu tekstu.
# Tekst pobiera sie z modulu .yes – nigdy nie wpisujemy Pisma z pamieci.
BOOKS_DIR = r'C:\Users\MarekMicyk\AIprojekty\BibleApp\Books'
YES_FILES = {'BW': 'Warszawska.yes', 'BT': 'Tysiaclecia.yes'}
_YES_CACHE = {}
FALLBACKS = {
    # osis: (skrot, powod)
    '1Cor.9.25': ('BW', 'BE „wszystko wytrzymuje" gubi gr. enkrateuetai – panowanie nad soba; '
                        'na tym stoi komentarz o wstrzemiezliwosci'),
    'Mark.1.15': ('BW', 'BE „Nadszedl czas" zaciera perfectum peplerotai („wypelnil sie czas"), '
                        'kluczowe dla argumentu o wyznaczonym czasie prorockim'),
    'Jas.5.14-16': ('BW', 'BE „zbawi chorego" zamiast „uzdrowi"; komentarz mowi o modlitwie '
                          'o uzdrowienie, a BE ma tez „prezbiterow" zamiast „starszych"'),
    'Jas.5.16': ('BW', 'jak wyzej – ten sam fragment cytowany osobno'),
    'Acts.8.36-39': ('BW', 'BE (za tekstem krytycznym) opuszcza w. 37 – wyznanie wiary eunucha; '
                           'na nim stoi komentarz o kolejnosci „najpierw wiara, potem chrzest". '
                           'BW ten werset zachowuje'),
}

# Naglowek nastepnego psalmu doklejony do ostatniego wersetu: „… Psalm 5",
# „… Psalm 114 [113A]" (w nawiasie numeracja Septuaginty/Wulgaty).
PSALM_RUNON = re.compile(r'\s*Psalm\s+\d+(?:\s*\[\d+[A-Z]?\])?\s*$')
STRAY_NUMBER = re.compile(r'(?<=[.!?])\s+\d{1,3}$')   # numer strony doklejony na koncu

# Srodtytuly dzialowe (nad perykopami) – nie ma ich w `pericopes`, a ekstraktor
# doklejal je do konca poprzedzajacego wersetu. Lista rosnie w miare dokladania
# studiow; kandydatow pokazuje `--check`.
SECTION_TITLES = (
    'Pierwsze prześladowanie',
    'Trzecia wizja: wielkie zmagania narodów',
    'Pouczenie o nowych relacjach w rodzinie',
)

# Ekstraktor gubil spacje przy lamaniu wiersza: „w Panu,abyście", „gniewie:Nie".
SPACE_AFTER_PUNCT = re.compile(r'(?<=[a-ząćęłńóśźż])([.,;:!?])(?=[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż])')
# Sklejki, ktorych nie da sie wykryc regula – lista jawna.
TYPOS = {'niegrzeszyli': 'nie grzeszyli'}
ACROSTIC = re.compile(
    r'\s*\[(?:Alef|Bet|Gimel|Dalet|He|Waw|Zajin|Chet|Tet|Jod|Kaf|Lamed|Mem|Nun|'
    r'Samek|Ajin|Pe|Sade|Kof|Resz|Szin|Taw)\]\s*')

# Elementy naglowka psalmu (incipity muzyczne/autorskie). Jesli werset 1 sklada sie
# WYLACZNIE z nich, to w numeracji OSIS jest tytulem, a nie wersetem -> offset +1.
PSALM_HEAD = re.compile(
    r'^\s*(?:'
    r'Przewodnikowi chóru|Psalm|Pieśń|Modlitwa|Maskil|Miktam|Hymn|Lamentacja|'
    r'Dawida|Asafa|Salomona|Mojżesza|Synów Koracha|Jedutuna|Ezrachity|Hemana|Etana|'
    r'Na melodię[^.]*|Według[^.]*|Na instrument[^.]*|Na instrumenty[^.]*|'
    r'Gdy [^.]*|Kiedy [^.]*|Do dyrygenta[^.]*|Pieśń stopni|Pielgrzymek'
    r')\b[^.]*\.\s*', re.U)


def clean(text, titles=()):
    """Usuwa odsylacze do przypisow, aparat i artefakty PDF; normalizuje bialy znak.

    `titles` – tytuly perykop tej ksiegi; ekstraktor doklejal je czasem do konca
    ostatniego wersetu poprzedzajacego perykope (np. Dn 9,27 + „Trzecia wizja…")."""
    t = FOOTNOTE.sub('', text or '')
    t = PLACEHOLDER_ANY.sub('', t)
    t = PSALM_RUNON.sub(' ', t)
    t = ACROSTIC.sub(' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    t = SPACE_AFTER_PUNCT.sub(r'\1 ', t)
    for bad, good in TYPOS.items():
        t = t.replace(bad, good)
    t = STRAY_NUMBER.sub('', t)
    for title in tuple(titles) + SECTION_TITLES:
        if len(t) > len(title) + 20 and t.endswith(' ' + title):
            t = t[:-(len(title) + 1)].strip()
            break
    return t


def load_be(src):
    """all_data.json -> {skrot: {rozdzial(int): {werset(int): tekst}}}"""
    data = json.load(open(src, encoding='utf-8'))
    out = {}
    for b in data:
        ab = b['meta']['abbreviation']
        titles = sorted({p[2] for p in b.get('pericopes', []) if p[2]},
                        key=len, reverse=True)
        out[ab] = {int(c): {r['verse']: clean(r['text'], titles) for r in rows}
                   for c, rows in b['chapters'].items()}
    return out


def psalm_offset(chapters, ps_num):
    """Ile wersetow tytulu ma psalm w BE (0/1/2) – czyli o ile przesunieta jest
    numeracja BE wzgledem OSIS."""
    rows = chapters.get(ps_num) or {}
    off = 0
    for v in (1, 2):
        t = rows.get(v, '')
        if not t:
            break
        rest, prev = t, None
        while rest != prev:                      # zdejmuj kolejne czlony naglowka
            prev = rest
            rest = PSALM_HEAD.sub('', rest, count=1)
        if rest.strip():                         # zostal tekst wlasciwy -> to juz werset
            break
        off = v
    return off


def map_ref(book, ch, v, chapters):
    """(ksiega OSIS, rozdzial, werset) -> (rozdzial BE, werset BE)."""
    if book == 'Ps':
        return ch, v + psalm_offset(chapters, ch)
    if book == 'Joel':
        if ch == 2 and v >= 28:                  # OSIS Jl 2,28-32 = BE 3,1-5
            return 3, v - 27
        if ch == 3:                              # OSIS Jl 3 = BE 4
            return 4, v
        return ch, v
    if book == 'Mal':
        if ch == 4:                              # OSIS Ml 4,1-6 = BE 3,19-24
            return 3, v + 18
        return ch, v
    if book == 'Isa' and ch == 64:               # OSIS Iz 64,1 = BE 63,19b; dalej -1
        return (63, 19) if v == 1 else (64, v - 1)
    return ch, v


def resolve(osis, be):
    """osis -> (tekst, lista brakow). Zakresy sklejane jako '(N) tekst ...'."""
    book, ch, vs = osis.split('.')
    ab = OSIS2BE.get(book)
    if not ab or ab not in be:
        return None, [osis]
    chapters = be[ab]
    ch = int(ch)
    v0, v1 = (int(x) for x in (vs.split('-') if '-' in vs else (vs, vs)))
    parts, missing = [], []
    for v in range(v0, v1 + 1):
        bch, bv = map_ref(book, ch, v, chapters)
        t = (chapters.get(bch) or {}).get(bv, '')
        if t:
            parts.append((v, t))
        else:
            missing.append('%s.%d.%d' % (book, ch, v))
    if not parts:
        return None, missing
    if len(parts) == 1 and v0 == v1:
        return parts[0][1], missing
    return ' '.join('(%d) %s' % (v, t) for v, t in parts), missing


def collect_osis(lang):
    """Wszystkie odnosniki uzywane przez aplikacje: studia, okazje i fiszki."""
    s = set()
    for f in glob.glob(os.path.join(CONTENT, lang, 'studies', '*.json')):
        d = json.load(open(f, encoding='utf-8'))
        for sec in d.get('sections', []):
            for it in sec.get('items', []):
                for p in it.get('passage', []) or []:
                    if p.get('osis'):
                        s.add(p['osis'])
    oc = os.path.join(CONTENT, lang, 'occasions.json')
    if os.path.exists(oc):
        for c in (json.load(open(oc, encoding='utf-8')) or {}).get('categories', []):
            for v in c.get('verses', []):
                if v.get('osis'):
                    s.add(v['osis'])
    fc = os.path.join(CONTENT, lang, 'flashcards.json')
    if os.path.exists(fc):
        for th in (json.load(open(fc, encoding='utf-8')) or {}).get('themes', []):
            for card in th.get('cards', []):
                for o in card.get('osis', []) or []:
                    s.add(o)
    return sorted(s)


def similarity(a, b):
    """Zgrubne podobienstwo dwoch tlumaczen tego samego wersetu – udzial wspolnych
    rdzeni dluzszych slow. Sluzy tylko do wylapania bledow mapowania."""
    def stems(t):
        t = re.sub(r'\(\d+\)', ' ', t.lower())
        return {w[:5] for w in re.findall(r'[a-ząćęłńóśźż]{6,}', t)}
    x, y = stems(a), stems(b)
    if not x or not y:
        return 1.0
    return len(x & y) / min(len(x), len(y))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lang = args[0] if args else 'pl'
    src = DEFAULT_SRC
    compare = None
    for i, a in enumerate(sys.argv):
        if a == '--src' and i + 1 < len(sys.argv):
            src = sys.argv[i + 1]
        if a == '--compare' and i + 1 < len(sys.argv):
            compare = sys.argv[i + 1]

    be = load_be(src)
    osis_list = collect_osis(lang)
    verses, missing = {}, []
    for osis in osis_list:
        txt, miss = resolve(osis, be)
        if txt:
            verses[osis] = txt
        missing.extend(miss)

    # podmiana pojedynczych miejsc na inny przeklad (oznaczona skrotem)
    used_fb = []
    for osis, (short, _why) in FALLBACKS.items():
        if osis not in verses:
            continue
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from yes_bible import YesBible
            bible = _YES_CACHE.get(short) or YesBible(os.path.join(BOOKS_DIR, YES_FILES[short]))
            _YES_CACHE[short] = bible
        except Exception as e:
            print('  UWAGA: nie moge otworzyc %s (%s) – zostaje BE dla %s' % (short, e, osis))
            continue
        book, ch, vs = osis.split('.')
        v0, v1 = (int(x) for x in (vs.split('-') if '-' in vs else (vs, vs)))
        bch, bv0 = map_ref(book, int(ch), v0, be.get(OSIS2BE.get(book, ''), {}))
        _, bv1 = map_ref(book, int(ch), v1, be.get(OSIS2BE.get(book, ''), {}))
        txt = bible.passage(book, bch, bv0, bv1)
        if txt:
            verses[osis] = '%s (%s)' % (txt, short)
            used_fb.append('%s -> %s' % (osis, short))
        else:
            print('  UWAGA: brak %s w %s – zostaje BE' % (osis, short))

    d = os.path.join(CONTENT, lang, 'bibles')
    os.makedirs(d, exist_ok=True)
    outp = os.path.join(d, TRANSLATION + '.json')
    json.dump({'translation': TRANSLATION, 'name': NAME, 'lang': lang,
               'license': LICENSE, 'verses': verses},
              open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('Zapisano %s: %d / %d odnosnikow' % (outp, len(verses), len(osis_list)))
    if used_fb:
        print('Z innego przekladu: ' + ', '.join(used_fb))
    if missing:
        print('BRAK w BE (%d): %s' % (len(missing), ', '.join(missing)))

    # przesuniecia psalmow – do kontroli
    shifts = {}
    for osis in osis_list:
        if osis.startswith('Ps.'):
            ch = int(osis.split('.')[1])
            o = psalm_offset(be['Ps'], ch)
            if o:
                shifts[ch] = o
    if shifts:
        print('Przesuniecia Psalmow (OSIS -> BE): ' +
              ', '.join('Ps %d: +%d' % (k, v) for k, v in sorted(shifts.items())))

    if '--check' in sys.argv:
        print('\n=== Konce bez interpunkcji (kandydaci na doklejony srodtytul) ===')
        for osis, t in sorted(verses.items()):
            if t and t[-1] not in '.!?,:;\u2014–”)':
                print('  %-18s …%s' % (osis, t[-70:]))

    if compare:
        cp = os.path.join(d, compare + '.json')
        if os.path.exists(cp):
            other = (json.load(open(cp, encoding='utf-8')) or {}).get('verses', {})
            rows = []
            for osis, t in verses.items():
                if osis in other:
                    rows.append((similarity(t, other[osis]), osis))
            rows.sort()
            print('\n=== Najnizsze podobienstwo do %s (kandydaci na blad mapowania) ===' % compare)
            for sim, osis in rows[:30]:
                print('  %.2f  %s' % (sim, osis))


if __name__ == '__main__':
    main()
