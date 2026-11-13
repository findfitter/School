"""Вырезать предмет с ровного однотонного фона (картинки Gemini на сером #C8C8C8) → WebP с прозрачностью.

python cutout.py <вход> <выход.webp> <ширина> [--tol 26] [--soft 22]

Фон — то, что похоже по цвету на углы картинки и связано с краем (заливка от краёв), поэтому светлые места
внутри предмета не пропадают. Замкнутые «дырки» (кольцо, бублик, колёса велосипеда, просвет между вишнями) тоже
вырезаются, но только если в них ровно цвет фона без оттенков; если у наклеек своя белая кайма (листы альбомов),
дырка должна быть обведена этой каймой — иначе светло-серый зайчик тоже «провалился» бы. На границе прозрачность плавная, серый «ореол» вычитается из цвета.
Запускать встроенным Python ComfyUI (Pillow + numpy).
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image


def _flood(seeds, mask, seen):
    """Заливка по mask от seeds, отмечает seen."""
    h, w = mask.shape
    q = deque()
    for y, x in seeds:
        if mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))


def _white_share(im, mask):
    """Доля почти белых пикселей в полоске шириной 3 px вокруг mask."""
    from PIL import Image, ImageFilter
    grown = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
    ring = grown & ~mask
    return float((im[ring].min(axis=1) > 225).mean()) if ring.any() else 0.0


def find_holes(im, bg, dist, seen, tight=12, flat=5.0, min_area=None, white=None):
    """Замкнутые дырки цвета фона: связные пятна «точно фона» (dist < tight), не связанные с краем, достаточно
    большие и ровные (разброс цвета < flat, как у настоящего фона). white — у наклеек белая кайма: тогда дырка
    должна быть обведена белым (≥ 60 % полоски вокруг). None — определить по внешнему краю наклеек.
    Возвращает список точек-семян."""
    h, w = dist.shape
    if white is None:
        white = _white_share(im, seen) > 0.5
    if min_area is None:
        min_area = max(40, h * w // 12000)
    core = (dist < tight) & ~seen
    mark = np.zeros((h, w), bool)
    seeds = []
    ys, xs = np.nonzero(core)
    for y0, x0 in zip(ys, xs):
        if mark[y0, x0]:
            continue
        mark[y0, x0] = True
        q = deque([(y0, x0)])
        py, px = [], []
        while q:
            y, x = q.popleft()
            py.append(y)
            px.append(x)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and core[ny, nx] and not mark[ny, nx]:
                    mark[ny, nx] = True
                    q.append((ny, nx))
        if len(py) < min_area:
            continue
        py, px = np.array(py), np.array(px)
        if im[py, px].std(axis=0).max() >= flat:
            continue
        if white:
            y0b, y1b, x0b, x1b = max(0, py.min() - 4), py.max() + 5, max(0, px.min() - 4), px.max() + 5
            m = np.zeros((y1b - y0b, x1b - x0b), bool)
            m[py - y0b, px - x0b] = True
            if _white_share(im[y0b:y1b, x0b:x1b], m) < 0.6:
                continue
        seeds.append((y0, x0))
    return seeds


def cut(image, tol=26, soft=22, holes=True):
    """Убрать однотонный фон, связанный с краем картинки (и замкнутые дырки цвета фона). Возвращает RGBA того же размера."""
    im = np.asarray(image.convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    k = max(4, min(h, w) // 40)
    corners = np.concatenate([im[:k, :k].reshape(-1, 3), im[:k, -k:].reshape(-1, 3),
                              im[-k:, :k].reshape(-1, 3), im[-k:, -k:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((im - bg) ** 2).sum(axis=2))

    # заливка от краёв по «почти фону» (с запасом soft): связанная с краем область — кандидат в фон
    near = dist < tol + soft
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    if holes:
        _flood(find_holes(im, bg, dist, seen), near, seen)

    alpha = np.ones((h, w), np.float32)
    ramp = np.clip((dist - tol) / soft, 0, 1)
    alpha[seen] = ramp[seen]
    # убрать серый фон из полупрозрачных краёв: c = (c - (1 - a) * bg) / a
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(alpha[..., None] < 1, (im - (1 - alpha[..., None]) * bg) / safe, im)
    rgb = np.clip(rgb, 0, 255)

    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA"), bg


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("width", type=int)
    p.add_argument("--tol", type=float, default=26, help="до этого расстояния цвета — точно фон")
    p.add_argument("--soft", type=float, default=22, help="ширина плавного края по цвету")
    p.add_argument("--quality", type=int, default=86)
    a = p.parse_args()

    out, bg = cut(Image.open(a.src), a.tol, a.soft)
    box = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(box)
    hh = round(out.height * a.width / out.width)
    out = out.resize((a.width, hh), Image.LANCZOS)
    out.save(a.dst, quality=a.quality, method=6)
    print(a.dst, out.size, "фон", bg.round().tolist())


if __name__ == "__main__":
    main()
