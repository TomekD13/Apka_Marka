#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Nagranie lektorskie Czlowieka Nadziei -> lekki plik do aplikacji.

    python tools/build_edu_audio.py 1 "<sciezka do nagrania wzorcowego>.mp3"
    python tools/build_edu_audio.py 1 "<...>.mp3" --kbps 64

Wzorzec (np. z ElevenLabs, MP3 128 kb/s, ~13 MB na odcinek) jest za ciezki do
sluchania na komorce w trasie. Robimy z niego:
  - mono, 24 kHz, MP3 48 kb/s (sam glos - roznicy prawie nie slychac, plik ~3x mniejszy),
  - glosnosc wyrownana do -16 LUFS (norma podcastow; wzorce z ElevenLabs maja ok. -24),
  - tagi ID3 (tytul, seria, numer), zeby ekran blokady telefonu pokazywal, co gra.

Wynik: public/audio/edu/NNN.mp3. Katalog public/audio/ jest w .gitignore - repo jest
publiczne, a 400 nagran po kilka MB rozsadziloby historie. Plik trafia na serwer razem
z buildem (deploy-ftp.sh wysyla dist/), a extract_edu.py dopisuje go do JSON-a materialu.
Po tym skrypcie uruchom wiec `python tools/extract_edu.py`.

Potrzebny ffmpeg w PATH.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "edu"
EDU = ROOT / "public" / "content" / "pl" / "edu"
LOUDNESS = "I=-16:TP=-1.5:LRA=11"


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def measure(src: Path) -> dict:
    """Pierwsze przejscie loudnorm - pomiar, zeby drugie moglo wzmocnic liniowo."""
    p = run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", f"loudnorm={LOUDNESS}:print_format=json", "-f", "null", "-"])
    tail = p.stderr[p.stderr.rindex("{"):]
    return json.loads(tail[: tail.index("}") + 1])


def main() -> int:
    args = sys.argv[1:]
    kbps = 48
    if "--kbps" in args:
        i = args.index("--kbps")
        kbps = int(args[i + 1])
        del args[i : i + 2]
    if len(args) != 2:
        print(__doc__)
        return 2
    nr, src = int(args[0]), Path(args[1])
    if not src.exists():
        sys.exit(f"Brak pliku: {src}")

    title = f"Człowiek Nadziei {nr}"
    item = EDU / f"{nr:02d}.json"
    if item.exists():
        title = f"{nr}. " + json.loads(item.read_text(encoding="utf-8"))["title"]

    m = measure(src)
    print(f"glosnosc wzorca: {m['input_i']} LUFS, szczyt {m['input_tp']} dBTP")
    af = (
        f"loudnorm={LOUDNESS}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
        f":offset={m['target_offset']}:linear=true"
    )
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"{nr:03d}.mp3"
    p = run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
        "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", f"{kbps}k",
        "-map_metadata", "-1", "-id3v2_version", "3",
        "-metadata", f"title={title}", "-metadata", "artist=#JestNadzieja",
        "-metadata", "album=Człowiek Nadziei", "-metadata", f"track={nr}",
        str(dst),
    ])
    if p.returncode:
        sys.exit(p.stderr)
    print(f"{dst.relative_to(ROOT)}: {src.stat().st_size / 1e6:.1f} MB -> {dst.stat().st_size / 1e6:.1f} MB ({kbps} kb/s mono)")
    print("dalej: python tools/extract_edu.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
