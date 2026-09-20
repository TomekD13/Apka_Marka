#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sklada "Grupy Nadziei" (#JestNadzieja) z plikow .md projektu one27/GrupyBiblijne.

    python tools/extract_groups.py                  # -> public/content/pl/groups/
    python tools/extract_groups.py --check          # sam raport, bez zapisu
    python tools/extract_groups.py --src <katalog>  # inne zrodlo niz domyslne

Zrodlo prawdy o formacie: one27/GrupyBiblijne/Model materialu, vN.md (punkty 3 i 9).
Jeden temat = jeden plik `<Tytul>, vN.md`; bierzemy najwyzszy vN. Pliki zaczynajace
sie od `_` oraz "Model materialu" to zaplecze i nie wchodza. Id wpisane do
`_nie-do-apki.txt` w katalogu zrodlowym sa wstrzymane przez autora.

Material ma trzy addytywne poziomy. Kazdy blok i kazdy element niesie `poziom`
(1, 2 albo 3); aplikacja pokazuje te o poziomie <= wybranemu. Bloki prowadzacego
(`zwijany: true`) sa widoczne tylko w trybie prowadzacego i domyslnie zwiniete.

Tekst Pisma jest w tych materialach czescia tresci (grupa czyta go na glos z ekranu,
przeklad bazowy: Biblia Warszawska), wiec siedzi w JSON-ie razem z odnosnikiem - tak
jak w czytankach i materialach edukacyjnych, inaczej niz w `studies/`.

Material niekompletny (brak ktorejs sekcji obowiazkowej, dziura w identyfikatorach
pytan) NIE wchodzi do aplikacji - skrypt wypisuje go w raporcie i idzie dalej.

Wynik: groups/index.json (serie + spis) i groups/<id>.json (tresc), np. groups/E-01.json.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KANDYDACI_SRC = [
    ROOT.parent.parent / "one27" / "GrupyBiblijne",
    Path.home() / "AIprojekty" / "one27" / "GrupyBiblijne",
]
OUT = ROOT / "public" / "content" / "pl" / "groups"

# kolejnosc i opisy serii; prefiks = poczatek pola `id` w metryce
SERIE = [
    ("E", "Emocje", "Piętnaście spotkań o tym, co dzieje się w nas, i o tym, co Biblia z tym robi."),
    ("R", "Relacje", "Dwanaście spotkań o tym, co dzieje się między nami: konflikt, przebaczenie, małżeństwo, przyjaźń, granice."),
    ("P", "Pytania, które ludzie zadają", "Dwanaście pytań, z którymi przychodzą ludzie szukający: cierpienie, śmierć, zaufanie do Biblii, Kościół."),
    ("K", "Kryzysy i przełomy życia", "Osiem spotkań dla ludzi, którym coś się zawaliło: żałoba, choroba, rozpad małżeństwa, zaczynanie od nowa."),
    ("S", "Szabat jako dar", "Pięć spotkań od zmęczenia do odpoczynku, który Bóg wpisał w tydzień."),
    ("PJ", "Przypowieści Jezusa", "Każda przypowieść to zamknięte spotkanie. Można zacząć w dowolnym miejscu."),
    ("D", "Księga Daniela", "Dwanaście spotkań rozdział po rozdziale: wierność na obczyźnie i Bóg, który prowadzi historię."),
]

WYMAGANE = ["Zanim zaczniecie", "Otwarcie", "Zastosowanie", "Jedno zdanie", "Do zrobienia",
            "Modlitwa", "Czerwone flagi"]
TYP_SEKCJI = {
    "Zanim zaczniecie": "prowadzacy", "Otwarcie": "otwarcie", "Zastosowanie": "zastosowanie",
    "Jedno zdanie": "zdanie", "Do zrobienia": "do-zrobienia", "Modlitwa": "modlitwa",
    "Czerwone flagi": "czerwone-flagi",
}

RE_WERSJA = re.compile(r"^(.*), v(\d+)\.md$")
RE_PYTANIE = re.compile(r"^<!--q(\d+)-->\s*(.*)$", re.S)
RE_CYTAT = re.compile(r"\*\*((?:\d\s?)?[A-ZŁŻ][A-Za-złńżŁ]*\s+\d+(?:,[\d\-\.,ab ]+)?|(?:Flm|Jud|2\s?J|3\s?J|Abd)\s+[\d\-\.ab]+)"
                      r"\s*\((BW|Ekum\.|EIB|BT|UBG)\)\*\*")
RE_P = re.compile(r"^\[P([23])\]\s*(.*)$")
DIDASKALIA = re.compile(r"^\*(Tylko dla prowadzącego|Na głos)[^*]*\*$")


