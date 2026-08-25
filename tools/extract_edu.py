#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada "Materialy edukacyjne" (#JestNadzieja) z plikow .md projektu one27.

    python tools/extract_edu.py                  # -> public/content/pl/edu/
    python tools/extract_edu.py --check          # sam raport, bez zapisu
    python tools/extract_edu.py --src <katalog>  # inne zrodlo niz domyslne

Kazde szkolenie ma dwie wersje tego samego tekstu - krotka (SzkoleniaShort)
i pelna (SzkoleniaLong). Numer bierzemy z nazwy pliku (`001_...md`), reszte
z markdowna, ktory w obu wersjach ma ten sam uklad:

    # tytul
    akapity
    ## srodtytul          (tylko wersja pelna: "Podsumowanie", "Spojrz wyzej")
    > „werset”
    > – odnosnik
    Pytanie(-a) do przemyslenia:
    tresc pytania         (w wersji pelnej ponumerowana: "1. ", "2. ")
    Cytaty: ...

Werset i pytania roznia sie miedzy wersjami (pelna cytuje szerzej i ma dwa
pytania), wiec siedza przy wersji, a nie przy szkoleniu. Nota o przekladzie
jest ta sama, wiec trzymamy ja raz.

Wynik: edu/index.json (spis) + edu/01.json ... 10.json (tresc), tak samo jak
czytanki - czytelnik pobiera tylko to, co otwiera.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path.home() / "AIprojekty" / "one27"
OUT = ROOT / "public" / "content" / "pl" / "edu"

RE_NR_FILE = re.compile(r"^(\d{1,3})[_\-\s]")
RE_H1 = re.compile(r"^#\s+(.*)$")
RE_H2 = re.compile(r"^##\s+(.*)$")
RE_QUESTIONS = re.compile(r"^Pytani[ae]\s+do\s+przemy[sś]lenia\s*:?\s*$", re.I)
RE_NUMBERED = re.compile(r"^(\d+)[.)]\s*(.+)$", re.S)
RE_NOTE = re.compile(r"^Cytaty\s*:", re.I)
# myslnik przed odnoszem wersetu - w zrodlach bywa pauza, polpauza albo dywiz
RE_QUOTE_REF = re.compile(r"^[\u2014–-]\s*(.+)$")


def blocks(text: str) -> list[str]:
    """Markdown dzielony pusta linia - jeden blok to akapit, cytat albo naglowek."""
    # pauza (em dash) nie wchodzi do tresci - w polskim skladzie stoi polpauza
    text = text.replace(chr(0x2014), chr(0x2013))
    return [b.strip() for b in re.split(r"\n\s*\n", text.strip()) if b.strip()]


def read_md(path: Path) -> dict:
    """Rozklada jeden plik na tytul, sekcje, werset, pytania i note."""
    out: dict = {
        "title": "",
        "sections": [],
        "quote": None,
        "questions": [],
        "note": "",
    }
    current: dict | None = None
    in_questions = False

    for block in blocks(io.open(path, encoding="utf-8").read()):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]

        m = RE_H1.match(lines[0])
        if m:
            out["title"] = m.group(1).strip()
            continue
        m = RE_H2.match(lines[0])
        if m:
            current = {"heading": m.group(1).strip(), "paragraphs": []}
            out["sections"].append(current)
            continue
        if all(ln.startswith(">") for ln in lines):
            quoted = [ln.lstrip(">").strip() for ln in lines]
            ref = ""
            m = RE_QUOTE_REF.match(quoted[-1])
            if m:
                ref = m.group(1).strip()
                quoted = quoted[:-1]
            out["quote"] = {"text": " ".join(quoted).strip("„”\"").strip(), "ref": ref}
            continue
        if RE_QUESTIONS.match(lines[0]):
            in_questions = True
            lines = lines[1:]
            if not lines:
                continue
        if RE_NOTE.match(lines[0]):
            out["note"] = " ".join(lines)
            continue
        if in_questions:
            for ln in lines:
                m = RE_NUMBERED.match(ln)
                out["questions"].append(m.group(2).strip() if m else ln)
            continue
        if current is None:
            current = {"heading": None, "paragraphs": []}
            out["sections"].append(current)
        current["paragraphs"].append(" ".join(lines))

    out["sections"] = [s for s in out["sections"] if s["paragraphs"]]
    return out


