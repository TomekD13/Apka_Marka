# -*- coding: utf-8 -*-
"""Nanosi wyniki korekty (JSON-lines) na studia PL.

Wejscie: pliki z liniami JSON o polach
  plik, gdzie, fragment, problem, propozycja, klasa ("OCZYWISTE" | "DYSKUSYJNE")

Zachowanie:
  * OCZYWISTE – podmienia `fragment` na `propozycja` w pliku studium (i w zrodlowym .md,
    o ile fragment tam wystepuje). Pomija wpisy, ktorych nie da sie jednoznacznie znalezc
    albo ktore juz naniesiono.
  * DYSKUSYJNE – trafiaja do raportu markdown do rozstrzygniecia przez autora.
  * Wpisy odrzucone (fragment nieznaleziony / niejednoznaczny) tez trafiaja do raportu,
    zeby nic nie przepadlo po cichu.

Uzycie:
  python tools/apply_korekta.py <plik_z_wynikami>... [--zapisz] [--raport SCIEZKA.md]
"""
import glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIES = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
MATERIALY = os.path.join(os.path.dirname(ROOT), 'Materiały')
DEFAULT_RAPORT = os.path.join(os.path.dirname(ROOT), 'KOREKTA-PL-do-rozstrzygniecia.md')


BIBLE = os.path.join(ROOT, 'public', 'content', 'pl', 'bibles', 'BE.json')
QUOTE = re.compile(r'[„"]([^„""]{6,})["""]')


def esc(s):
    """Fragment w postaci, w jakiej stoi w pliku JSON (cudzyslow jako \\")."""
    return json.dumps(s, ensure_ascii=False)[1:-1]


def norm(t):
    t = re.sub(r'\(\d+\)', ' ', (t or '').lower())
    t = re.sub(r'[^\wąćęłńóśźż]+', ' ', t, flags=re.U)
    return ' '.join(t.split())


def osis_w_itemie(study, gdzie):
    """Odnosniki jednostki, do ktorej odnosi sie wpis („s2/u6/comment" -> s2, u6)."""
    czesci = (gdzie or '').split('/')
    if len(czesci) < 2:
        return []
    sid, iid = czesci[0], czesci[1]
    for sec in study.get('sections', []):
        if sec.get('id') != sid:
            continue
        for it in sec.get('items', []):
            if it.get('id') == iid:
                return [p.get('osis') for p in it.get('passage', []) or [] if p.get('osis')]
    return []


def cytat_ma_pokrycie(propozycja, study, gdzie, verses):
    """Czy cytaty w propozycji faktycznie padaja w tekscie Pisma tej jednostki.

    Broni przed poprawka, ktora brzmi wiarygodnie, ale wklada w cudzyslow slowa,
    ktorych w przekladzie nie ma. Zwraca (ok, powod)."""
    cytaty = [c for c in QUOTE.findall(propozycja or '') if len(c.split()) >= 2]
    if not cytaty:
        return True, ''                      # poprawka bez cytatu – nie ma czego sprawdzac
    osis = osis_w_itemie(study, gdzie)
    if not osis:
        return False, 'propozycja cytuje Pismo, a jednostka nie ma odnosnika do sprawdzenia'
    tekst = norm(' '.join(verses.get(o, '') for o in osis))
    for c in cytaty:
        # cytat bywa skrocony wielokropkiem – sprawdzamy kazdy czlon osobno
        for czlon in re.split(r'\[\.\.\.\]|\(\.\.\.\)|\.\.\.|…', c):
            n = norm(czlon)
            if len(n.split()) >= 2 and n not in tekst:
                return False, 'cytat „%s" nie pada w tekscie %s' % (czlon.strip()[:60], ', '.join(osis))
    return True, ''


def wczytaj(paths):
    """Linie JSON z podanych plikow; ignoruje smieci i ogrodzenia ```."""
    out = []
    for p in paths:
        for line in io.open(p, encoding='utf-8', errors='replace'):
            line = line.strip().rstrip(',')
            if not line.startswith('{'):
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get('fragment') and d.get('plik'):
                d['_src'] = os.path.basename(p)
                # projekt pisze cudzyslow jako „…" – korektor bywa niekonsekwentny
                for k in ('fragment', 'propozycja'):
                    if d.get(k):
                        d[k] = d[k].replace('”', '"').replace('“', '„')
                out.append(d)
    return out


def warianty(s):
    """Fragment moze przyjsc zdekodowany albo w postaci z pliku – sprawdzamy oba."""
    return [esc(s), s]


