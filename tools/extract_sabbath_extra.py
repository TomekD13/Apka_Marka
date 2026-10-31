#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada "Materialy dodatkowe" Szkoly Biblijnej z pliku calego kwartalu.

    python tools/extract_sabbath_extra.py                 # najnowszy plik z ~/AIprojekty/szk_sob
    python tools/extract_sabbath_extra.py <plik.md>       # wskazany plik
    python tools/extract_sabbath_extra.py --check         # sam raport, bez zapisu

Zrodlo: "Szkola Sobotnia RRRR-QN, Calosc kwartalu, <temat>, vN.md". Domyslnie bierzemy
najnowszy kwartal i najwyzsze vN. Uklad pliku:

    # <tytul kwartalu>
    <wiersze naglowka: "Kwartał 4/2026 · lekcje 5–13 · ..." i zdanie wstepu>
    ## Całość kwartału        -> pozycja `calosc`
    ### <tytul>
    ## Wątki                  -> "- id | Tytuł | 5, 6, 11"
    ## Lekcja N · <daty>      -> pozycja `N`
    ### <tytul>
    **Daty:** RRRR-MM-DD RRRR-MM-DD
    **Werset przewodni:** „...” (Ref).
    **Etykieta.** akapit      -> sekcja (Podsumowanie, Ellen White, ...)
    **Pytania:** + lista numerowana
    ## Źródła                 -> lista; wiersz "Cytaty: ..." to nota o przekladzie

Cytaty Pisma w tym materiale sa czescia tresci (autor cytuje Biblie Ekumeniczna),
tak jak w Grupach Nadziei - inaczej niz w `studies/`, gdzie stoja same odnosniki.

Pelna lekcja na kazdy dzien: jesli obok lezy "Szkola Sobotnia RRRR-QN, Lekcja NN, <tytul>,
krotka vN.md" (najwyzsze vN), jej dni trafiaja do pozycji NN jako `days` - aplikacja pokazuje
wtedy dzien po dniu (podsumowanie, ciekawostki, pytania) zamiast samego skrotu z calosci kwartalu:

    ## Sobota, 31 października · Wprowadzenie     -> dzien 0 (kolejne dni = kolejne daty)
    ### <tytul dnia>
    **Teksty:** / **Teksty tygodnia:** ...
    **Werset przewodni:** „...” (Ref).            (zwykle tylko w sobote)
    **Podsumowanie.** / **Ciekawostka.** akapit
    **Pytania:** + lista numerowana
    ## Całość, sobota 7 listopada · ...           -> podsumowanie tygodnia

Wynik: public/content/pl/sabbath-extra.json (jeden plik, biezacy kwartal).
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path.home() / "AIprojekty" / "szk_sob"
OUT = ROOT / "public" / "content" / "pl" / "sabbath-extra.json"

NAME_RE = re.compile(r"Szkola Sobotnia (\d{4})-Q(\d), Calosc kwartalu, .*?v(\d+)\.md$")
LESSON_RE = re.compile(r"Szkola Sobotnia (\d{4})-Q(\d), Lekcja (\d+), .*?, krotka v(\d+)\.md$")
QUARTER_RE = re.compile(r"Kwarta[lł]\s+(\d)/(\d{4})")
VERSE_RE = re.compile(r"^„(.+)”\s*\(([^()]+)\)\.?$")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$")
LABEL_RE = re.compile(r"^\*\*([^*]+?)[.:]\*\*\s*(.*)$")


def newest_source() -> Path:
    best = None
    for p in SRC_DIR.glob("Szkola Sobotnia *, Calosc kwartalu, *.md"):
        m = NAME_RE.search(p.name)
        if m:
            key = (int(m[1]), int(m[2]), int(m[3]))
            if best is None or key > best[0]:
                best = (key, p)
    if not best:
        sys.exit(f"brak pliku 'Szkola Sobotnia ..., Calosc kwartalu, ..., vN.md' w {SRC_DIR}")
    return best[1]


def clean(s: str) -> str:
    # w polskim skladzie polpauza, nie pauza
    return s.replace("—", "–").strip()


