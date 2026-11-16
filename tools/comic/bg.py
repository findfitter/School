"""Фоны комикса «Аглая и гусь» через локальный ComfyUI (SDXL, 1216x832 = 3:2).

Запуск (сервер ComfyUI уже работает на 127.0.0.1:8188), встроенным Python ComfyUI или любым Python 3:
  python bg.py yard 101 102 103 104        # фон yard, четыре варианта (seed)
Результат: D:/08 Alisa app/.art-raw/raw/comic/<фон>_s<seed>.png (вне git). Просмотр — листом `sheet.py`.
Только yard проверен; остальные запросы написаны по сценарию (design/comic-pilot.md) и ещё не пробовались.
Кадры комикса бывают и широкими, и почти квадратными, поэтому важное держим ближе к центру, а внизу оставляем
пустую землю для героев (они стоят в нижней половине кадра).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

HOST = "http://127.0.0.1:8188"
W, H = 1216, 832
OUT = r"D:\08 Alisa app\.art-raw\raw\comic"

STYLE = (
    "kawaii storybook cartoon illustration for a children's comic, clean soft outlines, smooth soft gradients, "
    "gentle cel shading, warm pastel colors, cheerful, high quality"
)
EMPTY = "lots of calm empty ground in the lower half for characters to stand"
# фон -> (что нарисовать, чего не рисовать)
BGS = {
    "yard": (
        "(cozy backyard garden on a sunny morning:1.2), a (wooden garden bench:1.3) on the left side, "
        "a (big round leafy green tree:1.3) in the middle background, a (low wooden picket fence:1.3) along the right "
        "side with a small flowerbed of colourful flowers in front of it, a small red wooden dog house at the far right "
        "edge, soft green lawn in the lower half, bright blue sky with a few soft clouds, " + EMPTY,
        "people, dog, cat, bird, goose, animals, house wall, building, text, letters, signs",
    ),
    "pond": (
        "(a calm village pond on a sunny day:1.2), reeds on the left, water lilies on the water on the right, a flat "
        "stone on the shore and a small wooden jetty, green grassy bank in the lower half, " + EMPTY,
        "people, animals, goose, duck, frog, boat, text, letters, house, cottage, building, hut, roof, barn, pavilion, gazebo, farm, village",
    ),
    "bridge": (
        "(a small wooden footbridge over a stream:1.3) with railings, a post at each end, green meadow banks, "
        "gentle blue water below, sunny day, " + EMPTY,
        "people, animals, cars, text, letters",
    ),
    "bushes": (
        "(a narrow path between green bushes:1.3), a fallen log beside the path and a small animal hole in the bank, "
        "tall grass, sunny morning, " + EMPTY,
        "people, animals, text, letters, house",
    ),
    "storm": (
        "(a dramatic stormy evening over a pond and yard:1.3), dark blue-grey rain clouds, a flash of pale light in "
        "the sky, rain, wet grass with puddles, a wooden shed far in the distance, a tree and a fence, " + EMPTY,
        "people, animals, sun, rainbow, text, letters",
    ),
    "shed": (
        "(inside an old wooden garden shed:1.3), a wooden shelf on the wall, a barrel, a pile of hay on the floor, "
        "a door with daylight coming in, warm dim light, " + EMPTY,
        "people, animals, text, letters, windows with view",
    ),
    "mudpath": (
        "(a muddy dirt path next to a big brown muddy puddle:1.4) in the foreground, green grass and tall reeds around, "
        "a pond with calm water far in the background, sunny day, " + EMPTY,
        "people, animals, goose, duck, frog, boat, text, letters, house, building, bridge",
    ),
    "meadow": (
        "(a sunny flower meadow:1.3), a round haystack, a gentle green hill, colourful wildflowers, bright blue sky, "
        + EMPTY,
        "people, animals, house, text, letters",
    ),
    "sunset": (
        "(sunset over a pond and a green hill:1.3), warm orange and pink sky, a tree silhouette, golden light, "
        + EMPTY,
        "people, animals, text, letters",
    ),
}
NEGATIVE = (
    "photo, realistic, photorealistic, 3d render, scary, ugly, deformed, blurry, lowres, watermark, signature, logo, "
    "jpeg artifacts, cropped, messy, cluttered, busy, horror, characters, user interface, frame, border"
)


def node(cls, **inputs):
    return {"class_type": cls, "inputs": inputs}


def build(bg, seed, steps=25, cfg=6.5):
    pos, neg = BGS[bg]
    return {
        "1": node("CheckpointLoaderSimple", ckpt_name="sd_xl_base_1.0.safetensors"),
        "2": node("VAELoader", vae_name="sdxl_vae.safetensors"),
        "3": node("CLIPTextEncode", text=f"{pos}, {STYLE}", clip=["1", 1]),
        "4": node("CLIPTextEncode", text=f"{NEGATIVE}, {neg}", clip=["1", 1]),
        "5": node("EmptyLatentImage", width=W, height=H, batch_size=1),
        "6": node("KSampler", model=["1", 0], positive=["3", 0], negative=["4", 0], latent_image=["5", 0],
                  seed=seed, steps=steps, cfg=cfg, sampler_name="dpmpp_2m", scheduler="karras", denoise=1.0),
        "7": node("VAEDecode", samples=["6", 0], vae=["2", 0]),
        "8": node("SaveImage", images=["7", 0], filename_prefix="comic_tmp"),
    }


def call(path, data=None):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def generate(bg, seed):
    t = time.time()
    try:
        pid = call("/prompt", {"prompt": build(bg, seed), "client_id": str(uuid.uuid4())})["prompt_id"]
    except urllib.error.HTTPError as e:
        sys.exit("ComfyUI отклонил граф: " + e.read().decode()[:1500])
    while True:
        h = call(f"/history/{pid}")
        if pid in h:
            break
        time.sleep(2)
    st = h[pid].get("status", {})
    if st.get("status_str") != "success":
        sys.exit("ошибка: " + json.dumps(st.get("messages", [])[-2:], ensure_ascii=False)[:1500])
    img = [i for o in h[pid]["outputs"].values() for i in o.get("images", [])][0]
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    with urllib.request.urlopen(f"{HOST}/view?{q}") as r:
        data = r.read()
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{bg}_s{seed}.png")
    with open(dest, "wb") as f:
        f.write(data)
    print(f"{os.path.basename(dest)}  {time.time() - t:.0f} с", flush=True)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3 or sys.argv[1] not in BGS:
        sys.exit("python bg.py <" + "|".join(BGS) + "> <seed> [seed ...]")
    for seed in sys.argv[2:]:
        generate(sys.argv[1], int(seed))


if __name__ == "__main__":
    main()