def czysc(t: str) -> str:
    """Pauza nie wchodzi do aplikacji, a dywiz w roli myslnika staje sie polpauza."""
    t = t.replace(chr(0x2014), chr(0x2013))
    t = re.sub(r"(?<=\S) - (?=\S)", " – ", t)
    return re.sub(r"[ \t]+", " ", t).strip()


def bloki_md(tekst: str) -> list[str]:
    return [b.strip("\n") for b in re.split(r"\n\s*\n", tekst.strip("\n")) if b.strip()]


def cytat(blok: str) -> dict:
    """Blok cytatu (linie z '>') -> notka, lista fragmentow Pisma albo wyroznienie."""
    linie = [re.sub(r"^>\s?", "", l) for l in blok.split("\n")]
    calosc = "\n".join(linie).strip()
    if calosc.startswith("**Notka"):
        return {"typ": "notka", "tekst": czysc(re.sub(r"^\*\*Notka\.?\*\*\s*", "", calosc).replace("\n", " "))}
    naglowki = list(RE_CYTAT.finditer(calosc))
    if not naglowki:
        return {"typ": "wyroznienie", "tekst": czysc(calosc.replace("\n", " "))}
    fragmenty = []
    for i, m in enumerate(naglowki):
        koniec = naglowki[i + 1].start() if i + 1 < len(naglowki) else len(calosc)
        tresc = calosc[m.end():koniec].strip()
        akapity = [czysc(a.replace("\n", " ")) for a in re.split(r"\n\s*\n", tresc) if a.strip()]
        fragmenty.append({"odnosnik": re.sub(r"\s+", " ", m.group(1)).strip(), "przeklad": m.group(2).rstrip("."),
                          "akapity": akapity})
    return {"typ": "pismo", "fragmenty": fragmenty}


def elementy(tekst: str, poziom: int) -> list[dict]:
    out = []
    kolejka = []
    for b in bloki_md(tekst):
        # "**Gdzie sa miny:**" i lista pod spodem bez pustej linii to w markdownie jeden blok
        linie = b.splitlines()
        i = next((k for k, l in enumerate(linie) if re.match(r"^[-*] ", l)), None)
        if i and not b.startswith(">"):
            kolejka += [chr(10).join(linie[:i]), chr(10).join(linie[i:])]
        else:
            kolejka.append(b)
    for b in kolejka:
        if b == "---" or DIDASKALIA.match(b):
            continue
        if b.startswith(">"):
            # cytat moze byc rozbity pustymi liniami '>' na kilka akapitow - to wciaz jeden blok
            e = cytat(b)
        elif RE_PYTANIE.match(b):
            m = RE_PYTANIE.match(b)
            tresc = m.group(2).replace("\n", " ")
            kluczowe = bool(re.match(r"\*\*Kluczowe\.\*\*", tresc))
            opcjonalne = bool(re.match(r"\*Jeśli macie czas\.\*", tresc))
            tresc = re.sub(r"^(\*\*Kluczowe\.\*\*|\*Jeśli macie czas\.\*)\s*", "", tresc)
            e = {"typ": "pytanie", "id": "q" + m.group(1), "kluczowe": kluczowe,
                 "opcjonalne": opcjonalne, "tekst": czysc(tresc)}
        elif re.match(r"^\*[^*].*[^*]\*$", b, re.S) and "\n\n" not in b:
            tresc = czysc(b[1:-1].replace("\n", " "))
            typ = "uwaga-prowadzacego" if tresc.startswith("Prowadzący") else "lacznik"
            e = {"typ": typ, "tekst": re.sub(r"^Prowadzący:\s*", "", tresc)}
        elif re.match(r"^[-*] ", b):
            e = {"typ": "lista", "pozycje": [czysc(re.sub(r"^[-*] ", "", l)) for l in b.split("\n") if l.strip()]}
        else:
            e = {"typ": "akapit", "tekst": czysc(b.replace("\n", " "))}
        e["poziom"] = poziom
        out.append(e)
    return out


def scal_cytaty(tekst: str) -> str:
    """'>' z pusta trescia miedzy akapitami cytatu nie moze rozbic bloku przy dzieleniu po pustej linii."""
    return re.sub(r"(?m)^>\s*$", "> ", tekst)


