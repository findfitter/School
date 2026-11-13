"""Маска «рваного акварельного края» для картинок-фонов (вместо SVG-фильтра wc2: маска рисуется один раз, без
пересчёта фильтра на слабом Хромбуке).

python rough_edge.py [seed]  → печатает строку CSS `mask-image: url("data:image/svg+xml,…")` для вставки в стили.

Прямоугольник 1000×700 (растягивается на элемент, preserveAspectRatio="none"), край смещён внутрь на плавные волны
(как у wc2: крупные неровности) и мелкую дрожь. Запускать встроенным Python ComfyUI или любым Python 3.
"""
import math
import random
import sys
import urllib.parse

W, H, M = 1000, 700, 14  # размер и наибольший отступ края внутрь


def edge(n, rnd):
    """Отступы внутрь вдоль одной стороны: две плавные волны + мелкая дрожь, 0…M."""
    p1, p2 = rnd.uniform(0, 6.3), rnd.uniform(0, 6.3)
    f1, f2 = rnd.uniform(2.5, 4.5), rnd.uniform(7, 11)
    out = []
    for i in range(n + 1):
        t = i / n
        v = 0.5 + 0.28 * math.sin(f1 * 6.283 * t + p1) + 0.14 * math.sin(f2 * 6.283 * t + p2) + rnd.uniform(-0.1, 0.1)
        out.append(max(0.0, min(1.0, v)) * M)
    return out


def main():
    rnd = random.Random(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
    step = 10
    pts = []
    top, right, bottom, left = (edge(W // step, rnd), edge(H // step, rnd), edge(W // step, rnd), edge(H // step, rnd))
    pts += [(i * step, top[i]) for i in range(W // step + 1)]
    pts += [(W - right[i], i * step) for i in range(H // step + 1)]
    pts += [(W - i * step, H - bottom[i]) for i in range(W // step + 1)]
    pts += [(left[i], H - i * step) for i in range(H // step + 1)]
    d = "M" + " ".join(f"{x:.0f} {y:.0f}" for x, y in pts) + "Z"
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none">'
           f'<path d="{d}"/></svg>')
    print(f'mask-image: url("data:image/svg+xml,{urllib.parse.quote(svg, safe=" /:=,")}");')


if __name__ == "__main__":
    main()