def main():
    paths, save = [], '--zapisz' in sys.argv
    raport_path = DEFAULT_RAPORT
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == '--raport' and i + 1 < len(args):
            raport_path = args[i + 1]
        elif not a.startswith('--') and (i == 0 or args[i - 1] != '--raport'):
            paths.append(a)

    wpisy = wczytaj(paths)
    print('Wczytano %d wpisow z %d plikow' % (len(wpisy), len(paths)))

    naniesione, odrzucone, dyskusyjne = [], [], []
    cache = {}
    verses = (json.load(open(BIBLE, encoding='utf-8')) or {}).get('verses', {})

    # wpisy odrzucone po przegladzie – z uzasadnieniem, trafiaja do raportu
    veto = {}
    vpath = os.environ.get('KOREKTA_VETO')
    if vpath and os.path.exists(vpath):
        for v in json.load(open(vpath, encoding='utf-8')):
            veto[(v['plik'], v['gdzie'])] = v['powod']

    for w in wpisy:
        klucz = (w.get('plik'), w.get('gdzie'))
        if klucz in veto:
            w['problem'] = '%s – %s' % (w.get('problem', ''), veto[klucz])
            w['_veto'] = True
            dyskusyjne.append(w)
            continue
        if (w.get('klasa') or '').upper() != 'OCZYWISTE':
            dyskusyjne.append(w)
            continue
        path = os.path.join(STUDIES, os.path.basename(w['plik']))
        if not os.path.exists(path):
            w['_powod'] = 'nie ma takiego pliku'
            odrzucone.append(w)
            continue
        raw = cache.get(path) or io.open(path, encoding='utf-8').read()
        ok, powod = cytat_ma_pokrycie(w.get('propozycja', ''), json.loads(raw),
                                      w.get('gdzie', ''), verses)
        if not ok:
            w['_powod'] = powod
            odrzucone.append(w)
            continue
        # Idempotencja: gdy poprawka juz siedzi w pliku, nie wolno jej nakladac drugi raz.
        # Szukany fragment bywa podciagiem swojej wlasnej poprawki („dystansowany" w
        # „zdystansowany"), wiec ponowne uruchomienie dopisaloby znak jeszcze raz.
        if any(v and v in raw for v in warianty(w.get('propozycja', ''))):
            w['_powod'] = 'poprawka juz naniesiona'
            odrzucone.append(w)
            continue
        trafiony = None
        for kand in warianty(w['fragment']):
            n = raw.count(kand)
            if n == 1:
                trafiony = kand
                break
            if n > 1:
                w['_powod'] = 'fragment wystepuje %d razy – niejednoznaczny' % n
        if not trafiony:
            if any(v in raw for v in warianty(w.get('propozycja', '')) if v):
                w['_powod'] = 'poprawka juz naniesiona'
            else:
                w.setdefault('_powod', 'nie znaleziono fragmentu w pliku')
            odrzucone.append(w)
            continue
        nowy = esc(w['propozycja']) if trafiony == esc(w['fragment']) else w['propozycja']
        cache[path] = raw.replace(trafiony, nowy)
        naniesione.append(w)

    for path, tresc in cache.items():
        json.loads(tresc)                       # nie zapisuj, jesli zepsulismy JSON
        if save:
            io.open(path, 'w', encoding='utf-8').write(tresc)

    # te same poprawki w zrodlowych .md, o ile fragment tam wystepuje
    md = 0
    if save and naniesione:
        for p in glob.glob(os.path.join(MATERIALY, '*.md')):
            raw = io.open(p, encoding='utf-8').read()
            new = raw
            for w in naniesione:
                if w['fragment'] in new:
                    new = new.replace(w['fragment'], w['propozycja'])
            if new != raw:
                md += 1
                io.open(p, 'w', encoding='utf-8').write(new)

    print('OCZYWISTE naniesione: %d (plikow: %d, .md: %d)' % (len(naniesione), len(cache), md))
    print('DYSKUSYJNE do raportu: %d' % len(dyskusyjne))
    print('ODRZUCONE (do reki):   %d' % len(odrzucone))

    linie = ['# Korekta wersji PL – do rozstrzygnięcia', '',
             'Wynik przeglądu polskiej treści (Codex `gpt-5.6-sol`) po zmianie przekładu na',
             'Biblię Ekumeniczną. Miejsca oczywiste zostały poprawione automatycznie i nie ma ich',
             'na tej liście. Poniżej to, co wymaga twojej decyzji.', '']
    wstep = os.environ.get('KOREKTA_WSTEP')
    if wstep and os.path.exists(wstep):
        linie += [io.open(wstep, encoding='utf-8').read()]
    linie += ['## Do decyzji (%d)' % len(dyskusyjne), '']
    for w in sorted(dyskusyjne, key=lambda x: (x.get('plik', ''), x.get('gdzie', ''))):
        linie += ['### %s – `%s`' % (w.get('plik', '?'), w.get('gdzie', '?')),
                  '',
                  '- **Jest:** %s' % w.get('fragment', ''),
                  '- **Problem:** %s' % w.get('problem', ''),
                  '- **Propozycja:** %s' % w.get('propozycja', ''),
                  '- **Decyzja:** ', '']
    odrzucone = [w for w in odrzucone if w.get('_powod') != 'poprawka juz naniesiona']
    if odrzucone:
        linie += ['## Zgłoszone, ale nie naniesione automatycznie (%d)' % len(odrzucone), '',
                  'Poprawka wyglądała na oczywistą, ale nie dało się jej nanieść bez ryzyka –',
                  'najczęściej dlatego, że fragment nie zgadza się co do znaku albo powtarza się', '',
                  '| plik | miejsce | jest | propozycja | dlaczego pominięte |',
                  '|---|---|---|---|---|']
        for w in odrzucone:
            linie.append('| %s | %s | %s | %s | %s |' % (
                w.get('plik', '?'), w.get('gdzie', '?'),
                (w.get('fragment', '') or '').replace('|', '\\|')[:90],
                (w.get('propozycja', '') or '').replace('|', '\\|')[:90],
                w.get('_powod', '')))
        linie.append('')

    io.open(raport_path, 'w', encoding='utf-8').write('\n'.join(linie))
    print('Raport: %s' % raport_path)
    if not save:
        print('\n[RAPORT] uruchom z --zapisz, zeby nanieac poprawki OCZYWISTE.')


if __name__ == '__main__':
    main()
