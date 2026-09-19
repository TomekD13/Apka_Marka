# -*- coding: utf-8 -*-
"""Ikony aplikacji (PWA) ze znaku #JestNadzieja.

Nic tu nie jest rysowane z pamieci. Ksztalt hasztaga wycinamy z bannera
`Grafiki/JestNadzieja_clean_2560.png` (ta sama kursywa co w logotypie), kolory
bierzemy z calego napisu - dzieki temu w kwadracie ikony miesci sie caly gradient
marki (turkus -> niebieski -> fiolet -> roz), a nie sam turkus z pierwszego znaku.
Tlo i gwiazdy tez pochodza z bannera.

Uruchomienie:  python tools/make_icons.py
Wynik:         public/pwa-192.png, public/pwa-512.png,
               public/pwa-512-maskable.png, public/apple-touch-icon.png
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BANNER = ROOT / 'Grafiki' / 'JestNadzieja_clean_2560.png'
OUT = ROOT / 'public'

# progi jasnosci: tlo bannera siedzi ponizej 70, napis powyzej 150
LO, HI = 70.0, 150.0


def wczytaj():
    im = Image.open(BANNER).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    lum = a.max(axis=2)
    # miekka alfa napisu - zachowuje wygladzone krawedzie liter
    alfa = np.clip((lum - LO) / (HI - LO), 0.0, 1.0)
    return a, lum, alfa


def maska_hasztaga(lum):
    """Hasztag jako spojny obszar - sam bbox nie wystarczy, bo dolny hak litery J
    wchodzi pod znak i wjechalby do ikony razem z nim."""
    tward = lum > 120
    h, w = tward.shape
    # punkt startowy: najgestsza kolumna w obszarze, w ktorym stoi hasztag
    kol = tward[:, :700].sum(axis=0)
    x0 = int(np.argmax(kol[450:650]) + 450)
    ys = np.where(tward[:, x0])[0]
    start = (int(ys[len(ys) // 2]), x0)

    widziane = np.zeros_like(tward, dtype=bool)
    widziane[start] = True
    q = deque([start])
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and tward[ny, nx] and not widziane[ny, nx]:
                widziane[ny, nx] = True
                q.append((ny, nx))
    return widziane


def rampa_kolorow(a, alfa, x_od, x_do):
    """Sredni kolor napisu w kazdej kolumnie - czyli gradient logotypu."""
    kolory = []
    for x in range(x_od, x_do + 1):
        w = alfa[:, x]
        s = w.sum()
        if s < 5:
            kolory.append(kolory[-1] if kolory else np.array([60.0, 200.0, 210.0]))
            continue
        kolory.append((a[:, x, :] * w[:, None]).sum(axis=0) / s)
    r = np.array(kolory)
    # wygladzenie, zeby pojedyncze kolumny (krawedzie liter) nie robily pregi
    k = 61
    pad = np.pad(r, ((k // 2, k // 2), (0, 0)), mode='edge')
    ker = np.hanning(k)
    ker /= ker.sum()
    return np.stack([np.convolve(pad[:, c], ker, mode='valid') for c in range(3)], axis=1)


def tlo(a, lum, bok):
    """Nocne niebo z bannera: gradient granat -> fiolet plus prawdziwe gwiazdy."""
    czyste = lum < LO  # obszary bez napisu
    lewa = np.median(a[:, 100:400][czyste[:, 100:400]], axis=0)
    prawa = np.median(a[:, 2100:2500][czyste[:, 2100:2500]], axis=0)

    yy, xx = np.mgrid[0:bok, 0:bok].astype(np.float32)
    t = np.clip((xx + yy) / (2.0 * (bok - 1)), 0.0, 1.0)[:, :, None]
    plotno = lewa[None, None, :] * (1 - t) + prawa[None, None, :] * t

    # Gwiazdy: kwadratowy wycinek bannera z lewej strony, przed pierwszym znakiem.
    # Musi byc kwadrat - szeroki pas rozciagniety do kwadratu zamienia gwiazdy
    # w pionowe kreski.
    pas = Image.fromarray(a[0:490, 0:490].astype(np.uint8), 'RGB').resize((bok, bok), Image.LANCZOS)
    gw = np.asarray(pas).astype(np.float32)
    jasnosc = gw.max(axis=2)
    # sam blask gwiazd, bez ciemnego tla pasa
    blask = np.clip((jasnosc - 55.0) / 90.0, 0.0, 1.0)[:, :, None]
    plotno = plotno + blask * (np.array([255.0, 255.0, 255.0]) - plotno) * 0.85
    return Image.fromarray(np.clip(plotno, 0, 255).astype(np.uint8), 'RGB')


def znak(a, alfa, maska, rampa, wysokosc_px):
    """Hasztag wypelniony calym gradientem logotypu, jako obrazek RGBA."""
    ys, xs = np.where(maska)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    m = alfa[y0:y1 + 1, x0:x1 + 1] * maska[y0:y1 + 1, x0:x1 + 1]

    h, w = m.shape
    # gradient rozciagniety na szerokosc znaku - w ikonie ma byc cala paleta
    idx = np.linspace(0, len(rampa) - 1, w).astype(int)
    kolor = np.repeat(rampa[idx][None, :, :], h, axis=0)

    rgba = np.dstack([kolor, m * 255.0])
    im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    nowa_szer = max(1, int(round(wysokosc_px * w / h)))
    return im.resize((nowa_szer, wysokosc_px), Image.LANCZOS)


def zaokraglij(im, promien_proc):
    r = int(im.width * promien_proc)
    maska = Image.new('L', im.size, 0)
    ImageDraw.Draw(maska).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = im.convert('RGBA')
    out.putalpha(maska)
    return out


def zloz(a, lum, alfa, maska, rampa, bok, udzial, promien_proc):
    plotno = tlo(a, lum, bok).convert('RGBA')
    ikona = znak(a, alfa, maska, rampa, int(bok * udzial))
    # delikatna poswiata pod znakiem - tak samo jak napis odcina sie na bannerze
    poswiata = Image.new('RGBA', plotno.size, (0, 0, 0, 0))
    poswiata.paste(ikona, ((bok - ikona.width) // 2, (bok - ikona.height) // 2), ikona)
    plotno = Image.alpha_composite(plotno, poswiata.filter(ImageFilter.GaussianBlur(bok // 40)))
    plotno.paste(ikona, ((bok - ikona.width) // 2, (bok - ikona.height) // 2), ikona)
    return zaokraglij(plotno, promien_proc) if promien_proc else plotno


def main():
    a, lum, alfa = wczytaj()
    maska = maska_hasztaga(lum)
    ys, xs = np.where(maska)
    print(f'hasztag: x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}, pikseli {maska.sum()}')

    # rampa z calego napisu (bez marginesow bannera)
    kol = (alfa > 0.5).sum(axis=0)
    napis = np.where(kol > 20)[0]
    rampa = rampa_kolorow(a, alfa, int(napis.min()), int(napis.max()))
    print(f'gradient z kolumn {napis.min()}-{napis.max()}: '
          f'{tuple(rampa[0].astype(int))} -> {tuple(rampa[-1].astype(int))}')

    # zwykla ikona: znak duzy, rogi zaokraglone
    duza = zloz(a, lum, alfa, maska, rampa, 512, 0.60, 0.22)
    duza.save(OUT / 'pwa-512.png')
    duza.resize((192, 192), Image.LANCZOS).save(OUT / 'pwa-192.png')
    duza.resize((180, 180), Image.LANCZOS).convert('RGB').save(OUT / 'apple-touch-icon.png')

    # maskable: Android przycina do wlasnego ksztaltu, wiec znak mniejszy
    # (bezpieczne pole to srodkowe 80%) i tlo na caly kwadrat, bez zaokraglen
    zloz(a, lum, alfa, maska, rampa, 512, 0.42, 0).convert('RGB').save(OUT / 'pwa-512-maskable.png')

    for p in ('pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'apple-touch-icon.png'):
        print('zapisane', p, (OUT / p).stat().st_size, 'B')


if __name__ == '__main__':
    main()
