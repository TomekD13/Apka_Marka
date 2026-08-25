#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada czytanki "40 dni modlitwy" (#JestNadzieja) z plikow .docx projektu one27.

    python tools/extract_pray40.py                  # -> public/content/pl/pray40/
    python tools/extract_pray40.py --check          # sam raport, bez zapisu
    python tools/extract_pray40.py --src <katalog>  # inne zrodlo niz domyslne

Kazdy dzien ma dwie wersje tego samego rozwazania - krotka (TekstyShort) i pelna
(TekstyLong). Uklad obu jest ten sam, a strukture niesie stopien pisma:

    9.5  bold   naglowek serii ("JEST NADZIEJA · 40 DNI MODLITWY")
   11.0  bold   "DZIEN N"
   24.0  bold   tytul dnia
   10.5         wiersz "Tekst: ..." i zdanie wprowadzajace
   14.0  bold   srodtytul (tylko w wersji pelnej)
   12.0         akapit tresci

Na koncu obu wersji stoja te same pytania ("Pytania na dzis:") i nota o przekladzie,
wiec trzymamy je raz, przy dniu.

Wynik: pray40/index.json (spis dni) + pray40/01.json ... 40.json (tresc dnia),
tak samo jak studia - czytelnik pobiera tylko ten dzien, ktory otwiera.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

try:
    import docx
except ImportError:
    sys.exit("Brak python-docx. Zainstaluj: pip install python-docx")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path.home() / "AIprojekty" / "one27"
OUT = ROOT / "public" / "content" / "pl" / "pray40"

SIZE_DAY = 11.0
SIZE_TITLE = 24.0
SIZE_LEAD = 10.5
SIZE_HEADING = 14.0

RE_DAY_FILE = re.compile(r"Dzie[nń]\s+(\d{1,2})", re.I)
RE_DAY_PARA = re.compile(r"^DZIE[NŃ]\s+(\d{1,2})$", re.I)
RE_REF = re.compile(r"^Tekst:\s*(.+)$", re.I)
RE_QUESTIONS = re.compile(r"^Pytania na dzi[sś]", re.I)
RE_NUMBERED = re.compile(r"^(\d+)[.)]\s*(.+)$", re.S)
RE_NOTE = re.compile(r"^Cytaty:", re.I)


def para_size(p) -> float | None:
    for r in p.runs:
        if r.text.strip() and r.font.size:
            return r.font.size.pt
    return None


def is_bold(p) -> bool:
    runs = [r for r in p.runs if r.text.strip()]
    return bool(runs) and all(r.bold for r in runs)


def read_day(path: Path) -> dict:
    """Rozklada jeden plik na naglowek, tresc w sekcjach, pytania i note."""
    doc = docx.Document(path)
    out: dict = {
        "title": "",
        "ref": "",
        "lead": "",
        "sections": [],
        "questions": [],
        "note": "",
    }
    current: dict | None = None
    in_questions = False

    for p in doc.paragraphs:
        text = re.sub(r"\s+", " ", p.text.replace(chr(0x2014), chr(0x2013))).strip()
        if not text:
            continue
        size = para_size(p)
        bold = is_bold(p)

        if RE_DAY_PARA.match(text) or (bold and size and size < 10 and "JEST NADZIEJA" in text.upper()):
            continue
        if bold and size == SIZE_TITLE:
            out["title"] = text
            continue
        m = RE_REF.match(text)
        if m:
            out["ref"] = m.group(1).strip()
            continue
        if RE_NOTE.match(text):
            out["note"] = text
            continue
        if RE_QUESTIONS.match(text):
            in_questions = True
            continue
        if in_questions:
            m = RE_NUMBERED.match(text)
            out["questions"].append(m.group(2).strip() if m else text)
            continue
        if not out["lead"] and size == SIZE_LEAD:
            out["lead"] = text
            continue
        if bold and size == SIZE_HEADING:
            current = {"heading": text, "paragraphs": []}
            out["sections"].append(current)
            continue
        if current is None:
            current = {"heading": None, "paragraphs": []}
            out["sections"].append(current)
        current["paragraphs"].append(text)

    out["sections"] = [s for s in out["sections"] if s["paragraphs"]]
    return out


