"""Готовая наклейка из картинки на ровном фоне: вырезать фон, белая кайма и мягкая тень одинаковые для всех,
квадрат 256 px, WebP с прозрачностью (как фильтр stk в игре, но заранее, без фильтра в браузере).

python sticker_finish.py <вход.png> <выход.webp> [--size 256] [--border 0.045] [--tol 26] [--soft 22]

Запускать встроенным Python ComfyUI (Pillow + numpy).
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import cut  # noqa: E402

WORK = 768  # рабочий размер квадрата, потом уменьшаем до --size


def keep_main(alpha):
    """Оставить только крупные куски (убрать случайные точки и «призраки» от фона)."""
    mask = (alpha > 0.5).astype(np.uint8)
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    sizes = [0]
    cur = 0
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not labels[y0, x0]:
                cur += 1
                stack = [(y0, x0)]
                labels[y0, x0] = cur
                n = 0
                while stack:
                    y, x = stack.pop()
                    n += 1
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                            labels[ny, nx] = cur
                            stack.append((ny, nx))
                sizes.append(n)
    if cur <= 1:
        return alpha
    big = max(sizes)
    keep = {i for i, n in enumerate(sizes) if i and n >= big * 0.02}
    near = np.isin(labels, list(keep))
    # полупрозрачный край вокруг оставленных кусков тоже оставить
    grow = np.asarray(Image.fromarray((near * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    return np.where(grow, alpha, 0)


def finish(item, size=256, border=0.045, rim_gold=False):
    """Вырезанный предмет (RGBA, лишнее уже прозрачное) → квадратная наклейка size×size: кайма, ободок, тень."""
    item = item.crop(item.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())

    b = round(WORK * border)
    rim = round(WORK * 0.014) if rim_gold else 0
    pad = b + rim + round(WORK * 0.03)  # место под кайму, ободок и тень
    room = WORK - 2 * pad
    k = room / max(item.width, item.height)
    item = item.resize((max(1, round(item.width * k)), max(1, round(item.height * k))), Image.LANCZOS)
    canvas = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))
    ox, oy = (WORK - item.width) // 2, (WORK - item.height) // 2
    canvas.paste(item, (ox, oy), item)

    # кайма: расширить силуэт размытием и порогом (скруглённые углы), потом сгладить край
    sil = canvas.getchannel("A").point(lambda v: 255 if v > 100 else 0)
    grown = sil.filter(ImageFilter.GaussianBlur(b * 0.55)).point(lambda v: 255 if v > 10 else 0)
    grown = grown.filter(ImageFilter.GaussianBlur(1.2))
    white = Image.new("RGBA", (WORK, WORK), (255, 255, 255, 255))
    white.putalpha(grown)
    outer = grown
    gold = None
    if rim:
        # золотой ободок: ещё чуть шире белой каймы, сверху светлее, снизу темнее
        outer = grown.point(lambda v: 255 if v > 20 else 0).filter(ImageFilter.MaxFilter(2 * rim + 1))
        outer = outer.filter(ImageFilter.GaussianBlur(1.2))
        ys = np.linspace(0, 1, WORK)[:, None]
        top, bottom = np.array([255, 226, 120]), np.array([214, 150, 30])
        rgb = (top * (1 - ys[..., None]) + bottom * ys[..., None]).repeat(WORK, axis=1)
        gold = Image.fromarray(rgb.astype(np.uint8), "RGB").convert("RGBA")
        gold.putalpha(outer)

    # тень: тёплая, мягкая, чуть вниз
    shadow_a = outer.filter(ImageFilter.GaussianBlur(WORK * 0.018)).point(lambda v: int(v * 0.32))
    shadow = Image.new("RGBA", (WORK, WORK), (90, 60, 30, 255))
    shadow.putalpha(shadow_a)
    out = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, round(WORK * 0.012)))
    if gold is not None:
        out.alpha_composite(gold)
    out.alpha_composite(white)
    out.alpha_composite(canvas)

    return out.resize((size, size), Image.LANCZOS)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--size", type=int, default=256)
    p.add_argument("--border", type=float, default=0.045, help="ширина каймы, доля стороны")
    p.add_argument("--tol", type=float, default=26)
    p.add_argument("--soft", type=float, default=22)
    p.add_argument("--rim", choices=["none", "gold"], default="none",
                   help="gold — золотой ободок снаружи белой каймы (супер-наклейки)")
    a = p.parse_args()

    item, _ = cut(Image.open(a.src), a.tol, a.soft)
    arr = np.asarray(item).astype(np.float32)
    arr[..., 3] = keep_main(arr[..., 3] / 255) * 255
    out = finish(Image.fromarray(arr.astype(np.uint8), "RGBA"), a.size, a.border, a.rim == "gold")
    os.makedirs(os.path.dirname(os.path.abspath(a.dst)), exist_ok=True)
    out.save(a.dst, quality=88, method=6)
    print(a.dst, out.size)


if __name__ == "__main__":
    main()
