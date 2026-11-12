"""Вырезать предмет с ровного однотонного фона (картинки Gemini на сером #C8C8C8) → WebP с прозрачностью.

python cutout.py <вход> <выход.webp> <ширина> [--tol 26] [--soft 22]

Фон — то, что похоже по цвету на углы картинки и связано с краем (заливка от краёв), поэтому светлые места
внутри предмета не пропадают. На границе прозрачность плавная, серый «ореол» вычитается из цвета.
Запускать встроенным Python ComfyUI (Pillow + numpy).
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("width", type=int)
    p.add_argument("--tol", type=float, default=26, help="до этого расстояния цвета — точно фон")
    p.add_argument("--soft", type=float, default=22, help="ширина плавного края по цвету")
    p.add_argument("--quality", type=int, default=86)
    a = p.parse_args()

    im = np.asarray(Image.open(a.src).convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    k = max(4, min(h, w) // 40)
    corners = np.concatenate([im[:k, :k].reshape(-1, 3), im[:k, -k:].reshape(-1, 3),
                              im[-k:, :k].reshape(-1, 3), im[-k:, -k:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((im - bg) ** 2).sum(axis=2))

    # заливка от краёв по «почти фону» (с запасом soft): связанная с краем область — кандидат в фон
    near = dist < a.tol + a.soft
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

    alpha = np.ones((h, w), np.float32)
    ramp = np.clip((dist - a.tol) / a.soft, 0, 1)
    alpha[seen] = ramp[seen]
    # убрать серый фон из полупрозрачных краёв: c = (c - (1 - a) * bg) / a
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(alpha[..., None] < 1, (im - (1 - alpha[..., None]) * bg) / safe, im)
    rgb = np.clip(rgb, 0, 255)

    out = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA")
    box = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(box)
    hh = round(out.height * a.width / out.width)
    out = out.resize((a.width, hh), Image.LANCZOS)
    out.save(a.dst, quality=a.quality, method=6)
    print(a.dst, out.size, "фон", bg.round().tolist())


if __name__ == "__main__":
    main()
