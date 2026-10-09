#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada "Materialy edukacyjne" (#JestNadzieja) z plikow .md projektu one27.

    python tools/extract_edu.py                  # -> public/content/pl/edu/
    python tools/extract_edu.py --check          # sam raport, bez zapisu
    python tools/extract_edu.py --src <katalog>  # inne zrodlo niz domyslne
    python tools/extract_edu.py --nr 1-7         # tylko te materialy; reszta zostaje jak jest

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

import hashlib
import io
import json
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path.home() / "AIprojekty" / "one27"
OUT = ROOT / "public" / "content" / "pl" / "edu"
PRAY40 = ROOT / "public" / "content" / "pl" / "pray40" / "index.json"

# Do aplikacji wchodza tylko teksty po korekcie autora - w zrodle leza juz dalsze
# szkolenia (do 080), ale czekaja. Podnies, gdy autor odda kolejne.
PUBLISHED = 10

# Materialy otwarte od razu, niezaleznie od daty (decyzja autora 2026-10-09: pierwszy
# odcinek z nagraniem dostepny przed startem cyklu, reszta w swoim dniu).
OPEN_NOW = {1}

# Nagrania lektorskie: public/audio/edu/NNN.mp3 (robi je tools/build_edu_audio.py).
# Katalog jest poza repo (.gitignore), wiec ten skrypt dopisuje pole `audio` tylko
# tam, gdzie plik lezy lokalnie - uruchamiaj go na komputerze z nagraniami.
AUDIO = ROOT / "public" / "audio" / "edu"

# Czlowiek Nadziei idzie dzien po dniu zaraz po 40 dniach modlitwy (decyzja autora
# 2026-10-02): material 1 = dzien po ostatniej czytance. Etykieta jak w extract_pray40.py.
MIESIACE = ("stycznia lutego marca kwietnia maja czerwca lipca sierpnia września października listopada grudnia").split()
DNI_TYGODNIA = "poniedziałek wtorek środa czwartek piątek sobota niedziela".split()


def start_date() -> date:
    days = json.loads(PRAY40.read_text(encoding="utf-8"))["days"]
    return date.fromisoformat(max(d["date"] for d in days)) + timedelta(days=1)


def dzien(nr: int, start: date) -> tuple[str, str]:
    d = start + timedelta(days=nr - 1)
    return d.isoformat(), f"{d.day} {MIESIACE[d.month - 1]}, {DNI_TYGODNIA[d.weekday()]}"

def audio_info(nr: int) -> dict | None:
    """Opis nagrania do JSON-a: sciezka z suma (nowe nagranie = nowy adres, stare nie
    wisi w cache), dlugosc i rozmiar - czytelnik widzi je przed pobraniem."""
    path = AUDIO / f"{nr:03d}.mp3"
    if not path.exists():
        return None
    data = path.read_bytes()
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    seconds = float(p.stdout.strip()) if p.returncode == 0 and p.stdout.strip() else len(data) * 8 / 48000
    return {
        "src": f"audio/edu/{nr:03d}.mp3?v={hashlib.md5(data).hexdigest()[:8]}",
        "seconds": round(seconds),
        "bytes": len(data),
    }