def metryka(tekst: str) -> dict:
    pola = {}
    for m in re.finditer(r"(?m)^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$", tekst):
        k, v = m.group(1).strip(), m.group(2).strip()
        if k and set(k) != {"-"} and k != "":
            pola[k] = v
    def trojka(s):
        liczby = re.findall(r"poziom\s*(\d)\s*:\s*(\d+)", s or "")
        return {"p" + p: int(n) for p, n in liczby}
    return {
        "id": pola.get("id", ""),
        "seria": pola.get("seria", ""),
        "tryb": pola.get("tryb", "tematyczny").replace("księgi", "ksiegi"),
        "poprzedni": pola.get("poprzedni") or None,
        "nastepny": pola.get("nastepny") or pola.get("następny") or None,
        "teksty": {"p1": pola.get("teksty, poziom 1", ""), "p2": pola.get("teksty, poziom 2", ""),
                   "p3": pola.get("teksty, poziom 3", "")},
        "przekladBazowy": pola.get("przekład bazowy", "BW"),
        "dlugosc": trojka(pola.get("orientacyjna długość")),
        "liczbaPytan": trojka(pola.get("liczba pytań")),
        "tagi": [t.strip() for t in pola.get("tagi", "").split(",") if t.strip()],
        "wersja": int(re.sub(r"\D", "", pola.get("wersja", "1")) or 1),
    }


def flagi(els: list[dict]) -> list[dict]:
    out = []
    for e in els:
        if e["typ"] == "akapit" and re.match(r"^\*\*.+\*\*", e["tekst"]):
            m = re.match(r"^\*\*(.+?)\*\*\s*(.*)$", e["tekst"], re.S)
            out.append({"sytuacja": m.group(1).strip(), "odpowiedz": m.group(2).strip()})
        elif out and e["typ"] in ("akapit", "lista"):
            dod = e.get("tekst") or " ".join(e.get("pozycje", []))
            out[-1]["odpowiedz"] = (out[-1]["odpowiedz"] + " " + dod).strip()
    return out


def czytaj(sciezka: Path) -> tuple[dict | None, list[str]]:
    tekst = scal_cytaty(sciezka.read_text(encoding="utf-8").replace("\r\n", "\n"))
    problemy = []
    m = re.match(r"#\s+(.+)", tekst)
    tytul = czysc(m.group(1)) if m else sciezka.stem
    czesci = re.split(r"(?m)^## ", tekst)
    meta = metryka(czesci[0])
    if not meta["id"]:
        problemy.append("brak id w metryce")

    bloki, nr_bloku, ids = [], 0, []
    nazwy = []
    for cz in czesci[1:]:
        naglowek, _, tresc = cz.partition("\n")
        naglowek = naglowek.strip()
        nazwy.append(naglowek)
        pod = re.split(r"(?m)^### ", tresc)
        mb = re.match(r"Blok (\d+)\.\s*(.*)", naglowek)
        if mb:
            nr_bloku = int(mb.group(1))
            glowny = {"typ": "blok", "poziom": 1, "numer": nr_bloku, "tytul": czysc(mb.group(2))}
        else:
            typ = next((t for n, t in TYP_SEKCJI.items() if naglowek.startswith(n)), None)
            if typ is None:
                problemy.append("nieznana sekcja: " + naglowek)
                continue
            glowny = {"typ": typ, "poziom": 1, "tytul": naglowek}
            if typ in ("prowadzacy", "czerwone-flagi"):
                glowny["zwijany"] = True
        glowny["elementy"] = elementy(pod[0], 1)
        if glowny["typ"] == "czerwone-flagi":
            glowny["flagi"] = flagi(glowny["elementy"])
        bloki.append(glowny)
        for p in pod[1:]:
            nagl, _, tr = p.partition("\n")
            mp = RE_P.match(nagl.strip())
            if not mp:
                problemy.append("podsekcja bez [P2]/[P3]: " + nagl.strip())
                continue
            poziom, t = int(mp.group(1)), czysc(mp.group(2))
            tl = t.lower()
            typ = ("kontekst" if tl.startswith("kontekst") else "slowo" if tl.startswith("słowo")
                   else "napiecie" if tl.startswith("napięcie")
                   else "pytanie-trudne" if tl.startswith("pytanie bez") else "blok")
            b = {"typ": typ, "poziom": poziom, "tytul": t, "elementy": elementy(tr, poziom)}
            if mb or glowny["typ"] == "zastosowanie":
                b["doBloku"] = nr_bloku if mb else "zastosowanie"
            bloki.append(b)

    for b in bloki:
        ids += [int(e["id"][1:]) for e in b["elementy"] if e["typ"] == "pytanie"]
    for w in WYMAGANE:
        if not any(n.startswith(w) for n in nazwy):
            problemy.append("brak sekcji: " + w)
    ile_blokow = sum(1 for b in bloki if b["typ"] == "blok" and b["poziom"] == 1)
    if ile_blokow < 4:
        problemy.append("blokow poziomu 1 jest %d" % ile_blokow)
    if ids != list(range(1, len(ids) + 1)):
        problemy.append("identyfikatory pytan nie biegna ciagiem")
    p1 = sum(1 for b in bloki for e in b["elementy"] if e["typ"] == "pytanie" and e["poziom"] == 1)
    if p1 < 12:
        problemy.append("pytan poziomu 1 jest %d" % p1)
    if problemy:
        return None, problemy

    zdanie = next((e["tekst"] for b in bloki if b["typ"] == "zdanie" for e in b["elementy"]
                   if e["typ"] == "wyroznienie"), "")
    return {"tytul": tytul, **meta, "zdanie": zdanie, "bloki": bloki}, []


