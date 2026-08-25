#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Wyciaga teksty piesni ze spiewnika "Spiewajmy Panu" (PDF) do content/{lang}/songs.json.

    python tools/extract_spiewnik.py             # caly spiewnik (1-750)
    python tools/extract_spiewnik.py 1 25        # zakres numerow piesni
    python tools/extract_spiewnik.py --check     # tylko raport, bez zapisu
    python tools/extract_spiewnik.py --akordy    # zachowaj akordy z rozdzialu 41

PDF jest skladem DTP, wiec tekst rozpoznajemy po geometrii i wielkosci fontu:

  y < 50            zywa pagina (numer strony, nazwa dzialu) - pomijamy, ale nazwe
                    dzialu zapamietujemy jako 'section' piesni
  14.2 Bold         naglowek "Nr N."
  11.0 BoldItalic   tytul piesni; tonacja w nawiasie obok albo w wierszu ponizej
  9.0  Italic       autor, tlumacz albo odsylacz biblijny
  10.8              tekst piesni klasycznych (1-700): akapitowy, wiersze skladu
                    sklejamy, bo lamanie jest przypadkowe
  10.0              tekst rozdzialu 41 (piesni mlodziezowe, ~701-750): tu lamanie
                    wierszy jest znaczace, wiec je zachowujemy
  10.0 Bold         akordy wplecione miedzy wiersze rozdzialu 41 - domyslnie odrzucane

Trzy uklady piesni, ktore skrypt musi obsluzyc:
  * zwrotki numerowane "1." "2." + opcjonalny "Refren:" (albo "Refren (1-3):"),
  * piesni jednozwrotkowe bez numeracji (np. Nr 29 "Alleluja") - caly tekst to zwrotka,
  * rozdzial 41 - tekst wierszowany, czesto tylko zwrotka i refren.

Znak U+2212 na koncu wiersza to przeniesienie wyrazu ("ciem-\nnosci" -> "ciemnosci"),
a nie dywiz w tresci.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("Brak PyMuPDF. Zainstaluj: pip install pymupdf")

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "Spiewnik" / "Spiewnik Spiewajmy Panu (12B - 2013) PRESS.pdf"
OUT = ROOT / "public" / "content" / "pl" / "songs.json"

PAGINA_Y = 50.0
MINUS = "−"
RE_NR = re.compile(r"^Nr\s+(\d+)\.$")
RE_STANZA = re.compile(r"^(\d+)\.\s*(.*)$", re.S)
# "Refren:", ale takze "Refren (1-3):" czy "Refren (po 2. zwrotce):"
RE_REFRAIN = re.compile(r"^Refren\b[^:]*:\s*(.*)$", re.S)
RE_KEY = re.compile(r"[(\[{]([A-Ha-h](?:is|es|s)?(?:\s(?:dur|moll))?)[)\]}]\s*$")
# akord: nazwa dzwieku z alteracja, dopiskiem (m/maj/sus/add), cyfra, basem po ukosniku
# albo dzwiekiem w nawiasie - w jednym wierszu bywa ich kilka, rozdzielonych spacja lub "−"
RE_CHORD = re.compile(
    r"^(?:[−–-]?\s*[A-Ha-h](?:is|es|s|b|#)?(?:m|maj|dim|aug|sus|add)?\d*"
    r"(?:\([a-h](?:is|es|s)?\))?(?:/[A-Ha-h](?:is|es|s|#|b)?)?[\s,]*)+$"
)

SIZE_TITLE = 11.0
SIZE_AUTHOR = 9.5      # ponizej tego to autor/odsylacz
SIZE_MODERN = 10.4     # ponizej tego (a powyzej autora) to rozdzial 41