RE_NR_FILE = re.compile(r"^(\d{1,3})[_\-\s]")
RE_H1 = re.compile(r"^#\s+(.*)$")
RE_H2 = re.compile(r"^##\s+(.*)$")
RE_QUESTIONS = re.compile(r"^Pytani[ae]\s+do\s+przemy[sś]lenia\s*:?\s*$", re.I)
RE_NUMBERED = re.compile(r"^(\d+)[.)]\s*(.+)$", re.S)
RE_NOTE = re.compile(r"^Cytaty\s*:", re.I)
# uklad z pazdziernika 2026: na koncu jedno pogrubione pytanie i lista zrodel
RE_BOLD_BLOCK = re.compile(r"^\*\*(.+)\*\*$", re.S)
RE_SOURCES = re.compile(r"^(Źródła|Zrodla|Bibliografia)$", re.I)
# akapity wyzwania na dzis - ida do ramki z pytaniem
RE_CHALLENGE = re.compile(r"^\*\*W (myślach|działaniu)\.\*\*")
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
        "sources": [],
        "challenge": [],
    }
    current: dict | None = None
    in_questions = False
    in_sources = False

    all_blocks = blocks(io.open(path, encoding="utf-8").read())

    def bold_question(block: str) -> bool:
        m = RE_BOLD_BLOCK.match(" ".join(ln.strip() for ln in block.splitlines() if ln.strip()))
        return bool(m) and m.group(1).strip().endswith("?") and "**" not in m.group(1)

    # pytaniem dnia jest tylko OSTATNIE pogrubione pytanie - wczesniejsze (np. wyroznione
    # pytanie we wstepie 006 u Beaty) zostaje akapitem
    last_question = max((i for i, b in enumerate(all_blocks) if bold_question(b)), default=-1)

    for bi, block in enumerate(all_blocks):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]

        m = RE_H1.match(lines[0])
        if m:
            out["title"] = m.group(1).strip()
            continue
        m = RE_H2.match(lines[0])
        if m and RE_SOURCES.match(m.group(1).strip()):
            in_sources = True
            # lista moze stac tuz pod naglowkiem, bez pustej linii (docx_bd_do_md.py)
            out["sources"] += [ln.lstrip("-*• ").strip() for ln in lines[1:] if ln.lstrip("-*• ").strip()]
            continue
        if in_sources:
            out["sources"] += [ln.lstrip("-*• ").strip() for ln in lines if ln.lstrip("-*• ").strip()]
            continue
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
        # samodzielne pogrubione pytanie zamyka tekst - to pytanie do przemyslenia
        m = RE_BOLD_BLOCK.match(" ".join(lines))
        if bi == last_question and m:
            out["questions"].append(m.group(1).strip())
            # wyzwanie stoi tuz przed pytaniem: w wersji pelnej cala sekcja „Na dzis”,
            # w krotkiej ostatni akapit („Zanim odlozysz telefon...”). Idzie do ramki z pytaniem.
            if current and (current["heading"] or "").lower().startswith("na dzi"):
                out["challenge"] = current["paragraphs"]
                out["sections"].remove(current)
                current = None
            elif current and any(RE_CHALLENGE.match(p) for p in current["paragraphs"]):
                # „W myslach” / „W dzialaniu” bez srodtytulu „Na dzis” (004 u Beaty)
                tail = []
                while current["paragraphs"] and RE_CHALLENGE.match(current["paragraphs"][-1]):
                    tail.insert(0, current["paragraphs"].pop())
                out["challenge"] = tail
            elif current and current["paragraphs"]:
                out["challenge"] = [current["paragraphs"].pop()]
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
    only: set[int] | None = None
    if "--nr" in args:
        only = set()
        for part in args[args.index("--nr") + 1].split(","):
            a, _, b = part.partition("-")
            only.update(range(int(a), int(b or a) + 1))

    short_dir, long_dir = src / "SzkoleniaShort", src / "SzkoleniaLong"
    for d in (short_dir, long_dir):
        if not d.exists():
            sys.exit(f"Brak katalogu: {d}")

    print("krótka wersja:")
    short = collect(short_dir)
    print("pełna wersja:")
    long = collect(long_dir)
    print(f"\nSzkolenia: krótkich {len(short)}, pełnych {len(long)}")

    numbers = [n for n in sorted(set(short) | set(long)) if n <= PUBLISHED]
    print(f"Do aplikacji: 1-{PUBLISHED} (reszta czeka na korektę)")
    start = start_date()
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
        iso, etykieta = dzien(n, start)
        audio = audio_info(n)
        item = {
            "nr": n,
            "date": iso,
            "dateLabel": etykieta,
            **({"open": True} if n in OPEN_NOW else {}),
            "title": base["title"],
            "ref": quote.get("ref", ""),
            "note": base["note"],
            "sources": (l or {}).get("sources") or (s or {}).get("sources") or [],
            **({"audio": audio} if audio else {}),
            "versions": {},
        }
        for key, data in (("short", s), ("long", l)):
            if not data:
                continue
            item["versions"][key] = {
                "sections": data["sections"],
                "quote": data["quote"],
                "questions": data["questions"],
                "challenge": data["challenge"],
            }
        files[n] = item
        index_items.append({
            "nr": n, "date": iso, "dateLabel": etykieta,
            **({"open": True} if n in OPEN_NOW else {}),
            "title": base["title"], "ref": item["ref"],
            **({"audio": True} if audio else {}),
        })

        if not base["title"]:
            problems.append(f"Szkolenie {n}: pusty tytuł")
        # od pazdziernika 2026 teksty nie maja wersetu przewodniego - brak odnosnika jest normalny
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
    if only is not None:
        # pozostale materialy zostaja w obecnej postaci - takze ich wpis w spisie
        old = {it["nr"]: it for it in json.loads((OUT / "index.json").read_text(encoding="utf-8"))["items"]}
        index_items = [it if it["nr"] in only or it["nr"] not in old else old[it["nr"]] for it in index_items]
        files = {n: it for n, it in files.items() if n in only}
        print(f"Aktualizuję tylko: {', '.join(map(str, sorted(files)))}")
    for n, item in files.items():
        with io.open(OUT / f"{n:02d}.json", "w", encoding="utf-8", newline="\n") as f:
            json.dump(item, f, ensure_ascii=False, indent=2)
            f.write("\n")

    index = {
        "lang": "pl",
        "title": "Człowiek Nadziei",
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