def collect(folder: Path) -> dict[int, dict]:
    """Mapa numer -> tresc. Numer z poczatku nazwy pliku (`001_...`)."""
    items: dict[int, dict] = {}
    for path in sorted(folder.glob("*.md")):
        m = RE_NR_FILE.match(path.name)
        if not m:
            print(f"   pomijam (brak numeru): {path.name}")
            continue
        items[int(m.group(1))] = read_md(path)
    return items


def main() -> int:
    args = sys.argv[1:]
    check = "--check" in args
    src = DEFAULT_SRC
    if "--src" in args:
        src = Path(args[args.index("--src") + 1])

    short_dir, long_dir = src / "SzkoleniaShort", src / "SzkoleniaLong"
    for d in (short_dir, long_dir):
        if not d.exists():
            sys.exit(f"Brak katalogu: {d}")

    print("krótka wersja:")
    short = collect(short_dir)
    print("pełna wersja:")
    long = collect(long_dir)
    print(f"\nSzkolenia: krótkich {len(short)}, pełnych {len(long)}")

    numbers = sorted(set(short) | set(long))
    problems = []
    for n in numbers:
        if n not in short:
            problems.append(f"Szkolenie {n}: brak wersji krótkiej")
        if n not in long:
            problems.append(f"Szkolenie {n}: brak wersji pełnej")

    index_items = []
    files: dict[int, dict] = {}
    for n in numbers:
        s, l = short.get(n), long.get(n)
        base = l or s
        quote = (base or {}).get("quote") or {}
        item = {
            "nr": n,
            "title": base["title"],
            "ref": quote.get("ref", ""),
            "note": base["note"],
            "versions": {},
        }
        for key, data in (("short", s), ("long", l)):
            if not data:
                continue
            item["versions"][key] = {
                "sections": data["sections"],
                "quote": data["quote"],
                "questions": data["questions"],
            }
        files[n] = item
        index_items.append({"nr": n, "title": base["title"], "ref": item["ref"]})

        if not base["title"]:
            problems.append(f"Szkolenie {n}: pusty tytuł")
        if not item["ref"]:
            problems.append(f"Szkolenie {n}: brak odnośnika do wersetu")
        for key, data in (("short", s), ("long", l)):
            if data and not data["questions"]:
                problems.append(f"Szkolenie {n} ({key}): brak pytań")
        if s and l and s["title"] != l["title"]:
            problems.append(f"Szkolenie {n}: różne tytuły w obu wersjach")

    def chars(items: dict[int, dict]) -> int:
        return sum(len(p) for d in items.values() for s in d["sections"] for p in s["paragraphs"])

    print(f"Znaków: krótkie {chars(short) // 1000} tys., pełne {chars(long) // 1000} tys.")
    print(f"Śródtytułów w wersji pełnej: {sum(1 for d in long.values() for s in d['sections'] if s['heading'])}")

    if problems:
        print(f"\nPROBLEMY ({len(problems)}):")
        for p in problems[:20]:
            print(" -", p)

    if check:
        for n in numbers[:3]:
            d = files[n]
            print(f"\n  {d['nr']}. {d['title']} ({d['ref']})")
            for key, v in d["versions"].items():
                print(f"    {key}: sekcji {len(v['sections'])}, "
                      f"akapitów {sum(len(s['paragraphs']) for s in v['sections'])}, "
                      f"pytań {len(v['questions'])}")
                print(f"      werset: {(v['quote'] or {}).get('text', '')[:70]}")
        return 1 if problems else 0

    OUT.mkdir(parents=True, exist_ok=True)
    for n, item in files.items():
        with io.open(OUT / f"{n:02d}.json", "w", encoding="utf-8", newline="\n") as f:
            json.dump(item, f, ensure_ascii=False, indent=2)
            f.write("\n")

    index = {
        "lang": "pl",
        "title": "Materiały edukacyjne",
        "series": "#JestNadzieja",
        "items": index_items,
    }
    with io.open(OUT / "index.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total = sum(p.stat().st_size for p in OUT.glob("*.json"))
    print(f"\nZapisano {len(files)} szkoleń + index -> {OUT.relative_to(ROOT)} ({total/1024:.0f} KB)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
