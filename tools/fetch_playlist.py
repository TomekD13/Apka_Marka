#!/usr/bin/env python3
"""Pobiera WSZYSTKIE identyfikatory filmow z publicznej playlisty YouTube
i zapisuje je do public/content/{lang}/index.json (featured.youtube.videoIds).

Nie wymaga klucza Data API ani zewnetrznych bibliotek - czyta strone playlisty
(ytInitialData) i dociaga kolejne strony przez wewnetrzne API youtubei
(continuation token), wiec obsluguje playlisty dluzsze niz 100 pozycji.

Uzycie:
    python tools/fetch_playlist.py <PLAYLIST_ID> [lang ...]
    python tools/fetch_playlist.py PLv-67p_8jNMwIIjwcgT8yTWT0_AQG2JRp pl en

Bez podanych jezykow tylko wypisuje znalezione ID (nie zapisuje plikow).
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # .../Aplikacja
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def _post(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _extract_object(text: str, marker: str) -> dict:
    """Wycina pierwszy obiekt JSON wystepujacy po 'marker' (np. 'ytInitialData ='),
    balansujac nawiasy klamrowe z poszanowaniem literalow napisowych."""
    i = text.find(marker)
    if i < 0:
        raise ValueError(f"nie znaleziono markera: {marker}")
    i = text.find("{", i)
    depth, in_str, esc = 0, False, False
    for j in range(i, len(text)):
        c = text[j]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(text[i:j + 1])
    raise ValueError("nie udalo sie zbalansowac obiektu JSON")


def _walk(node, key):
    """Generator: wszystkie wartosci pod podanym kluczem, gdziekolwiek w drzewie."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k == key:
                yield v
            yield from _walk(v, key)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v, key)


def _ids_from(node, seen, out):
    for r in _walk(node, "playlistVideoRenderer"):
        vid = r.get("videoId")
        if vid and vid not in seen:
            seen.add(vid)
            out.append(vid)


def _continuation(node):
    for r in _walk(node, "continuationItemRenderer"):
        try:
            return r["continuationEndpoint"]["continuationCommand"]["token"]
        except (KeyError, TypeError):
            continue
    return None


def _ids_by_regex(text: str, seen: set, out: list) -> None:
    """Fallback: unikalne videoId w kolejnosci wystepowania na stronie.
    Na stronie playlisty sa to pozycje playlisty (nowsze layouty YouTube nie
    uzywaja juz 'playlistVideoRenderer')."""
    for vid in re.findall(r'"videoId":"([\w-]{11})"', text):
        if vid not in seen:
            seen.add(vid)
            out.append(vid)


def fetch_playlist(playlist_id: str) -> list[str]:
    html = _get(f"https://www.youtube.com/playlist?list={playlist_id}&hl=en")
    data = _extract_object(html, "ytInitialData =")

    m = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html)
    api_key = m.group(1) if m else None
    m = re.search(r'"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"', html) \
        or re.search(r'"clientVersion":"([\d.]+)"', html)
    client_ver = m.group(1) if m else "2.20240101.00.00"

    seen, ids = set(), []
    _ids_from(data, seen, ids)
    if not ids:  # nowy layout bez playlistVideoRenderer
        _ids_by_regex(html, seen, ids)
    token = _continuation(data)

    while token and api_key:
        resp = _post(
            f"https://www.youtube.com/youtubei/v1/browse?key={api_key}",
            {"context": {"client": {"clientName": "WEB", "clientVersion": client_ver}},
             "continuation": token},
        )
        before = len(ids)
        _ids_from(resp, seen, ids)
        token = _continuation(resp)
        if len(ids) == before:  # brak postepu - koniec
            break

    return ids


def update_index(lang: str, playlist_id: str, ids: list[str]) -> None:
    path = ROOT / "public" / "content" / lang / "index.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    yt = data.setdefault("featured", {}).setdefault("youtube", {})
    yt["playlistId"] = playlist_id
    yt["videoIds"] = ids
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  zapisano {len(ids)} ID -> {path.relative_to(ROOT)}")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    playlist_id = sys.argv[1]
    langs = sys.argv[2:]
    ids = fetch_playlist(playlist_id)
    print(f"Znaleziono {len(ids)} filmow w playliscie {playlist_id}")
    for v in ids:
        print(" ", v)
    for lang in langs:
        update_index(lang, playlist_id, ids)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
