# -*- coding: utf-8 -*-
"""Scala wszystkie tematy PL (public/content/pl/studies) w jeden plik Markdown
z OPISEM PROJEKTU na poczatku i znacznikami poziomow [Prosto]/[Wiecej]/[Ekspert].
Wynik: <root repo>/WSZYSTKIE-TEMATY-BIBLIJNE.md. Uzycie: python tools/build_topics_md.py
"""
import json, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../Aplikacja
PL = os.path.join(ROOT, 'public', 'content', 'pl')
OUT = os.path.join(os.path.dirname(ROOT), 'WSZYSTKIE-TEMATY-BIBLIJNE.md')

LEVEL = {'base': 'Prosto', 'extended': 'Więcej', 'advanced': 'Ekspert'}
CAT = {'basic_practical': 'Studium praktyczne', 'basic_systematic': 'Studium systematyczne', 'topic': 'Temat biblijny'}
NOTETYPE = {'syntax': 'Składnia', 'verb': 'Czasownik', 'background': 'Tło', 'textual': 'Krytyka tekstu',
            'term': 'Termin', 'variant': 'Wariant', 'worship': 'Uwielbienie', 'other': 'Nota'}

PROMPT = """# Żywe Słowo / All Things New – wszystkie tematy biblijne (PL)

## Opis projektu

**Czym to jest.** „Żywe Słowo / All Things New" to relacyjny kurs studium Biblii dla osób szukających (odbiorca polski/europejski) oraz darmowa aplikacja-czytnik (PWA), która go udostępnia. Idea: prowadzić ludzi „od relacji, nie od religii" - drogą do domu Ojca.

**Aplikacja.** 8 języków (polski, angielski, hiszpański, portugalski, niemiecki, francuski, suahili, ukraiński). Działa offline po pobraniu modułu, bez kont, logowania i śledzenia. Tekst wersetów dociągany z przekładu właściwego dla danego języka. Wersja testowa: https://pastormarek.github.io/biblestudy/

**Treść kursu.** 35 tematów w 5 blokach:
I. Spotkanie z Bogiem · II. Życie z Bogiem · III. Życie w przymierzu i służba · IV. Proroctwa i nadzieja końca · V. Życie i emocje.

**Trzy poziomy (addytywne): Prosto ⊆ Więcej ⊆ Ekspert.**
- **[Prosto]** - rdzeń, prosty język, dla każdego.
- **[Więcej]** - pogłębienie: dodatkowe wersety i pytania.
- **[Ekspert]** - noty zaawansowane: tło historyczno-kulturowe, terminy, formy oryginalne (gr./hebr.), zagadnienia doktrynalne.
Prowadząc temat na danym poziomie, bierze się wszystkie jednostki tego i niższych poziomów.

**Założenia teologiczne.** Treść oparta na Biblii, w duchu adwentystycznym, ale **nigdzie nie pada nazwa żadnego kościoła** (świadoma zasada). Oś: **wielki bój** (kosmiczny konflikt dobra i zła). Grzech ujmowany **relacyjnie** (zerwana więź, nie tylko złe uczynki). **Bóstwo Jezusa i Ducha Świętego** (Trójca). **Sola scriptura**. Pisownia zawsze **„szabat"**. Tematy wrażliwe **bez agresji**: krytyka nauczania/instytucji, nigdy ludzi. Dar proroctwa / E. G. White bez nacisku - fundamentem zawsze Biblia.

**Budowa tematu.** Temat → sekcje → jednostki. Jednostka „pasaż" = znacznik poziomu + odnośnik(i) + komentarz + pytania. Jednostka „nota" (zwykle Ekspert) = znacznik poziomu + typ + tytuł + treść + (opcjonalnie) forma oryginalna gr./hebr. + pytania. Każdy temat kończy się sekcją **Zastosowanie** i **Wyzwaniem** na tydzień.

**Wersety.** W tym pliku są **tylko odnośniki** - `osis` (np. `John.3.16`) oraz zapis polski (np. `J 3,16`). Tekstu Pisma tu nie ma; gdy potrzebny jest cytat, pobierz go z realnego przekładu (np. Uwspółcześniona Biblia Gdańska) - nie zmyślaj i nie cytuj z pamięci. Uwaga na różnice w numeracji Psalmów.

**Dla modelu AI.** Powyższe to kontekst do zrozumienia kursu. Konkretne polecenie (analiza, korekta, propozycje, tłumaczenie itp.) użytkownik dopisze osobno.

---
"""


def main():
    idx = json.load(open(os.path.join(PL, 'index.json'), encoding='utf-8'))
    series = sorted(idx.get('series', []), key=lambda s: s.get('order', 0))
    series_title = {s['id']: s['title'] for s in series}

    studies = [json.load(open(f, encoding='utf-8'))
               for f in glob.glob(os.path.join(PL, 'studies', '*.json'))]
    studies.sort(key=lambda d: d.get('order', 0))

    out = [PROMPT, f"**Spis:** {len(studies)} tematów w {len(series)} blokach. Poniżej pełna treść.\n\n---\n"]

    current = None
    for d in studies:
        sid = d.get('seriesId')
        if sid != current:
            current = sid
            out.append(f"\n# 📖 {series_title.get(sid, 'Różne tematy')}\n")

        cat = CAT.get(d.get('category'), d.get('category', ''))
        mins = d.get('minutes', {})
        out.append(f"\n## Temat {d.get('order')}. {d.get('title')}\n")
        line = f"*{cat}*"
        if mins:
            line += f" · *Czas:* Prosto ~{mins.get('base','?')} min, Więcej ~{mins.get('extended','?')} min"
        out.append(line)
        if d.get('tags'):
            out.append(f"*Tagi:* {', '.join(d['tags'])}")
        if d.get('summary'):
            out.append(f"\n**Streszczenie:** {d['summary']}")

        for sec in d.get('sections', []):
            out.append(f"\n### {sec.get('heading','')}\n")
            for it in sec.get('items', []):
                lvl = LEVEL.get(it.get('level'), it.get('level', ''))
                if it.get('type') == 'passage':
                    refs = '; '.join(f"{p.get('ref','')} (`osis: {p.get('osis','')}`)"
                                     for p in it.get('passage', []) or [])
                    out.append(f"**[{lvl}]** {refs}  ")
                    if it.get('comment'):
                        out.append(it['comment'])
                    for q in it.get('questions', []) or []:
                        out.append(f"- *Pytanie:* {q.get('text','')}")
                elif it.get('type') == 'note':
                    nt = NOTETYPE.get(it.get('noteType'), it.get('noteType', ''))
                    out.append(f"**[{lvl}] Nota – {nt}:** {it.get('label','')}  ")
                    if it.get('content'):
                        out.append(it['content'])
                    for o in it.get('original', []) or []:
                        tr = f" – *{o['translit']}*" if o.get('translit') else ''
                        out.append(f"- *Forma oryginalna ({o.get('lang','')}):* {o.get('text','')}{tr}")
                    for q in it.get('questions', []) or []:
                        out.append(f"- *Pytanie:* {q.get('text','')}")
                out.append("")

        app = d.get('application', {}) or {}
        if app.get('text') or app.get('challenge'):
            out.append("### Zastosowanie\n")
            if app.get('text'):
                out.append(app['text'])
            if app.get('challenge'):
                out.append(f"\n**Wyzwanie:** {app['challenge']}")
        out.append("\n---")

    open(OUT, 'w', encoding='utf-8').write("\n".join(out) + "\n")
    print(f"Zapisano {OUT}: {len(studies)} tematów")


if __name__ == '__main__':
    main()
