#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada "Piesni mlodziezowe" z kolekcji spiewnikow campowych (SpiewnikiYouth/).

    python tools/extract_youth.py            # -> public/content/pl/songs-youth.json
    python tools/extract_youth.py --check    # sam raport, bez zapisu

Zrodla maja rozne uklady, wiec kazdy typ pliku ma wlasny czytnik:

  *.docx (Camp 2023)  - najczystsze zrodlo: "Heading 1" to tytul piesni, akapit
                        pogrubiony to linia akordow, reszta to tekst;
  *.pdf  (Camp 2018+) - tytul wiekszym stopniem pisma, metryczka piesni drobnym
                        kursywnym, akordy pogrubione; strony dwulamowe czytamy
                        kolumnami, bo kolejnosc blokow w PDF bywa rozsypana.

Dalej wszystko idzie wspolna droga: sklejenie zwrotek i refrenu, przeniesienie
akordow na koniec linijki (patrz CHORD_MARK), deduplikacja miedzy rocznikami
(ta sama piesn bywa w kilku obozach) i odsianie tego, co juz jest w "Spiewajmy
Panu" pod numerami 1-700. Tytuly skladane wersalikami wracaja do zwyklego
zapisu (patrz nice_title).
"""
from __future__ import annotations

import io
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("Brak PyMuPDF. Zainstaluj: pip install pymupdf")
try:
    import docx
except ImportError:
    sys.exit("Brak python-docx. Zainstaluj: pip install python-docx")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "SpiewnikiYouth"
HYMNAL = ROOT / "public" / "content" / "pl" / "songs.json"
OUT = ROOT / "public" / "content" / "pl" / "songs-youth.json"
# rozdzial 41 "Spiewajmy Panu" (nr 701-750) - plik posredni z extract_spiewnik.py.
# Decyzja autora 2026-08-25: te piesni naleza do spiewnika mlodziezowego.
HYMNAL_YOUTH = ROOT / "Spiewnik" / "_701-750.json"

# numery, ponizej ktorych piesn uznajemy za "juz w spiewniku" (decyzja autora)
HYMNAL_MAX_NR = 700

# Kolejnosc waznosci zrodel - decyzja autora: przy powtorzeniu obowiazuje tresc
# z najnowszego spiewnika. Pierwszy pasujacy wzorzec wyznacza range pliku.
PRIORITY = [
    "danielkow",        # Danielkowy Spiewniczek 2 (plik z 2025)
    "wnim",             # Spiewnik 2023, WNiM i NaZywo, v2 (wrzesien 2023)
    "spiewnik 2023",    # Spiewnik 2023 v5
    "camp2022",
    "camp_2021",
    "camp_2020",
    "camp2019",
    "camp2018",
]


def rank(name: str) -> int:
    """Im nizej, tym nowsze zrodlo; nieznane pliki ida na koniec."""
    low = name.lower()
    for i, pat in enumerate(PRIORITY):
        if pat in low:
            return i
    return len(PRIORITY)

RE_STANZA = re.compile(r"^(\d+)[.)]\s*(.*)$", re.S)
RE_REFRAIN = re.compile(r"^(?:Ref|Refren|Chorus)\b[^:]*[:.]?\s*(.*)$", re.S | re.I)
RE_BRIDGE = re.compile(r"^(?:Bridge|Most)\b[^:]*[:.]?\s*(.*)$", re.S | re.I)
# linia zlozona wylacznie z akordow (z tabulatorami miedzy nimi)
RE_CHORD_LINE = re.compile(
    r"^(?:\s*[A-Ha-h](?:is|es|s|b|#)?(?:m|maj|dim|aug|sus|add)?\d*"
    r"(?:\([^)]*\))?(?:/[A-Ha-h](?:is|es|s|#|b)?)?[\s,/|]*)+$"
)
# W spiewnikach obozowych tytul niesie dopiski skladowe: "Intro: G a C G",
# "Outro: D A D", akordy po tabulatorze, a przy piesniach przejetych ze
# "Spiewajmy Panu" - numer w nawiasie: "GDY NA TEN SWIAT SPOGLADAM (17)",
# "ACH, JAK MOJE SERCE (112 S)". Ten numer jest gotowa odpowiedzia na pytanie,
# czy piesn juz jest w spiewniku.
# Litera przy numerze mowi, z ktorego spiewnika piesn pochodzi (decyzja autora):
#   S - "Spiewajmy Panu"      -> odsiewamy,
#   T i pozostale             -> zostaja,
#   sam numer (Camp 2023)     -> odsiewamy, ale dopiero po sprawdzeniu, ze piesn
#                                o tym numerze naprawde zgadza sie tytulem.
RE_TITLE_NR = re.compile(r"[\u2014–-]?\s*\((\d{1,3})\s*([A-Za-z]?)\s*\)")
RE_TITLE_CUT = re.compile(
    r"\s*(?:Intro|Outro|Solo|Coda|Capo|Tytu[łl] orygina[łl]u|M&S|Wykonawca|"
    r"T[łl]umaczenie|Muzyka|S[łl]owa)\b.*$",
    re.IGNORECASE,
)
# akordy doklejone na koncu tytulu po tabulatorze: "Dotknij mnie... g D g D"
RE_TITLE_CHORDS = re.compile(
    r"\s+(?:[A-Ha-h](?:is|es|s|b|#)?(?:m|maj|dim|sus|add)?\d*(?:/[A-Ha-h][#b]?)?\s+){1,}"
    r"[A-Ha-h](?:is|es|s|b|#)?(?:m|maj|dim|sus|add)?\d*\s*$"
)


def clean_title(text: str) -> tuple[str, int | None, str]:
    """Zwraca (tytul, numer w nawiasie albo None, litera spiewnika)."""
    text = text.replace("	", " ")
    nr, letter = None, ""
    m = RE_TITLE_NR.search(text)
    if m:
        nr = int(m.group(1))
        letter = m.group(2).upper()
        text = text[: m.start()] + text[m.end() :]
    text = RE_TITLE_CUT.sub("", text)
    text = RE_TITLE_CHORDS.sub("", text)
    text = re.sub(r"^\d+[.)]\s*", "", text)
    return squeeze(text).strip(" -\u2014–:"), nr, letter


RE_META = re.compile(
    r"^(?:tytu[łl] orygina[łl]u|m&s|muz|s[łl]owa|s[łl]\.|muzyka|wykonawca|t[łl]umaczenie|"
    r"t[łl]um\.|orygina[łl]|autor|copyright|www\.|©)",
    re.I,
)


# Akordy stoja w spiewnikach nad linijka tekstu. W aplikacji tekst sie przelewa,
# wiec tej pozycji nie da sie utrzymac (decyzja autora 2026-08-25): akordy ida na
# koniec swojej linijki, za "//". Wyswietla je SongBody w src/pages/Songs.tsx.
CHORD_MARK = " // "

RE_CHORD_TOKEN = re.compile(
    r"^[A-Ha-h](?:is|es|s|b|#)?(?:m|maj|min|dim|aug|sus|add)?\d*"
    r"(?:\([^)]*\))?(?:/[A-Ha-h](?:is|es|s|#|b)?)?$"
)
# to, co w linii akordow nie jest akordem: kreski taktowe, powtorki, palcowanie
RE_CHORD_FILLER = re.compile(r"^(?:[|:/,.\-\u2014–]+|/?x\s?\d*|\d+\s?x|\(\d*x?\)|\d+)$", re.I)
# wskazowki wykonawcze: "Intro: a G D", "Coda", "capo3"
RE_PLAY_MARK = re.compile(r"^(intro|outro|solo|coda|capo)\s*[:.]?\s*(.*)$", re.I)
# sam znacznik bez tresci - akordy nad nim naleza do nastepnej linijki
RE_BARE_MARK = re.compile(r"^(?:\d+[.)]|Ref\w*|Chorus|Bridge|Most\w*)\s*[:.]?\s*$", re.I)
# znaki, ktorych skladacz nie widzi, a ktore psuja porownania i lamanie wiersza
# akordy doklejone za "//" - przy porownywaniu piesni nie licza sie
RE_CHORD_TAIL = re.compile(r"\s*//[^\n]*")
RE_INVISIBLE = re.compile(r"[\u200b-\u200f\ufeff\u00ad]")


def chordish(text: str) -> bool:
    """Czy linia niesie same akordy (z kreskami taktowymi i powtorkami)?"""
    tokens = text.replace("\t", " ").split()
    if not tokens or len(text) > 80:
        return False
    chords = sum(1 for tok in tokens if RE_CHORD_TOKEN.match(tok))
    junk = sum(
        1 for tok in tokens if not RE_CHORD_TOKEN.match(tok) and not RE_CHORD_FILLER.match(tok)
    )
    return chords >= 1 and junk == 0


def play_mark(line: str) -> str | None:
    """Akordy ze wskazowki wykonawczej; "" dla samego znacznika, None gdy to tekst."""
    m = RE_PLAY_MARK.match(line.strip())
    if not m:
        return None
    name, rest = m.group(1).lower(), m.group(2).strip()
    if name == "capo":
        return f"Capo {rest}".strip() if re.fullmatch(r"\d{1,2}", rest) else None
    if not rest:
        return ""
    return rest if chordish(rest) else None


def split_trailing_chords(line: str) -> tuple[str, str]:
    """Dzieli linijke na tekst i akordy stojace w druku w prawej kolumnie."""
    tokens = line.split()
    i = len(tokens)
    while i > 0 and (RE_CHORD_TOKEN.match(tokens[i - 1]) or RE_CHORD_FILLER.match(tokens[i - 1])):
        i -= 1
    tail = tokens[i:]
    # dwa akordy to za malo, by pomylic je z koncem zdania ("...mój Pan")
    if i == 0 or sum(1 for tok in tail if RE_CHORD_TOKEN.match(tok)) < 2:
        return line, ""
    return " ".join(tokens[:i]), " ".join(tail)


def attach(pending: list[str], line: str) -> str:
    """Skleja linijke z jej akordami: najpierw caly tekst, potem "//" i akordy."""
    text, tail = split_trailing_chords(line)
    chords = [c for c in ([tail] + list(pending)) if c]
    if not chords:
        return text
    return text + CHORD_MARK + squeeze(" ".join(chords))


# Spiewniki obozowe skladaja tytuly wersalikami. Zapis wraca do normalnego:
# wielka litera tylko na poczatku i w nazwach wlasnych (decyzja autora
# 2026-08-25) - zaimki odnoszace sie do Boga ida mala litera.
PROPER = {
    w.lower(): w
    for w in (
        "Bóg Boga Bogu Bogiem Boże Bogów "
        "Pan Pana Panu Panem Panie Panów "
        "Jezus Jezusa Jezusowi Jezusem Jezusie Jezu "
        "Chrystus Chrystusa Chrystusowi Chrystusem Chrystusie Chryste "
        "Ojciec Ojca Ojcu Ojcem Ojcze "
        "Boży Boża Bożego Bożej Bożemu Bożą Bożym Bożych Bożymi "
        "Duch Ducha Duchu Duchem Duchowi "
        "Zbawca Zbawcy Zbawcę Zbawco Zbawcą Zbawiciel Zbawiciela Zbawicielowi Zbawicielu Zbawicielem "
        "Stwórca Stwórcy Stwórcę Stwórco Stwórcą Odkupiciel Odkupiciela Odkupicielu Mesjasz Mesjasza "
        "Adonai Emmanuel Immanuel Jahwe Maranatha "
        "Izrael Izraela Izraelu Syjon Syjonu Syjonie Betlejem Golgota Golgocie "
        "Jeruzalem Jerozolima Jerozolimy Dawid Dawida Maria Marii"
    ).split()
}


def nice_title(text: str) -> str:
    """Tytul zwyklym zapisem: wielka litera na poczatku i w nazwach wlasnych."""
    out: list[str] = []
    start = True
    for token in re.split(r"(\W+)", squeeze(text), flags=re.UNICODE):
        if not token:
            continue
        if re.fullmatch(r"\W+", token, flags=re.UNICODE):
            out.append(token)
            if re.search(r"[.!?…]", token):
                start = True
            continue
        low = token.lower()
        if low in PROPER:
            out.append(PROPER[low])
        elif start:
            out.append(low[:1].upper() + low[1:])
        else:
            out.append(low)
        start = False
    return "".join(out)


def fold(text: str) -> str:
    """Klucz porownawczy: bez ogonkow, znakow i wielkosci liter."""
    text = text.replace("ł", "l").replace("Ł", "L")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # ciag odstepow zwija sie do jednego - inaczej ta sama piesn z innym
    # skladem interpunkcji nie rozpozna sie jako ta sama
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text.lower())).strip()


def squeeze(text: str) -> str:
    # pauza (em dash) nie wchodzi do tresci - w polskim skladzie stoi polpauza
    text = RE_INVISIBLE.sub("", text).replace(chr(0x2014), chr(0x2013))
    return re.sub(r"\s+", " ", text).strip()


def is_chord(line: str) -> bool:
    s = line.strip()
    if not s or len(s) > 60:
        return False
    return bool(RE_CHORD_LINE.match(s))


# --------------------------------------------------------------------------- docx


def read_docx(path: Path) -> list[dict]:
    """Camp 2023: naglowek = tytul, akapit pogrubiony = akordy, reszta = tekst."""
    doc = docx.Document(path)
    songs: list[dict] = []
    current: dict | None = None
    pending: list[str] = []  # akordy czekajace na swoja linijke tekstu
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        if para.style.name.startswith("Heading 1"):
            title, nr, letter = clean_title(text)
            if not title or is_chord(title):
                continue  # naglowek z samym "Intro:" - dalszy ciag poprzedniej piesni
            current = {
                "title": title,
                "hymnal_nr": nr,
                "hymnal_letter": letter,
                "lines": [],
                "meta": [],
                "source": path.stem,
            }
            songs.append(current)
            pending = []
            continue
        if current is None:
            continue
        if RE_META.match(text):
            current["meta"].append(squeeze(text))
            continue
        mark = play_mark(text)
        if mark is not None:
            if mark:
                pending.append(mark)
            continue
        runs = [r for r in para.runs if r.text.strip()]
        bold = bool(runs) and all(r.bold for r in runs)
        if chordish(text):
            pending.append(squeeze(text))
            continue
        if bold:
            continue  # pogrubione, a nie akordy - w druku bywa tam sam znaczek
        line = squeeze(text)
        if RE_BARE_MARK.match(line):
            current["lines"].append(line)  # akordy nad "Ref:" naleza do nastepnej linijki
            continue
        current["lines"].append(attach(pending, line))
        pending = []
    return songs


# --------------------------------------------------------------------------- pdf


def join_spans(spans: list) -> str:
    """Skleja spany wiersza. Sasiednie spany rozdzielone odstepem w skladzie
    musza dostac spacje, inaczej tytul wychodzi jako "Bogdobryjest"."""
    out = ""
    prev_end = None
    for s in spans:
        text = s["text"]
        if prev_end is not None and not out.endswith(" ") and not text.startswith(" "):
            if s["bbox"][0] - prev_end > 1.0:
                out += " "
        out += text
        prev_end = s["bbox"][2]
    return out.strip()


def pdf_columns(page, page_no: int = 0, gap_ratio: float = 0.52):
    """Wiersze strony w porzadku czytania: najpierw lewa lama, potem prawa."""
    spans = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if span["text"].strip():
                    spans.append(span)
    if not spans:
        return []
    mid = page.rect.width * gap_ratio
    left = [s for s in spans if s["bbox"][0] < mid]
    right = [s for s in spans if s["bbox"][0] >= mid]
    out = []
    for column in (left, right):
        rows: dict[int, list] = {}
        for s in column:
            rows.setdefault(round(s["bbox"][1] / 2), []).append((s["bbox"][0], s))
        for y in sorted(rows):
            group = [s for _, s in sorted(rows[y])]
            out.append(
                {
                    "text": join_spans(group),
                    "size": max(s["size"] for s in group),
                    "bold": any("Bold" in s["font"] for s in group),
                    "italic": all("Italic" in s["font"] for s in group),
                    "y": min(s["bbox"][1] for s in group),
                    "page": page_no,
                }
            )
    return out


def read_pdf(path: Path) -> list[dict]:
    """Tytul piesni stoi wyraznie wiekszym stopniem pisma niz tekst."""
    doc = fitz.open(path)
    rows = []
    for page_no in range(doc.page_count):
        text = doc[page_no].get_text()
        if re.search(r"spis\s+tre[śs]ci", text, re.I):
            continue  # sam wykaz tytulow - piesni sa dalej
        rows.extend(pdf_columns(doc[page_no], page_no))
    if not rows:
        return []

    # stopien pisma tekstu = najczestszy w dokumencie; tytul jest od niego wiekszy
    sizes: dict[float, int] = {}
    for r in rows:
        sizes[round(r["size"], 1)] = sizes.get(round(r["size"], 1), 0) + len(r["text"])
    body_size = max(sizes, key=sizes.get)

    small = [r for r in rows if r["size"] < body_size - 1.5]

    def has_credits_nearby(r: dict) -> bool:
        """Metryczka piesni stoi na wysokosci tytulu - czesto w sasiedniej lamie."""
        return any(
            c["page"] == r["page"] and -4 <= c["y"] - r["y"] <= 40 for c in small
        )

    def looks_like_title(i: int, r: dict) -> bool:
        """Tytul: wiekszy stopien pisma, wersaliki albo metryczka piesni obok."""
        text = r["text"].strip()
        if r["size"] > body_size + 0.9:
            return True
        if not re.match(r"^\d+[.)]\s*\S", text) or len(text) > 60:
            return False
        bare = re.sub(r"^\d+[.)]\s*", "", text)
        # Danielkowy sklada tytuly wersalikami w tym samym stopniu co tekst;
        # numer zwrotki bywa pogrubiony, wiec samo pogrubienie nie wystarcza
        if r["bold"] and len(bare) > 3 and bare == bare.upper():
            return True
        return has_credits_nearby(r) and len(text) < 45

    songs: list[dict] = []
    current: dict | None = None
    pending: list[str] = []
    for i, r in enumerate(rows):
        text = r["text"].strip()
        if not text or text.isdigit():
            continue
        if looks_like_title(i, r):
            title, nr, letter = clean_title(text)
            if len(title) < 3 or is_chord(title):
                continue
            current = {
                "title": title,
                "hymnal_nr": nr,
                "hymnal_letter": letter,
                "lines": [],
                "meta": [],
                "source": path.stem,
            }
            songs.append(current)
            pending = []
            continue
        if current is None:
            continue
        if r["size"] < body_size - 0.9 or RE_META.match(text):
            current["meta"].append(squeeze(text))
            continue
        mark = play_mark(text)
        if mark is not None:
            if mark:
                pending.append(mark)
            continue
        if chordish(text):
            pending.append(squeeze(text))
            continue
        line = squeeze(text)
        if RE_BARE_MARK.match(line):
            current["lines"].append(line)
            continue
        current["lines"].append(attach(pending, line))
        pending = []
    return songs


# --------------------------------------------------------------------------- wspolne


def build(raw: dict) -> dict | None:
    """Zamienia surowe wiersze w zwrotki, refren i mostek."""
    stanzas: list[dict] = []
    refrain: list[str] | None = None
    bridge: list[str] | None = None
    bucket: list[str] | None = None

    for line in raw["lines"]:
        m = RE_REFRAIN.match(line)
        if m:
            if refrain is None:
                refrain = [m.group(1).strip()] if m.group(1).strip() else []
                bucket = refrain
            else:
                bucket = None  # powtorzony refren - w druku stoi kilka razy
            continue
        m = RE_BRIDGE.match(line)
        if m:
            bridge = [m.group(1).strip()] if m.group(1).strip() else []
            bucket = bridge
            continue
        m = RE_STANZA.match(line)
        if m and len(m.group(2)) > 2:
            stanzas.append({"n": int(m.group(1)), "lines": [m.group(2).strip()]})
            bucket = stanzas[-1]["lines"]
            continue
        if bucket is None:
            if refrain is not None:
                continue  # dalszy ciag refrenu wydrukowanego drugi raz
            stanzas.append({"n": len(stanzas) + 1, "lines": []})
            bucket = stanzas[-1]["lines"]
        bucket.append(line)

    out_stanzas = [{"n": i + 1, "text": "\n".join(s["lines"]).strip()}
                   for i, s in enumerate(stanzas) if any(s["lines"])]
    if not out_stanzas and not refrain:
        return None

    song = {"title": nice_title(raw["title"]), "stanzas": out_stanzas, "single": len(out_stanzas) <= 1}
    if raw.get("hymnal_nr"):
        song["hymnalNr"] = raw["hymnal_nr"]
        song["hymnalLetter"] = raw.get("hymnal_letter", "")
    if refrain:
        song["refrain"] = "\n".join(refrain).strip()
    if bridge:
        song["bridge"] = "\n".join(bridge).strip()
    if raw["meta"]:
        song["author"] = squeeze(" · ".join(dict.fromkeys(raw["meta"])))[:200]
    song["from"] = raw["source"]
    return song


def tight(text: str) -> str:
    """Tytul bez spacji - lapie dublet zapisany z innym odstepem."""
    return fold(text).replace(" ", "")


def has_chords(song: dict) -> bool:
    """Czy piesn niesie akordy dopisane za CHORD_MARK?"""
    parts = [s["text"] for s in song["stanzas"]] + [song.get("refrain", ""), song.get("bridge", "")]
    return CHORD_MARK.strip() in " ".join(p for p in parts if p)


def body_key(song: dict) -> str:
    """Odcisk piesni: poczatek tekstu wystarczy, by rozpoznac te sama w innym roczniku."""
    text = " ".join(s["text"] for s in song["stanzas"]) or song.get("refrain", "")
    return fold(RE_CHORD_TAIL.sub(" ", text))[:70]


def main() -> int:
    check = "--check" in sys.argv
    if not SRC.exists():
        sys.exit(f"Brak katalogu: {SRC}")

    raw: list[dict] = []
    for path in sorted(SRC.iterdir(), key=lambda p: (rank(p.name), p.name)):
        if path.suffix.lower() == ".docx" and not path.name.startswith("~$"):
            found = read_docx(path)
        elif path.suffix.lower() == ".pdf":
            found = read_pdf(path)
        else:
            continue
        print(f"  [{rank(path.name)}] {path.name:44} {len(found):4} piesni")
        raw.extend(found)

    songs = [s for s in (build(r) for r in raw) if s]
    print(f"\nRazem wyciagnietych: {len(songs)}")

    # 1. deduplikacja miedzy rocznikami - zostawiamy wersje z najobszerniejszym tekstem
    best: dict[str, dict] = {}
    for song in songs:
        keys = [fold(song["title"]), tight(song["title"]), body_key(song)]
        hit = next((best[k] for k in keys if k in best), None)
        if hit is None:
            for k in keys:
                best[k] = song
        elif rank(song["from"]) < rank(hit["from"]):
            # nowszy rocznik ma pierwszenstwo, nawet gdy jest krotszy
            for k in keys + [fold(hit["title"]), body_key(hit)]:
                best[k] = song
    unique = list(dict.fromkeys(id(s) for s in best.values()))
    by_id = {id(s): s for s in best.values()}
    songs = [by_id[i] for i in unique]
    print(f"Po deduplikacji rocznikow: {len(songs)} (przy powtorzeniu wygrywa nowszy)")

    # 2. odsianie tego, co jest w "Spiewajmy Panu" 1-700
    skipped: list[str] = []
    if HYMNAL.exists():
        hym = json.load(io.open(HYMNAL, encoding="utf-8"))["songs"]
        titles = {fold(h["title"]) for h in hym if h["nr"] <= HYMNAL_MAX_NR}
        bodies = {body_key(h) for h in hym if h["nr"] <= HYMNAL_MAX_NR}
        by_nr = {h["nr"]: h for h in hym}
        keep = []
        for song in songs:
            nr = song.get("hymnalNr")
            letter = song.pop("hymnalLetter", "")
            song.pop("hymnalNr", None)
            in_range = bool(nr) and nr <= HYMNAL_MAX_NR

            # litera "S" to wprost odsylacz do "Spiewajmy Panu"
            if in_range and letter == "S":
                skipped.append(f"{song['title']} – S {nr}")
                continue
            # sam numer bez litery: ufamy mu dopiero, gdy tytul faktycznie sie zgadza
            if in_range and not letter:
                other = by_nr.get(nr)
                if other and (
                    fold(other["title"])[:14] in fold(song["title"])
                    or fold(song["title"])[:14] in fold(other["title"])
                    or body_key(song)[:40] == body_key(other)[:40]
                ):
                    skipped.append(f"{song['title']} – nr {nr}: {other['title']}")
                    continue
            # litera inna niz S (np. T) znaczy inny spiewnik - piesn zostaje
            if fold(song["title"]) in titles or body_key(song) in bodies:
                skipped.append(f"{song['title']} – ten sam tekst co w śpiewniku")
                continue
            keep.append(song)
        songs = keep
    print(f"Odsianych (są w śpiewniku 1-{HYMNAL_MAX_NR}): {len(skipped)}")
    for t in skipped[:20]:
        print(f"   - {t}")

    # 3. dolozenie rozdzialu 41 ze "Spiewajmy Panu" (nr 701-750)
    #    Przy powtorzeniu decyduje to, czego w druku nie ma: jesli wersja obozowa
    #    ma akordy, zostaje jej tekst, a ze spiewnika bierzemy tonacje, autora
    #    i numer. Jesli akordow nie ma, wygrywa tekst ze spiewnika - jest zredagowany.
    dolozone, scalone = 0, 0
    if HYMNAL_YOUTH.exists():
        by_key: dict[str, dict] = {}
        for song in songs:
            by_key.setdefault(fold(song["title"]), song)
            by_key.setdefault(body_key(song), song)
        for raw41 in json.load(io.open(HYMNAL_YOUTH, encoding="utf-8"))["songs"]:
            piesn = dict(raw41)
            nr41 = piesn.pop("nr")
            piesn.pop("section", None)  # w mlodziezowych nie ma dzialow, lista jest alfabetyczna
            piesn["title"] = nice_title(piesn["title"])
            piesn["hymnalNr"] = nr41
            piesn["from"] = f"Śpiewajmy Panu {nr41}"
            hit = by_key.get(fold(piesn["title"])) or by_key.get(body_key(piesn))
            if hit is None:
                songs.append(piesn)
                dolozone += 1
                continue
            scalone += 1
            if has_chords(hit):
                hit["hymnalNr"] = nr41
                # tonacja i metryczka ze spiewnika sa zredagowane, a te ze spiewnikow
                # obozowych bywaja resztka po skladzie ("Tytul oryginalu: ... M&S: D")
                for pole in ("key", "author"):
                    if piesn.get(pole):
                        hit[pole] = piesn[pole]
            else:
                hit.clear()
                hit.update(piesn)
    print(f"Z rozdzialu 41: dolozonych {dolozone}, scalonych z obozowymi {scalone}")

    # 3. alfabetycznie; numer sluzy tylko za adres piesni w aplikacji
    songs.sort(key=lambda s: fold(s["title"]))
    for i, song in enumerate(songs, 1):
        song["nr"] = i

    print(f"\nPiesni mlodziezowych: {len(songs)}")
    print(f"  z refrenem:  {sum(1 for s in songs if s.get('refrain'))}")
    print(f"  z bridge:    {sum(1 for s in songs if s.get('bridge'))}")
    print(f"  z akordami:  {sum(1 for s in songs if has_chords(s))}")

    if check:
        return 0

    data = {
        "lang": "pl",
        "title": "Pieśni młodzieżowe",
        "source": {
            "name": "Śpiewniki obozowe (Camp / WNiM / Na Żywo, Danielkowy Śpiewniczek)",
            "note": "Zbiór z lat 2018–2023; pieśni obecne w „Śpiewajmy Panu” (1–700) pominięte.",
        },
        "songs": songs,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nZapisano -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