def collect(folder: Path) -> dict[int, dict]:
    """Mapa numer dnia -> tresc. Pomija tymczasowe pliki Worda (~$...)."""
    days: dict[int, dict] = {}
    for path in sorted(folder.glob("*.docx")):
        if path.name.startswith("~$"):
            continue
        m = RE_DAY_FILE.search(path.name)
        if not m:
            print(f"   pomijam (brak numeru dnia): {path.name}")
            continue
        days[int(m.group(1))] = read_day(path)
    return days


def main() -> int:
    args = sys.argv[1:]
    check = "--check" in args
    src = DEFAULT_SRC
    if "--src" in args:
        src = Path(args[args.index("--src") + 1])

    short_dir, long_dir = src / "TekstyShort", src / "TekstyLong"
    for d in (short_dir, long_dir):
        if not d.exists():
            sys.exit(f"Brak katalogu: {d}")

    print("krótka wersja:")
    short = collect(short_dir)
    print("pełna wersja:")
    long = collect(long_dir)
    print(f"\nDni: krótkich {len(short)}, pełnych {len(long)}")

    numbers = sorted(set(short) | set(long))
    problems = []
    for n in numbers:
        if n not in short:
            problems.append(f"Dzień {n}: brak wersji krótkiej")
        if n not in long:
            problems.append(f"Dzień {n}: brak wersji pełnej")

    index_days = []
    files: dict[int, dict] = {}
    for n in numbers:
        s, l = short.get(n), long.get(n)
        base = l or s
        day = {
            "day": n,
            "title": base["title"],
            "ref": base["ref"],
            "lead": base["lead"],
            "questions": base["questions"],
            "note": base["note"],
            "versions": {},
        }
        if s:
            day["versions"]["short"] = {"sections": s["sections"]}
        if l:
            day["versions"]["long"] = {"sections": l["sections"]}
        files[n] = day
        index_days.append({"day": n, "title": base["title"], "ref": base["ref"], "lead": base["lead"]})

        if not base["title"]:
            problems.append(f"Dzień {n}: pusty tytuł")
        if not base["questions"]:
            problems.append(f"Dzień {n}: brak pytań")

    chars_s = sum(len(p) for d in short.values() for s in d["sections"] for p in s["paragraphs"])
    chars_l = sum(len(p) for d in long.values() for s in d["sections"] for p in s["paragraphs"])
    print(f"Znaków: krótkie {chars_s // 1000} tys., pełne {chars_l // 1000} tys.")
    print(f"Śródtytułów w wersji pełnej: {sum(1 for d in long.values() for s in d['sections'] if s['heading'])}")

    if problems:
        print(f"\nPROBLEMY ({len(problems)}):")
        for p in problems[:20]:
            print(" -", p)

    if check:
        for n in numbers[:5]:
            d = files[n]
            print(f"\n  Dzień {d['day']}: {d['title']} ({d['ref']})")
            print(f"    lead: {d['lead'][:70]}")
            print(f"    sekcje: krótka {len(d['versions'].get('short', {}).get('sections', []))}, "
                  f"pełna {len(d['versions'].get('long', {}).get('sections', []))}, "
                  f"pytań {len(d['questions'])}")
        return 1 if problems else 0

    OUT.mkdir(parents=True, exist_ok=True)
    for n, day in files.items():
        with io.open(OUT / f"{n:02d}.json", "w", encoding="utf-8", newline="\n") as f:
            json.dump(day, f, ensure_ascii=False, indent=2)
            f.write("\n")

    index = {
        "lang": "pl",
        "title": "40 dni modlitwy",
        "series": "#JestNadzieja",
        "days": index_days,
    }
    with io.open(OUT / "index.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total = sum(p.stat().st_size for p in OUT.glob("*.json"))
    print(f"\nZapisano {len(files)} dni + index -> {OUT.relative_to(ROOT)} ({total/1024:.0f} KB)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
