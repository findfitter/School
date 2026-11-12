"""Лист сравнения картинок с подписями (Pillow; запускать встроенным Python ComfyUI).

python contact_sheet.py <out.jpg> <cols> "<файл>|<подпись>" …
"""
import sys

from PIL import Image, ImageDraw, ImageFont

TILE_W = 640
PAD = 24
CAPTION = 64
FONT = r"C:\Windows\Fonts\segoeui.ttf"
FONT_B = r"C:\Windows\Fonts\segoeuib.ttf"


def main():
    out, cols, items = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    tiles = []
    for it in items:
        path, label = it.split("|", 1)
        im = Image.open(path).convert("RGB")
        h = round(im.height * TILE_W / im.width)
        tiles.append((im.resize((TILE_W, h), Image.LANCZOS), label))
    tile_h = max(t.height for t, _ in tiles)
    rows = (len(tiles) + cols - 1) // cols
    W = cols * TILE_W + (cols + 1) * PAD
    H = rows * (tile_h + CAPTION) + (rows + 1) * PAD
    sheet = Image.new("RGB", (W, H), (244, 240, 232))
    d = ImageDraw.Draw(sheet)
    f_num = ImageFont.truetype(FONT_B, 26)
    f_txt = ImageFont.truetype(FONT, 22)
    for i, (im, label) in enumerate(tiles):
        r, c = divmod(i, cols)
        x = PAD + c * (TILE_W + PAD)
        y = PAD + r * (tile_h + CAPTION + PAD)
        sheet.paste(im, (x, y))
        num, _, rest = label.partition(" ")
        d.text((x, y + tile_h + 8), num, font=f_num, fill=(150, 60, 40))
        nw = d.textlength(num + " ", font=f_num)
        d.text((x + nw, y + tile_h + 11), rest, font=f_txt, fill=(50, 45, 40))
    sheet.save(out, quality=88)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
