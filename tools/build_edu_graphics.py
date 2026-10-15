#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Grafiki do udostepniania pod materialem Czlowieka Nadziei.

    python tools/build_edu_graphics.py          # wszystkie z one27/SzkoleniaGrafiki
    python tools/build_edu_graphics.py 1        # tylko materialu 1

Zrodlo: one27/SzkoleniaGrafiki/NNNa.png, NNNb.png ... (PNG ok. 1,7 MB, 1122x1402).
Opcjonalnie NNNa.txt obok - tekst grafiki: opis dla czytnikow ekranu i podpis przy
udostepnianiu (bez pliku opis jest ogolny).

Wynik: public/media/edu/NNNa.jpg (szerokosc 1080, JPEG ok. 200 KB) - tyle wystarczy na
telefon i do wyslania dalej. Katalog public/media/ jest w .gitignore tak jak nagrania
(repo publiczne, setki plikow); serwer dostaje je z dist/ przez deploy-ftp.sh.
Po tym skrypcie uruchom `python tools/extract_edu.py`, ktory dopisze grafiki do JSON-a.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path.home() / "AIprojekty" / "one27" / "SzkoleniaGrafiki"
OUT = ROOT / "public" / "media" / "edu"
WIDTH = 1080
RE_NAME = re.compile(r"^(\d{3})([a-z]?)\.png$", re.I)


def main() -> int:
    only = {int(a) for a in sys.argv[1:]}
    OUT.mkdir(parents=True, exist_ok=True)
    for png in sorted(SRC.glob("*.png")):
        m = RE_NAME.match(png.name)
        if not m or (only and int(m.group(1)) not in only):
            continue
        dst = OUT / f"{m.group(1)}{m.group(2).lower()}.jpg"
        img = Image.open(png).convert("RGB")
        if img.width > WIDTH:
            img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
        img.save(dst, "JPEG", quality=86, optimize=True, progressive=True)
        print(f"{png.name}: {png.stat().st_size / 1e6:.1f} MB -> {dst.relative_to(ROOT)} "
              f"{img.width}x{img.height}, {dst.stat().st_size // 1024} KB")
    print("dalej: python tools/extract_edu.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