# Bledy skladu w PDF (font gubi "l"): cyfra 1 albo wielkie I w miejscu litery.
# Kazda pozycja sprawdzona w kontekscie zdania - poprawiamy tylko formy jednoznaczne.
TYPOS = {
    "bó1": "ból",
    "da1": "dal",
    "fa1": "fal",
    "ża1": "żal",
    "myś1": "myśl",
    "Zbawicie1": "Zbawiciel",
    "cześć1": "cześć",       # nadmiarowa cyfra, nie podmieniona litera
    "BibIii": "Biblii",
    "modIitw": "modlitw",
    "schyIa": "schyla",
    "Paw dobry jest": "Pan dobry jest",   # tytul Nr 30; tekst piesni ma poprawne "Pan"
}
RE_TYPOS = re.compile("|".join(re.escape(k) for k in sorted(TYPOS, key=len, reverse=True)))


def fix_typos(text: str) -> str:
    return RE_TYPOS.sub(lambda m: TYPOS[m.group(0)], text)


# Rozdzial 41 "Piesni mlodziezowe" (numery 701-750) trafia do osobnego spiewnika
# w aplikacji - decyzja autora 2026-08-25. Tu zostaje jako plik posredni obok
# zrodel; czyta go tools/extract_youth.py. Do songs.json ida numery 1-700.
YOUTH_FROM = 701
YOUTH_OUT = ROOT / "Spiewnik" / "_701-750.json"

SOURCE = {
    "name": "Śpiewajmy Panu",
    "edition": "wydanie XII, Warszawa 2013",
    "publisher": "Wydawnictwo „Znaki Czasu”",
    "copyright": "© Wydawnictwo „Znaki Czasu” (2013). Wydano staraniem Kościoła Adwentystów Dnia Siódmego w RP.",
}


class Line:
    __slots__ = ("text", "size", "bold", "italic")

    def __init__(self, text: str, size: float, bold: bool, italic: bool):
        self.text = text
        self.size = size
        self.bold = bold
        self.italic = italic

    @property
    def is_heading(self) -> bool:
        return self.size > 12 and self.bold

    @property
    def is_title(self) -> bool:
        return abs(self.size - SIZE_TITLE) < 0.4

    @property
    def is_author(self) -> bool:
        return self.size < SIZE_AUTHOR

    @property
    def is_modern(self) -> bool:
        """Tekst rozdzialu 41 - drobniejszy od klasycznego, z zachowanym lamaniem."""
        return SIZE_AUTHOR <= self.size < SIZE_MODERN


def is_chord_span(span) -> bool:
    """Akord z rozdzialu 41: drobny, pogrubiony, sama nazwa dzwieku."""
    return (
        "Bold" in span["font"]
        and "Italic" not in span["font"]
        and span["size"] < SIZE_MODERN
        and bool(RE_CHORD.match(span["text"].strip()))
    )


def page_lines(page, keep_chords: bool = False):
    """Wiersze strony (bez zywej paginy) plus nazwa dzialu ze stopki."""
    out: list[Line] = []
    footer = None
    rows: dict[int, list] = {}
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if not span["text"].strip():
                    continue
                y = span["bbox"][1]
                if y < PAGINA_Y:
                    if not span["text"].strip().isdigit():
                        footer = span["text"].strip()
                    continue
                if not keep_chords and is_chord_span(span):
                    continue
                rows.setdefault(round(y), []).append((span["bbox"][0], span))

    for y in sorted(rows):
        spans = [s for _, s in sorted(rows[y])]
        if not spans:
            continue
        out.append(
            Line(
                "".join(s["text"] for s in spans).strip(),
                max(s["size"] for s in spans),
                any("Bold" in s["font"] for s in spans),
                all("Italic" in s["font"] for s in spans),
            )
        )
    return out, footer


def fix_years(text: str) -> str:
    """Daty zycia autorow: U+2212 na polpauze; 'I680' to litera I w skladzie zamiast 1."""
    def repl(m):
        a, b = m.group(1), m.group(2).replace("I", "1").replace("l", "1")
        return f"{a}–{b}"

    return re.sub(r"(\d{4})\s*[−–-]\s*([I l\d]?\d{3})", repl, text)


