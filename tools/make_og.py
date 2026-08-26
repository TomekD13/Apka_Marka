# -*- coding: utf-8 -*-
"""Grafika podgladu linku (Open Graph), 1200x630.

Poprzednia (`public/og.jpg`) byla z wersji wielojezycznej – pokazywala „Study the
Bible" w osmiu jezykach, czego w wydaniu polskim juz nie ma. Ta sklada sie z tego,
co widzi czytelnik na stronie glownej: znaku #JestNadzieja i tla z bannera.

Tlo nie jest przerysowane z pamieci – kolor kazdej kolumny bierzemy z bannera
`Grafiki/JestNadzieja_clean_2560.png` (mediana z pasow nad i pod napisem), wiec
przejscie granat -> fiolet zostaje dokladnie takie samo. Doklejamy gwiazdy i falę,
a napis wycinamy z bannera maską jasnosci, zeby nie wszedl razem z prostokatem tla.

Uruchomienie:  python tools/make_og.py
Wynik:         public/og-2026-08.jpg  (+ kopia jako public/og.jpg)
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BANNER = ROOT / 'Grafiki' / 'JestNadzieja_clean_2560.png'
OUT_NEW = ROOT / 'public' / 'og-2026-08.jpg'
OUT_OLD = ROOT / 'public' / 'og.jpg'

W, H = 1200, 630
FONT_SB = 'C:/Windows/Fonts/seguisb.ttf'   # Segoe UI Semibold
FONT_RG = 'C:/Windows/Fonts/segoeui.ttf'

LINE_1 = 'Cały tekst Pisma, studia biblijne, śpiewniki i czytanki'
LINE_2 = 'Czytaj online albo offline'


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(FONT_RG, size)


def column_colors(banner):
    """Kolor tla dla kazdej z 1200 kolumn – mediana pasow bez napisu."""
    a = np.asarray(banner).astype(np.float32)
    strips = np.concatenate([a[0:120], a[380:512]], axis=0)   # nad napisem i pod nim
    med = np.median(strips, axis=0)                            # (2560, 3)
    # rozmycie w poziomie: bez tego pojedyncze gwiazdy i linie fali zostawiaja
    # w medianie pionowe smugi na calej wysokosci obrazka
    k = 121
    pad = np.pad(med, ((k // 2, k // 2), (0, 0)), mode='edge')
    ker = np.hanning(k)[:, None]
    ker /= ker.sum()
    smooth = np.stack([np.convolve(pad[:, c], ker[:, 0], mode='valid') for c in range(3)], axis=1)
    src = Image.fromarray(np.clip(smooth, 0, 255).astype(np.uint8)[None, :, :], 'RGB')
    return np.asarray(src.resize((W, 1), Image.LANCZOS)).astype(np.float32)[0]


def background(cols):
    """Kolumny rozciagniete w pion + jasniejszy pas w srodku (jak na bannerze)."""
    y = np.arange(H, dtype=np.float32)
    glow = 0.80 + 0.55 * np.exp(-(((y - 0.42 * H) / (0.34 * H)) ** 2))
    img = cols[None, :, :] * glow[:, None, None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def add_glow(img):
    """Fioletowa poswiata w srodku – na bannerze jest w tym samym miejscu."""
    layer = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([W * 0.18, H * 0.05, W * 0.95, H * 0.95], fill=(64, 40, 120))
    layer = layer.filter(ImageFilter.GaussianBlur(140))
    return Image.blend(img, Image.blend(img, layer, 0.0), 0.0) if False else \
        Image.fromarray(
            np.clip(np.asarray(img).astype(np.int16) + np.asarray(layer).astype(np.int16) // 2, 0, 255).astype(np.uint8),
            'RGB',
        )


def add_stars(img, seed=20260826):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img, 'RGBA')
    for _ in range(520):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        r = rnd.choice([0.6, 0.6, 0.8, 1.0, 1.0, 1.4])
        a = rnd.randint(40, 190)
        tint = rnd.choice([(255, 255, 255), (203, 225, 255), (226, 205, 255)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=tint + (a,))
    return img


def add_wave(img):
    """Fala jak na bannerze: kilka cienkich, ledwo widocznych linii."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for k in range(7):
        pts = []
        for x in range(0, W + 1, 8):
            u = x / W
            y = 0.78 * H - 128 * u + 46 * math.sin(u * 2.5 + 0.35) + k * 9
            pts.append((x, y))
        d.line(pts, fill=(150, 170, 255, 26 - k * 2), width=1)
    pts = [(x, 0.845 * H - 150 * (x / W) + 52 * math.sin((x / W) * 2.5 + 0.3)) for x in range(0, W + 1, 8)]
    d.line(pts, fill=(232, 120, 220, 120), width=2)
    layer = layer.filter(ImageFilter.GaussianBlur(0.7))
    img.paste(Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB'), (0, 0))
    return img


def wordmark(banner):
    """Sam napis #JestNadzieja, bez prostokata tla – maska z jasnosci."""
    a = np.asarray(banner).astype(np.int16)
    lum = a.max(axis=2)
    band = lum[130:380]
    # prog liczony na kolumne/wiersz, nie na piksel: inaczej w kadr wchodzi
    # rozowa smuga z tla, ktora biegnie przez cala szerokosc bannera
    cols = (band > 150).sum(axis=0)
    xs = np.nonzero(cols > 10)[0]
    rows = (band > 150).sum(axis=1)
    ys = np.nonzero(rows > 10)[0]
    x0, x1 = int(xs.min()) - 8, int(xs.max()) + 9
    y0, y1 = 130 + int(ys.min()) - 8, 130 + int(ys.max()) + 9

    crop = banner.crop((x0, y0, x1, y1))
    c = np.asarray(crop).astype(np.float32)
    l = c.max(axis=2)
    alpha = np.clip((l - 70.0) / 80.0, 0, 1)          # tlo (<70) znika, napis zostaje
    out = Image.fromarray(c.astype(np.uint8), 'RGB').convert('RGBA')
    out.putalpha(Image.fromarray((alpha * 255).astype(np.uint8), 'L'))
    return out


def main():
    banner = Image.open(BANNER).convert('RGB')

    img = background(column_colors(banner))
    img = add_glow(img)
    img = add_stars(img)
    img = add_wave(img)

    mark = wordmark(banner)
    target_w = 860
    mark = mark.resize((target_w, round(mark.height * target_w / mark.width)), Image.LANCZOS)
    mx, my = (W - mark.width) // 2, 158
    img.paste(mark, (mx, my), mark)

    d = ImageDraw.Draw(img)
    f1, f2 = font(FONT_SB, 36), font(FONT_RG, 27)
    y = my + mark.height + 58
    for text, f, fill in ((LINE_1, f1, (226, 232, 240)), (LINE_2, f2, (148, 163, 184))):
        tw = d.textbbox((0, 0), text, font=f)[2]
        d.text(((W - tw) / 2, y), text, font=f, fill=fill)
        y += f.size + 22

    img.save(OUT_NEW, 'JPEG', quality=88, optimize=True, progressive=True)
    img.save(OUT_OLD, 'JPEG', quality=88, optimize=True, progressive=True)
    print(f'make_og: {OUT_NEW.name} ({OUT_NEW.stat().st_size // 1024} KB) oraz kopia jako og.jpg')


if __name__ == '__main__':
    main()
