"""Лист сравнения фонов с сеткой по 10 % и номерами: владелец выбирает вариант и называет, где что нарисовано.

Запуск встроенным Python ComfyUI (в нём есть Pillow):
  D:\\08 Alisa app\\.comfyui\\ComfyUI_windows_portable\\python_embeded\\python.exe sheet.py yard
Берёт все D:/08 Alisa app/.art-raw/raw/comic/<фон>_s*.png, кладёт рядом лист <фон>-sheet.jpg (2 колонки).
Сетка нужна, чтобы без просмотра картинки Claude'ом узнать положение «мест» (скамейка, дерево, забор):
x и y — проценты от левого верхнего угла.
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = r"D:\08 Alisa app\.art-raw\raw\comic"
CELL_W = 760


def main():
    bg = sys.argv[1]
    files = sorted(glob.glob(os.path.join(OUT, f"{bg}_s*.png")))
    if not files:
        sys.exit("нет картинок")
    try:
        font = ImageFont.truetype("arial.ttf", 34)
        small = ImageFont.truetype("arial.ttf", 16)
    except OSError:
        font = small = ImageFont.load_default()
    tiles = []
    for n, f in enumerate(files, 1):
        im = Image.open(f).convert("RGB")
        h = round(im.height * CELL_W / im.width)
        im = im.resize((CELL_W, h))
        d = ImageDraw.Draw(im, "RGBA")
        for k in range(1, 10):
            x = CELL_W * k // 10
            y = h * k // 10
            d.line([(x, 0), (x, h)], fill=(255, 255, 255, 90), width=1)
            d.line([(0, y), (CELL_W, y)], fill=(255, 255, 255, 90), width=1)
            d.text((x + 2, 2), str(k * 10), fill=(0, 0, 0, 200), font=small)
            d.text((2, y + 2), str(k * 10), fill=(0, 0, 0, 200), font=small)
        d.rectangle([0, 0, 52, 46], fill=(0, 0, 0, 170))
        d.text((10, 6), str(n), fill="white", font=font)
        tiles.append((n, os.path.basename(f), im))
    cols = 2
    rows = (len(tiles) + cols - 1) // cols
    th = tiles[0][2].height
    sheet = Image.new("RGB", (cols * CELL_W + (cols + 1) * 8, rows * th + (rows + 1) * 8), (40, 40, 40))
    for i, (_, _, im) in enumerate(tiles):
        r, c = divmod(i, cols)
        sheet.paste(im, (8 + c * (CELL_W + 8), 8 + r * (th + 8)))
    dest = os.path.join(OUT, f"{bg}-sheet.jpg")
    sheet.save(dest, quality=86)
    print(dest)
    for n, name, _ in tiles:
        print(n, name)


if __name__ == "__main__":
    main()