def split_doc(text: str) -> tuple[list[str], list[tuple[str, list[str]]]]:
    """Naglowek (wiersze przed pierwszym "## ") i bloki "## " z trescia."""
    lines = [clean(l) for l in text.splitlines()]
    first = next((i for i, l in enumerate(lines) if l.startswith("## ")), len(lines))
    head = [l for l in lines[:first] if l]
    blocks: list[tuple[str, list[str]]] = []
    for l in lines[first:]:
        if l.startswith("## "):
            blocks.append((l[3:].strip(), []))
        elif blocks:
            blocks[-1][1].append(l)
    return head, blocks


def head_lead(head: list[str], subtitle: str) -> str:
    # wiersz kapitalikami ("SZKOŁA SOBOTNIA · CAŁOŚĆ KWARTAŁU") to etykieta dokumentu, nie tresc
    return " ".join(l for l in head if not l.startswith("# ") and l != subtitle and l != l.upper())


def parse_sources(body: list[str]) -> tuple[list[str], str]:
    sources: list[str] = []
    note = ""
    for l in body:
        if l.startswith("- "):
            sources.append(l[2:].strip())
        elif l:
            note = (note + " " + l).strip()
    return sources, note


def parse_body(item: dict, body: list[str], problems: list[str], where: str) -> None:
    """Tytul (### ), pola **Etykieta:** i akapity **Etykieta.** jednego bloku - wpisuje do `item`."""
    sections: list[dict] = []
    questions: list[str] = []
    in_questions = False
    for l in body:
        if not l:
            continue
        if l.startswith("### "):
            item["title"] = l[4:].strip()
            continue
        m = LABEL_RE.match(l)
        if m:
            label, rest = m[1].strip(), m[2].strip()
            in_questions = False
            if label == "Daty":
                dm = DATE_RE.match(rest)
                if dm:
                    item["start"], item["end"] = dm[1], dm[2]
                else:
                    problems.append(f"{where}: zle daty '{rest}'")
            elif label == "Werset przewodni":
                vm = VERSE_RE.match(rest)
                if vm:
                    item["verse"] = {"text": vm[1].strip(), "ref": vm[2].strip()}
                else:
                    problems.append(f"{where}: werset przewodni bez „...” (ref)")
            elif label in ("Teksty", "Teksty tygodnia"):
                item["texts"] = rest.rstrip(".")
            elif label == "Pytania":
                in_questions = True
            else:
                sections.append({"label": label, "text": rest})
            continue
        qm = re.match(r"^\d+\.\s+(.+)$", l)
        if in_questions and qm:
            questions.append(qm[1].strip())
        elif sections:
            # akapit bez etykiety - dalszy ciag poprzedniej sekcji
            sections[-1]["text"] += "\n\n" + l
        else:
            problems.append(f"{where}: luzny wiersz '{l[:50]}'")
    item["sections"] = sections
    item["questions"] = questions
    if not item.get("title"):
        problems.append(f"{where}: brak tytulu (### ...)")
    if not sections:
        problems.append(f"{where}: brak tresci")