def join_flow(lines: list[str]) -> str:
    """Klasyczny sklad: lamanie wierszy jest przypadkowe, wiec skleja sie w akapit."""
    buf = ""
    for raw in lines:
        part = raw.strip()
        if not part:
            continue
        if buf.endswith(MINUS) or buf.endswith("-"):
            buf = buf[:-1] + part
        elif buf:
            buf += " " + part
        else:
            buf = part
    return re.sub(r"[ \t]+", " ", buf).strip()


def join_verse(lines: list[str]) -> str:
    """Rozdzial 41: lamanie wiersza jest znaczace, wiec zostaje."""
    out: list[str] = []
    for raw in lines:
        part = raw.strip()
        if not part:
            continue
        if out and (out[-1].endswith(MINUS) or out[-1].endswith("-")):
            out[-1] = out[-1][:-1] + part
        else:
            out.append(part)
    return "\n".join(out).strip()


def parse(doc, first_nr: int, last_nr: int, keep_chords: bool = False):
    """Zbiera surowe wiersze kolejnych piesni z calego PDF-u."""
    songs: list[dict] = []
    current: dict | None = None
    for page_no in range(doc.page_count):
        lines, footer = page_lines(doc[page_no], keep_chords)
        for line in lines:
            m = RE_NR.match(line.text)
            if m and line.is_heading:
                nr = int(m.group(1))
                if current and current["nr"] >= first_nr:
                    songs.append(current)
                if nr > last_nr:
                    return songs
                current = {"nr": nr, "page": page_no + 1, "section": footer, "raw": []}
                continue
            if current is not None:
                if current["section"] is None and footer:
                    current["section"] = footer
                current["raw"].append(line)
    if current and first_nr <= current["nr"] <= last_nr:
        songs.append(current)
    return songs


