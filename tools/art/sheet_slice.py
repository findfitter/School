"""Лист наклеек из Gemini (сетка 4×3 на ровном сером фоне) → 12 наклеек WebP + запись в images/index.json.

python sheet_slice.py <лист> <id альбома или мира> [--cols 4] [--rows 3] [--border 0.03] [--gold]

Порядок наклеек на листе — порядок в core/rewards.js (альбом ALBUM_DEFS или мир WORLDS), список берётся оттуда
через node, поэтому файл данных не правится. Наклейки ищутся как отдельные пятна на вырезанном фоне (кайма Gemini
делает каждую одним куском), потом сортируются по рядам и столбцам. Готовые файлы — images/stickers/<коды эмодзи>.webp
(у супер-наклеек с --gold — images/stickers/gold/<мир>-<коды>.webp), таблица — images/index.json:
{"sticker": {эмодзи: путь}, "super": {"мир:эмодзи": путь}}.
Лист сравнения «эмодзи ↔ наклейка» — рядом с листом, <лист>-check.jpg.
Запускать встроенным Python ComfyUI (Pillow + numpy) из корня ветки art или откуда угодно — пути от корня репозитория.
"""
import argparse
import json
import os
import subprocess
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import cut  # noqa: E402
from sticker_finish import finish  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def group_items(group, world=False):
    """Эмодзи альбома или мира по порядку — из core/rewards.js (id space есть и у альбома, и у мира: world=True — мир)."""
    js = (
        "import('./core/rewards.js').then(r => {"
        f"  const id = {json.dumps(group)};"
        f"  const a = {'null' if world else 'r.ALBUMS.find(x => x.id === id)'};"
        "  const w = r.WORLDS.find(x => x.id === id);"
        "  const items = a ? a.items.map(i => i.emoji) : w ? w.items.map(i => i.emoji) : null;"
        "  console.log(JSON.stringify(items));"
        "})"
    )
    out = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True)
    items = json.loads(out.stdout)
    if not items:
        sys.exit(f"нет альбома или мира «{group}» в core/rewards.js")
    return items


def file_key(emoji):
    return "-".join(f"{ord(c):x}" for c in emoji if c != "\ufe0f")


