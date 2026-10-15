#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Grafiki do udostepniania pod materialem Czlowieka Nadziei.

    python tools/build_edu_graphics.py          # wszystkie z one27/HopeGrafiki
    python tools/build_edu_graphics.py 1        # tylko materialu 1

Zrodlo: one27/HopeGrafiki/NNNa.png, NNNb.png, NNNc.png albo NNN_PLa.png (NNN_ENa.png to grafiki
wersji angielskiej - tu pomijane), PNG ok. 2 MB, 1122x1402. Obok NNNa.txt albo NNN_PLa.txt - tekst
grafiki: opis dla czytnikow ekranu i podpis przy udostepnianiu (bez pliku opis jest ogolny).

Wynik w public/media/edu/ - trzy rozmiary, zeby aplikacja nie ciagnela wiecej, niz trzeba
(decyzja autora 2026-10-15):
  NNNa_m.webp  miniatura pod tekstem lekcji (szer. 240, ok. 15 KB) - jedyne, co laduje sie od razu,
  NNNa_d.webp  podglad po dotknieciu miniatury (szer. 720, ok. 80 KB),
  NNNa.jpg     pelna grafika (szer. jak oryginal, JPEG) - pobierana dopiero do udostepnienia/pobrania.
Katalog public/media/ jest w .gitignore tak jak nagrania (repo publiczne); pliki leza na serwerze
strony (deploy-ftp.sh wysyla dist/), wersja testowa bierze je stamtad (lib/media.ts). Service worker
ich nie zapisuje, wiec nie zajmuja miejsca w telefonie.
Po tym skrypcie uruchom `python tools/extract_edu.py`, ktory dopisze grafiki do JSON-a.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path.home() / "AIprojekty" / "one27" / "HopeGrafiki"
OUT = ROOT / "public" / "media" / "edu"
RE_NAME = re.compile(r"^(\d{3})(?:_PL)?([a-z]?)\.png$", re.I)
ROZMIARY = (("_m", 240, 74), ("_d", 720, 80))  # (przyrostek, szerokosc, jakosc WebP)


def zmniejsz(img: Image.Image, szer: int) -> Image.Image:
    if img.width <= szer:
        return img
    return img.resize((szer, round(img.height * szer / img.width)), Image.LANCZOS)


def main() -> int:
    only = {int(a) for a in sys.argv[1:]}
    OUT.mkdir(parents=True, exist_ok=True)
    for png in sorted(SRC.glob("*.png")):
        m = RE_NAME.match(png.name)
        if not m or (only and int(m.group(1)) not in only):
            continue
        stem = f"{m.group(1)}{m.group(2).lower()}"
        img = Image.open(png).convert("RGB")
        full = OUT / f"{stem}.jpg"
        img.save(full, "JPEG", quality=88, optimize=True, progressive=True)
        info = [f"{full.name} {full.stat().st_size // 1024} KB"]
        for suf, szer, q in ROZMIARY:
            dst = OUT / f"{stem}{suf}.webp"
            zmniejsz(img, szer).save(dst, "WEBP", quality=q, method=6)
            info.append(f"{dst.name} {dst.stat().st_size // 1024} KB")
        print(f"{png.name} ({img.width}x{img.height}): " + ", ".join(info))
    print("dalej: python tools/extract_edu.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