def build(song: dict, keep_chords: bool = False) -> dict:
    raw: list[Line] = song["raw"]
    if not raw:
        raise ValueError(f"Nr {song['nr']}: brak tresci")

    # 1. tytul + tonacja (bywa w tym samym wierszu albo w nastepnym)
    title = raw[0].text.strip()
    key = None
    m = RE_KEY.search(title)
    if m:
        key = m.group(1)
        title = title[: m.start()].strip()

    # 2. autor rozpoznawany po wielkosci fontu, nie po pozycji - piesni jednozwrotkowe
    #    nie maja numeracji, wiec "wszystko przed zwrotka 1" bralo caly tekst
    body: list[Line] = []
    author_parts: list[str] = []
    for line in raw[1:]:
        if line.is_title and key is None and RE_KEY.fullmatch(line.text.strip()):
            key = RE_KEY.fullmatch(line.text.strip()).group(1)
        elif line.is_author:
            author_parts.append(line.text.strip())
        else:
            body.append(line)
    author = fix_years(join_flow(author_parts)).strip("()") or None

    modern = sum(1 for l in body if l.is_modern) > len(body) / 2
    join = join_verse if modern else join_flow

    # 3. zwrotki i refren
    stanzas: list[dict] = []
    refrain: list[str] | None = None
    bucket: list[str] | None = None
    for line in body:
        text = line.text.strip()
        if not text:
            continue
        if modern and line.bold and not line.italic and RE_CHORD.match(text) and not keep_chords:
            continue  # sam akord nad wierszem
        r = RE_REFRAIN.match(text)
        if r:
            if refrain is not None:
                bucket = None  # powtorzony naglowek refrenu - dalszy ciag pomijamy
                continue
            refrain = [r.group(1).strip()] if r.group(1).strip() else []
            bucket = refrain
            continue
        s = RE_STANZA.match(text)
        if s:
            stanzas.append({"n": int(s.group(1)), "lines": [s.group(2).strip()]})
            bucket = stanzas[-1]["lines"]
            continue
        if bucket is None:
            if refrain is not None:
                continue  # ciag dalszy powtorzonego refrenu
            # piesn bez numeracji - caly tekst jest jedna zwrotka
            stanzas.append({"n": 1, "lines": []})
            bucket = stanzas[-1]["lines"]
        bucket.append(text)

    out = {
        "nr": song["nr"],
        "title": fix_typos(title),
        "stanzas": [
            {"n": s["n"], "text": fix_typos(join(s["lines"]))} for s in stanzas if s["lines"]
        ],
    }
    if key:
        out["key"] = key
    if author:
        out["author"] = fix_typos(author)
    if refrain:
        out["refrain"] = fix_typos(join(refrain))
    if song.get("section"):
        out["section"] = song["section"]
    if len(out["stanzas"]) == 1 and not any(RE_STANZA.match(l.text.strip()) for l in body):
        out["single"] = True  # jedna zwrotka bez numeracji - render nie stawia "1."
    return out


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    keep_chords = "--akordy" in sys.argv
    first = int(args[0]) if args else 1
    last = int(args[1]) if len(args) > 1 else 750

    if not PDF.exists():
        sys.exit(f"Brak pliku: {PDF}")

    doc = fitz.open(PDF)
    parsed = [build(s, keep_chords) for s in parse(doc, first, last, keep_chords)]

    # pierwsza strona dzialu nie ma zywej paginy - dopisz dzial z nastepnej piesni
    for i, s in enumerate(parsed):
        if not s.get("section"):
            nxt = next((x.get("section") for x in parsed[i + 1 :] if x.get("section")), None)
            if nxt:
                s["section"] = nxt

    problems = []
    for s in parsed:
        if not s["stanzas"]:
            problems.append(f"Nr {s['nr']} ({s['title']}): zero zwrotek")
        if not s["title"]:
            problems.append(f"Nr {s['nr']}: pusty tytul")
        for st in s["stanzas"]:
            if MINUS in st["text"]:
                problems.append(f"Nr {s['nr']} zwrotka {st['n']}: zostal znak lamania")

    print(f"Piesni: {len(parsed)} (numery {parsed[0]['nr']}-{parsed[-1]['nr']})")
    print(f"  z refrenem:      {sum(1 for s in parsed if s.get('refrain'))}")
    print(f"  jednozwrotkowe:  {sum(1 for s in parsed if s.get('single'))}")
    lamane = sum(1 for s in parsed if any("\n" in st["text"] for st in s["stanzas"]))
    print(f"  wierszowane (41):{lamane}")
    print(f"  bez tonacji:     {sum(1 for s in parsed if not s.get('key'))}")

    if problems:
        print(f"\nPROBLEMY ({len(problems)}):")
        for p in problems[:40]:
            print(" -", p)
        if len(problems) > 40:
            print(f" ... i {len(problems) - 40} wiecej")

    if check:
        return 1 if problems else 0

    # pauza (em dash) nie wchodzi do tresci - w polskim skladzie stoi polpauza
    for s in parsed:
        for key in ("title", "author", "section", "refrain", "bridge"):
            if isinstance(s.get(key), str):
                s[key] = s[key].replace(chr(0x2014), chr(0x2013))
        for st in s["stanzas"]:
            st["text"] = st["text"].replace(chr(0x2014), chr(0x2013))

    hymnal = [s for s in parsed if s["nr"] < YOUTH_FROM]
    youth = [s for s in parsed if s["nr"] >= YOUTH_FROM]

    source = dict(SOURCE)
    if youth:
        # aplikacja mowi czytelnikowi, gdzie szukac numeru, ktorego tu juz nie ma
        source["movedToYouth"] = {"from": youth[0]["nr"], "to": youth[-1]["nr"]}
    data = {"lang": "pl", "title": "Śpiewnik", "source": source, "songs": hymnal}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    kb = OUT.stat().st_size / 1024
    print(f"\nZapisano {len(hymnal)} piesni -> {OUT.relative_to(ROOT)} ({kb:.0f} KB)")

    if youth:
        YOUTH_OUT.parent.mkdir(parents=True, exist_ok=True)
        with io.open(YOUTH_OUT, "w", encoding="utf-8", newline="\n") as f:
            json.dump({"source": SOURCE, "songs": youth}, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"Rozdzial 41: {len(youth)} piesni (nr {youth[0]['nr']}-{youth[-1]['nr']}) -> {YOUTH_OUT.relative_to(ROOT)}")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