def components(mask):
    """Связные пятна маски: список (размер, массив пикселей y, x)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    found = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        q = deque([(y0, x0)])
        py, px = [], []
        while q:
            y, x = q.popleft()
            py.append(y)
            px.append(x)
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        found.append((len(py), np.array(py), np.array(px)))
    return found


def kmeans1d(vals, weights, k, iters=30):
    """Взвешенный k-means по одной координате: номер кластера для каждого значения (кластеры по возрастанию)."""
    lo, hi = vals.min(), vals.max()
    centers = np.array([lo + (hi - lo) * (i + 0.5) / k for i in range(k)])
    for _ in range(iters):
        lab = np.abs(vals[:, None] - centers[None, :]).argmin(1)
        for i in range(k):
            if (lab == i).any():
                centers[i] = np.average(vals[lab == i], weights=weights[lab == i])
    order = np.argsort(centers)
    return np.argsort(order)[np.abs(vals[:, None] - centers[None, :]).argmin(1)]


def grid_cells(blobs, rows, cols):
    """Пятна → клетки сетки по рядам и столбцам. В клетке может быть несколько пятен (три светлячка, россыпь
    искорок без каймы): главное — самое большое, рядом лежащие и крупные мелкие пятна присоединяются к нему,
    далёкие крошки отбрасываются. Возвращает список (py, px) по порядку клеток."""
    biggest = max(b[0] for b in blobs)
    blobs = [b for b in blobs if b[0] >= biggest * 0.004]  # шум и пылинки
    cy = np.array([b[1].mean() for b in blobs])
    cx = np.array([b[2].mean() for b in blobs])
    wt = np.array([b[0] for b in blobs], float)
    row = kmeans1d(cy, wt, rows)
    cells = []
    for r in range(rows):
        idx = np.nonzero(row == r)[0]
        if len(idx) < cols:
            sys.exit(f"в ряду {r + 1} нашлось {len(idx)} пятен, нужно {cols} — наклейки слиплись или вылезли из ряда?")
        col = kmeans1d(cx[idx], wt[idx], cols)
        for c in range(cols):
            members = [blobs[i] for i in idx[col == c]]
            if not members:
                sys.exit(f"пустая клетка: ряд {r + 1}, столбец {c + 1}")
            members.sort(key=lambda b: -b[0])
            main = members[0]
            y0, y1, x0, x1 = main[1].min(), main[1].max(), main[2].min(), main[2].max()
            pad = 0.2 * max(y1 - y0, x1 - x0)
            keep = [main]
            for b in members[1:]:
                near = (b[1].min() <= y1 + pad and b[1].max() >= y0 - pad and
                        b[2].min() <= x1 + pad and b[2].max() >= x0 - pad)
                if near or b[0] >= main[0] * 0.1:
                    keep.append(b)
            if main[0] < biggest * 0.08 and len(keep) == 1:
                sys.exit(f"в клетке ряд {r + 1}, столбец {c + 1} слишком маленькое пятно — наклейка не найдена?")
            cells.append((np.concatenate([b[1] for b in keep]), np.concatenate([b[2] for b in keep])))
    return cells


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser()
    p.add_argument("sheet")
    p.add_argument("group", help="id альбома (pets, sweets…) или мира (fairy, sea…)")
    p.add_argument("--cols", type=int, default=4)
    p.add_argument("--rows", type=int, default=3)
    p.add_argument("--border", type=float, default=0.03, help="доп. белая кайма (у Gemini своя тонкая уже есть)")
    p.add_argument("--gold", action="store_true", help="супер-наклейки: золотой ободок")
    p.add_argument("--size", type=int, default=256)
    p.add_argument("--part", type=int, default=0, help="альбом больше листа (base, 24): 1 — первые 12, 2 — следующие")
    a = p.parse_args()

    emojis = group_items(a.group, world=a.gold)
    n = a.cols * a.rows
    if a.part:
        emojis = emojis[(a.part - 1) * n:a.part * n]
    if len(emojis) != n:
        sys.exit(f"в «{a.group}» {len(emojis)} наклеек, а на листе {n} мест")

    sheet = Image.open(a.sheet).convert("RGB")
    cutout, _ = cut(sheet)
    alpha = np.asarray(cutout.getchannel("A")).astype(np.float32) / 255

    # маленькая картинка для поиска пятен (быстрее), потом пятна переносятся на полный размер
    k = max(1, round(max(sheet.size) / 600))
    small = (alpha[::k, ::k] > 0.5)
    ordered = grid_cells(components(small), a.rows, a.cols)

    sub = "stickers/gold" if a.gold else "stickers"
    out_dir = os.path.join(ROOT, "images", sub)
    os.makedirs(out_dir, exist_ok=True)
    index_path = os.path.join(ROOT, "images", "index.json")
    index = json.load(open(index_path, encoding="utf-8")) if os.path.exists(index_path) else {}
    section = index.setdefault("super" if a.gold else "sticker", {})

    full = np.asarray(cutout)
    made = []
    for emoji, (py, px) in zip(emojis, ordered):
        m = np.zeros(small.shape, np.uint8)
        m[py, px] = 255
        big = Image.fromarray(m).resize(sheet.size, Image.NEAREST).filter(ImageFilter.MaxFilter(2 * k + 3))
        mask = np.asarray(big) > 0
        rgba = full.copy()
        rgba[..., 3] = np.where(mask, rgba[..., 3], 0)
        sticker = finish(Image.fromarray(rgba, "RGBA"), a.size, a.border, a.gold)
        # супер-наклейки — по миру: одно эмодзи в разных мирах нарисовано по-разному (✨, 🏡, 🦌)
        name = (f"{a.group}-" if a.gold else "") + file_key(emoji) + ".webp"
        sticker.save(os.path.join(out_dir, name), quality=88, method=6)
        section[f"{a.group}:{emoji}" if a.gold else emoji] = f"{sub}/{name}"
        made.append((emoji, sticker))

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")

    # лист сравнения: эмодзи сверху, наклейка снизу
    cell = 200
    check = Image.new("RGBA", (a.cols * cell, a.rows * (cell + 110)), (250, 243, 226, 255))
    d = ImageDraw.Draw(check)
    fe = ImageFont.truetype(r"C:\Windows\Fonts\seguiemj.ttf", 72)
    for i, (emoji, st) in enumerate(made):
        r, c = divmod(i, a.cols)
        x, y = c * cell, r * (cell + 110)
        d.text((x + cell // 2 - 44, y + 8), emoji, font=fe, embedded_color=True)
        check.alpha_composite(st.resize((cell - 20, cell - 20), Image.LANCZOS), (x + 10, y + 100))
    check_path = os.path.splitext(a.sheet)[0] + "-check.jpg"
    check.convert("RGB").save(check_path, quality=90)
    print(f"{len(made)} наклеек → images/{sub}/, index.json обновлён, сравнение: {check_path}")


if __name__ == "__main__":
    main()