def parse(text: str) -> tuple[dict, list[str]]:
    problems: list[str] = []
    head, blocks = split_doc(text)
    title = next((l[2:].strip() for l in head if l.startswith("# ")), "")
    subtitle = next((l for l in head if QUARTER_RE.search(l)), "")
    lead = head_lead(head, subtitle)
    qm = QUARTER_RE.search(subtitle)
    quarter = f"{qm[2]}-{qm[1]}" if qm else ""
    if not title:
        problems.append("brak tytulu kwartalu (# ...)")
    if not quarter:
        problems.append("brak wiersza 'Kwartał N/RRRR' w naglowku")

    items: list[dict] = []
    threads: list[dict] = []
    sources: list[str] = []
    note = ""

    for heading, body in blocks:
        low = heading.lower()
        if low.startswith("wątki"):
            for l in body:
                if not l.startswith("- "):
                    continue
                parts = [p.strip() for p in l[2:].split("|")]
                if len(parts) != 3:
                    problems.append(f"Wątki: zly wiersz '{l}'")
                    continue
                nums = [int(n) for n in re.findall(r"\d+", parts[2])]
                threads.append({"id": parts[0], "title": parts[1], "lessons": nums})
            continue
        if low.startswith("źródła"):
            sources, note = parse_sources(body)
            continue

        lm = re.match(r"^Lekcja\s+(\d+)\s*·\s*(.+)$", heading)
        if lm:
            item: dict = {"id": lm[1], "no": int(lm[1]), "label": f"Lekcja {lm[1]}", "range": lm[2].strip()}
        elif low.startswith("całość"):
            item = {"id": "calosc", "label": heading}
        else:
            problems.append(f"nieznana sekcja '## {heading}' - pomijam")
            continue
        parse_body(item, body, problems, item["label"])
        if "no" in item and "start" not in item:
            problems.append(f"{item['label']}: brak dat - nie podswietli sie jako biezaca")
        items.append(item)

    known = {it["no"] for it in items if "no" in it}
    for th in threads:
        missing = [n for n in th["lessons"] if n not in known]
        if missing:
            problems.append(f"wątek '{th['id']}': lekcje {missing} nie istnieja")

    data = {
        "quarter": quarter,
        "title": title,
        "subtitle": subtitle,
        "lead": lead,
        "items": items,
        "threads": threads,
        "sources": sources,
        "note": note,
    }
    return data, problems


def lesson_files(src_dir: Path, quarter: str) -> dict[int, Path]:
    """Najwyzsze vN pliku "krotka" dla kazdej lekcji danego kwartalu ("2026-4")."""
    best: dict[int, tuple[int, Path]] = {}
    for p in src_dir.glob("Szkola Sobotnia *, Lekcja *, krotka v*.md"):
        m = LESSON_RE.search(p.name)
        if not m or f"{m[1]}-{m[2]}" != quarter:
            continue
        no, v = int(m[3]), int(m[4])
        if no not in best or v > best[no][0]:
            best[no] = (v, p)
    return {no: p for no, (_, p) in best.items()}


def parse_lesson(text: str, item: dict, problems: list[str]) -> None:
    """Plik lekcji "krotka" -> item["days"] oraz wstep i zrodla lekcji."""
    head, blocks = split_doc(text)
    subtitle = next((l for l in head if QUARTER_RE.search(l)), "")
    item["lead"] = head_lead(head, subtitle)
    days: list[dict] = []
    for heading, body in blocks:
        if heading.lower().startswith("źródła"):
            item["sources"], item["note"] = parse_sources(body)
            continue
        # "Sobota, 31 października · Wprowadzenie" / "Całość, sobota 7 listopada · Na zakończenie lekcji"
        when, _, kind = heading.partition(" · ")
        day: dict = {"when": when.strip(), "kind": kind.strip()}
        if when.lower().startswith("całość"):
            day["summary"] = True
        parse_body(day, body, problems, f"Lekcja {item['no']}, {when.strip()}")
        days.append(day)
    if not days:
        problems.append(f"Lekcja {item['no']}: plik dni bez sekcji '## '")
    item["days"] = days


def main() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    src = Path(args[0]) if args else newest_source()
    data, problems = parse(src.read_text(encoding="utf-8"))

    print(f"zrodlo: {src.name}")
    by_no = {it["no"]: it for it in data["items"] if "no" in it}
    for no, path in sorted(lesson_files(src.parent, data["quarter"]).items()):
        if no not in by_no:
            print(f"  (pomijam {path.name} - lekcji {no} nie ma w calosci kwartalu)")
            continue
        parse_lesson(path.read_text(encoding="utf-8"), by_no[no], problems)
        print(f"  + dni lekcji {no}: {path.name}")

    print(f"kwartal {data['quarter']}: {data['title']} - {len(data['items'])} pozycji, {len(data['threads'])} wątków")
    for it in data["items"]:
        days = f", {len(it['days'])} dni" if it.get("days") else ""
        print(f"  {it['id']:>7}  {it.get('start', ''):10}  {it.get('title', '?')}  ({len(it['questions'])} pytań{days})")
    for p in problems:
        print(f"  ! {p}")
    if check:
        return
    if not data["items"]:
        sys.exit("nic do zapisu")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"zapisano {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
