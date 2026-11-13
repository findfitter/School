"""Маска «рваного акварельного края» для картинок-фонов (вместо SVG-фильтра wc2: маска рисуется один раз, без
пересчёта фильтра на слабом Хромбуке).

python rough_edge.py [seed]  → печатает строку CSS `mask-image: url("data:image/svg+xml,…")` для вставки в стили.

Прямоугольник 1000×700 (растягивается на элемент, preserveAspectRatio="none"), край смещён внутрь на плавные волны
(как у wc2: крупные неровности) и мелкую дрожь, в углах стороны сходятся без зубцов, край слегка размыт. Запускать встроенным Python ComfyUI или любым Python 3.
"""
import math
import random
import sys
import urllib.parse

W, H = 1000, 700
LO, HI = 8, 22   # отступ края внутрь: от LO до HI (запас LO — под размытие, иначе его обрежет рамка картинки)
BLUR = 3.5       # мягкость края (stdDeviation размытия, в единицах рисунка)
CORNER = 15      # отступ в углах — все четыре стороны сходятся в одной точке, без зубцов


def edge(length, step, rnd):
    """Отступы внутрь вдоль одной стороны: две плавные волны + мелкая дрожь; к концам плавно сходятся к CORNER."""
    p1, p2 = rnd.uniform(0, 6.3), rnd.uniform(0, 6.3)
    f1, f2 = rnd.uniform(2.5, 4.5), rnd.uniform(7, 11)
    n = length // step
    out = []
    for i in range(n + 1):
        t = i / n
        v = 0.5 + 0.28 * math.sin(f1 * 6.283 * t + p1) + 0.14 * math.sin(f2 * 6.283 * t + p2) + rnd.uniform(-0.1, 0.1)
        off = LO + max(0.0, min(1.0, v)) * (HI - LO)
        k = min(1.0, min(t, 1 - t) / 0.06)  # последние 6 % стороны — к углу
        k = k * k * (3 - 2 * k)
        out.append(CORNER + (off - CORNER) * k)
    return out


def main():
    rnd = random.Random(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
    step = 10
    pts = []
    top, right, bottom, left = (edge(W, step, rnd), edge(H, step, rnd), edge(W, step, rnd), edge(H, step, rnd))
    # точки идут по сторонам прямоугольника, отступ — по нормали внутрь; в углах (CORNER, CORNER) у обеих сторон
    for i, o in enumerate(top):
        pts.append((min(max(i * step, CORNER), W - CORNER), o))
    for i, o in enumerate(right):
        pts.append((W - o, min(max(i * step, CORNER), H - CORNER)))
    for i, o in enumerate(bottom):
        pts.append((min(max(W - i * step, CORNER), W - CORNER), H - o))
    for i, o in enumerate(left):
        pts.append((o, min(max(H - i * step, CORNER), H - CORNER)))
    d = "M" + " ".join(f"{x:.0f} {y:.0f}" for x, y in pts) + "Z"
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none">'
           f'<filter id="b" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="{BLUR}"/></filter>'
           f'<path filter="url(%23b)" d="{d}"/></svg>')
    print(f'mask-image: url("data:image/svg+xml,{urllib.parse.quote(svg, safe=" /:=,%")}");')


if __name__ == "__main__":
    main()
