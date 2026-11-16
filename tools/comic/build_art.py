"""Подготовка картинок комикса «Аглая и гусь» для модуля modules/comic-aglaya.

Запуск встроенным Python ComfyUI (в нём есть Pillow, numpy и scipy):
  PY=.comfyui/ComfyUI_windows_portable/python_embeded/python.exe

  # лист поз героя из Gemini: имена поз слева направо и сверху вниз
  $PY tools/comic/build_art.py sprites <лист> ag sleep,stand,surprised
  # второй лист того же героя: 3 в ряд; --rim — белая кайма, как у первого листа; --match — поза нового листа,
  # которая по размеру соответствует уже сохранённой (чтобы собака не меняла размер от листа к листу)
  $PY tools/comic/build_art.py sprites <лист> ag sniff,run,leap,shiver,sad,laugh,proud,growl,muddy --cols 3 --rim 5 --match proud=stand
  # лист предметов в один ряд
  $PY tools/comic/build_art.py props <лист> ball,feather,plaid,tracks,puddle

  # большой кадр (картинка целиком, из Gemini)
  $PY tools/comic/build_art.py splash <png> race

  # фон (PNG из bg.py) и положение «мест» для задания «найди»: имя=x,y (проценты от левого верхнего угла)
  $PY tools/comic/build_art.py bg <png> yard bench=32,66 fence=55,47 tree=72,20

Что делает: вырезает серый фон листа (cutout.py из ветки art), находит отдельные фигуры (связные пятна, части ближе --gap px
считаются одной фигурой), сохраняет прозрачные WebP в modules/comic-aglaya/art/, дописывает таблицу art-data.js
(её читает art.js) и обновляет список files в manifest.json (чтобы картинки попали в офлайн-кэш).
h — высота позы относительно самой высокой позы героя (свёрнутая собака ниже стоящей); eq — высота в «пикселях первого листа».
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = r"D:\08 Alisa app"
MOD = os.path.join(ROOT, "modules", "comic-aglaya")
ART = os.path.join(MOD, "art")
sys.path.insert(0, os.path.join(ROOT, ".art", "tools", "art"))
from cutout import cut  # noqa: E402

DATA_JS = os.path.join(MOD, "art-data.js")
HEAD = "// Таблица картинок комикса. Пишет tools/comic/build_art.py, руками не править.\n"


def load_data():
    if not os.path.exists(DATA_JS):
        return {"bg": {}, "hero": {}, "prop": {}, "splash": {}, "spots": {}}
    s = open(DATA_JS, encoding="utf-8").read()
    return json.loads(re.search(r"ART_DATA = (\{.*\});", s, re.S).group(1))


def save_data(data):
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(HEAD + "export const ART_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    # список files в манифесте: служебные файлы + все картинки
    mp = os.path.join(MOD, "manifest.json")
    m = json.load(open(mp, encoding="utf-8"))
    files = [x for x in m["files"] if not x.startswith("art/") and x != "art-data.js"]
    files.append("art-data.js")
    files += sorted(f"art/{n}" for n in os.listdir(ART) if n.endswith(".webp"))
    m["files"] = files
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write("\n")


def cut_cells(sheet, count, gap=8, cols=None, rows=None, min_area=1500):
    """Вырезать фон листа и разделить на фигуры. Фигура — связное пятно (после слияния частей ближе gap px);
    порядок: ряды сверху вниз, в ряду слева направо (cols — фигур в ряду, по умолчанию все в один ряд, если их ≤ 5)."""
    im = Image.open(sheet).convert("RGB")
    rgba, _bg = cut(im)
    arr = np.array(rgba)
    alpha = arr[:, :, 3] > 40
    merged = nd.binary_dilation(alpha, structure=np.ones((3, 3), bool), iterations=max(1, gap // 2))
    labels, n = nd.label(merged)
    boxes = []
    for i, sl in enumerate(nd.find_objects(labels), 1):
        own = (labels[sl] == i) & alpha[sl]
        if own.sum() < min_area:  # мелкий мусор, надписи и отдельные штрихи
            continue
        boxes.append((i, sl, own))
    if len(boxes) != count:
        sys.exit(f"на листе найдено {len(boxes)} фигур, а имён {count}: поправьте --gap, --min или список имён (лишние — «-»)")
    boxes.sort(key=lambda b: (b[1][0].start + b[1][0].stop) / 2)
    if rows:  # фигур в каждом ряду, например [4, 5, 5]
        sizes = rows
    else:
        cols = cols or (count if count <= 5 else 3)
        sizes = [cols] * (count // cols) + ([count % cols] if count % cols else [])
    grouped, k = [], 0
    for n in sizes:
        grouped.append(sorted(boxes[k:k + n], key=lambda b: b[1][1].start))
        k += n
    rows_sorted = grouped
    crops = []
    pad = 4
    for b in [b for r in rows_sorted for b in r]:
        i, sl, own = b
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        sub = arr[y0:y1, x0:x1].copy()
        a = np.zeros(own.shape, np.uint8)
        # пиксели этой фигуры: исходная альфа внутри её (расширенного) пятна, мягкий край сохраняем
        a[labels[sl] == i] = sub[:, :, 3][labels[sl] == i]
        sub[:, :, 3] = a
        img = Image.fromarray(sub, "RGBA")
        out = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
        out.paste(img, (pad, pad))
        crops.append(out)
    return crops


def add_rim(img, r):
    """Белая кайма шириной r px вокруг фигуры (как у наклеек Gemini)."""
    if r <= 0:
        return img
    big = Image.new("RGBA", (img.width + 2 * r, img.height + 2 * r), (0, 0, 0, 0))
    big.paste(img, (r, r))
    a = np.array(big)[:, :, 3] > 20
    ring = nd.binary_dilation(a, structure=np.ones((3, 3), bool), iterations=r)
    white = np.zeros((big.height, big.width, 4), np.uint8)
    white[ring] = (255, 255, 255, 255)
    base = Image.fromarray(white, "RGBA")
    base.alpha_composite(big)
    return base


def sprites(sheet, who, names, gap=8, cols=None, rim=0, match=None, rows=None, min_area=1500, factor=1.0):
    names = names.split(",")
    crops = [add_rim(c, rim) for c in cut_cells(sheet, len(names), gap, cols, rows, min_area)]
    data = load_data()
    os.makedirs(ART, exist_ok=True)
    poses = data["hero"].setdefault(who, {})
    # размер «в пикселях первого листа Аглаи»: --match новая=старая подгоняет масштаб листа под уже сохранённую позу,
    # --factor делает героя крупнее или мельче (гусь больше собаки, лягушка меньше)
    scale = 1.0
    if match:
        new_name, old_name = match.split("=")
        old = poses[old_name]
        old_eq = old.get("eq") or Image.open(os.path.join(ART, old["src"].split("/")[-1])).height
        scale = old_eq / crops[names.index(new_name)].height
    scale *= factor
    for name, c in zip(names, crops):
        if name == "-":  # лишняя фигура на листе: пропустить
            continue
        fn = f"{who}-{name}.webp"
        c.save(os.path.join(ART, fn), "WEBP", quality=90, method=6)
        poses[name] = {"src": f"art/{fn}", "eq": round(c.height * scale, 1), "h": 1.0}
        print(f"{fn}  {c.width}x{c.height}  eq={poses[name]['eq']}")
    for v in poses.values():
        v.setdefault("eq", Image.open(os.path.join(ART, v["src"].split("/")[-1])).height)
    # h — высота относительно самой высокой позы Аглаи (общий масштаб всех героев: гусь выше собаки, лягушка ниже)
    ag = data["hero"].get("ag", {})
    top = max([v["eq"] for v in (ag or poses).values()])
    for v in poses.values():
        v["h"] = round(v["eq"] / top, 3)
    print({n: v["h"] for n, v in poses.items()})
    save_data(data)


def props(sheet, names, gap=10):
    names = names.split(",")
    crops = cut_cells(sheet, len(names), gap, len(names))
    data = load_data()
    os.makedirs(ART, exist_ok=True)
    for name, c in zip(names, crops):
        fn = f"prop-{name}.webp"
        c.save(os.path.join(ART, fn), "WEBP", quality=90, method=6)
        data["prop"][name] = {"src": f"art/{fn}", "ratio": round(c.width / c.height, 3)}
        print(f"{fn}  {c.width}x{c.height}")
    save_data(data)


def splash(png, sid):
    """Большой кадр (Gemini): целиком картинка вместо фона и героев, WebP до 1216 px шириной."""
    im = Image.open(png).convert("RGB")
    if im.width > 1216:
        im = im.resize((1216, round(im.height * 1216 / im.width)), Image.LANCZOS)
    os.makedirs(ART, exist_ok=True)
    fn = f"splash-{sid}.webp"
    im.save(os.path.join(ART, fn), "WEBP", quality=82, method=6)
    data = load_data()
    data["splash"][sid] = f"art/{fn}"
    save_data(data)
    print(fn, im.size, os.path.getsize(os.path.join(ART, fn)) // 1024, "КБ")


def background(png, bg, spots):
    im = Image.open(png).convert("RGB")
    os.makedirs(ART, exist_ok=True)
    fn = f"bg-{bg}.webp"
    im.save(os.path.join(ART, fn), "WEBP", quality=80, method=6)
    data = load_data()
    data["bg"][bg] = f"art/{fn}"
    data["spots"][bg] = {}
    for s in spots:
        name, xy = s.split("=")
        x, y = xy.split(",")
        data["spots"][bg][name] = [float(x), float(y)]
    save_data(data)
    print(fn, im.size, os.path.getsize(os.path.join(ART, fn)) // 1024, "КБ", data["spots"][bg])


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sprites")
    s.add_argument("sheet")
    s.add_argument("who")
    s.add_argument("names")
    s.add_argument("--gap", type=int, default=8)
    s.add_argument("--cols", type=int)
    s.add_argument("--rim", type=int, default=0)
    s.add_argument("--match")
    s.add_argument("--rows", help="фигур в каждом ряду через запятую, например 4,5,5")
    s.add_argument("--min", type=int, default=1500, help="минимальная площадь фигуры в px (отсекает надписи)")
    s.add_argument("--factor", type=float, default=1.0, help="масштаб героя относительно Аглаи")
    q = sub.add_parser("props")
    q.add_argument("sheet")
    q.add_argument("names")
    q.add_argument("--gap", type=int, default=10)
    p2 = sub.add_parser("splash")
    p2.add_argument("png")
    p2.add_argument("id")
    b = sub.add_parser("bg")
    b.add_argument("png")
    b.add_argument("bg")
    b.add_argument("spots", nargs="*")
    a = p.parse_args()
    if a.cmd == "sprites":
        sprites(a.sheet, a.who, a.names, a.gap, a.cols, a.rim, a.match, [int(x) for x in a.rows.split(',')] if a.rows else None, a.min, a.factor)
    elif a.cmd == "props":
        props(a.sheet, a.names, a.gap)
    elif a.cmd == "splash":
        splash(a.png, a.id)
    else:
        background(a.png, a.bg, a.spots)


if __name__ == "__main__":
    main()