def klucz_id(i: str):
    m = re.match(r"([A-Z]+)-(\d+)", i)
    return (m.group(1), int(m.group(2))) if m else (i, 0)


def main() -> int:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    args = sys.argv[1:]
    check = "--check" in args
    src = Path(args[args.index("--src") + 1]) if "--src" in args else next(
        (k for k in KANDYDACI_SRC if k.is_dir()), None)
    if not src or not src.is_dir():
        print("Nie ma katalogu zrodlowego. Podaj --src.")
        return 1

    najnowsze: dict[str, tuple[int, Path]] = {}
    for p in src.glob("*.md"):
        m = RE_WERSJA.match(p.name)
        if not m or p.name.startswith("_") or m.group(1).startswith("Model materialu"):
            continue
        if m.group(1) not in najnowsze or int(m.group(2)) > najnowsze[m.group(1)][0]:
            najnowsze[m.group(1)] = (int(m.group(2)), p)

    # lista autora: materialy jeszcze niegotowe do wydania
    wstrzymane = set()
    lista = src / "_nie-do-apki.txt"
    if lista.exists():
        wstrzymane = {l.strip() for l in lista.read_text(encoding="utf-8").splitlines()
                      if l.strip() and not l.startswith("#")}

    materialy, odrzucone = {}, []
    for nazwa, (_, p) in sorted(najnowsze.items()):
        dane, problemy = czytaj(p)
        if dane is not None and dane["id"] in wstrzymane:
            odrzucone.append((p.name, ["wstrzymany w _nie-do-apki.txt"]))
        elif dane is None:
            odrzucone.append((p.name, problemy))
        elif dane["id"] in materialy:
            odrzucone.append((p.name, ["id %s juz zajete przez inny plik" % dane["id"]]))
        else:
            materialy[dane["id"]] = dane

    serie = []
    for prefiks, tytul, opis in SERIE:
        poz = sorted((d for i, d in materialy.items() if klucz_id(i)[0] == prefiks), key=lambda d: klucz_id(d["id"]))
        if not poz:
            continue
        serie.append({"prefiks": prefiks, "tytul": tytul, "opis": opis, "tryb": poz[0]["tryb"],
                      "items": [{"id": d["id"], "tytul": d["tytul"], "teksty": d["teksty"]["p1"],
                                 "zdanie": d["zdanie"], "dlugosc": d["dlugosc"],
                                 "liczbaPytan": d["liczbaPytan"], "tagi": d["tagi"]} for d in poz]})
    bez_serii = [i for i in materialy if klucz_id(i)[0] not in {s[0] for s in SERIE}]

    print("Zrodlo: %s" % src)
    for s in serie:
        print("  %-32s %2d  (%s)" % (s["tytul"], len(s["items"]), ", ".join(x["id"] for x in s["items"])))
    print("Razem: %d materialow" % sum(len(s["items"]) for s in serie))
    if bez_serii:
        print("UWAGA - id spoza znanych serii, pominiete: " + ", ".join(bez_serii))
    for nazwa, problemy in odrzucone:
        print("POMINIETY %s: %s" % (nazwa, "; ".join(problemy)))

    if check:
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    for stary in OUT.glob("*.json"):
        stary.unlink()
    index = {"lang": "pl", "title": "Grupy Nadziei", "series": "#JestNadzieja", "przekladBazowy": "BW",
             "note": "Cytaty: Biblia Warszawska, o ile nie oznaczono inaczej.", "serie": serie}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in serie:
        for x in s["items"]:
            (OUT / (x["id"] + ".json")).write_text(
                json.dumps(materialy[x["id"]], ensure_ascii=False, indent=1), encoding="utf-8")
    print("Zapisano do %s" % OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
