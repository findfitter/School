"""Макет главного экрана через локальный ComfyUI (SDXL, 1216×832).

Запуск (сервер ComfyUI уже работает на 127.0.0.1:8188):
  python main_menu.py txt  <seed> [--style cartoon|watercolor] [--scene]
  python main_menu.py ipa  <seed> [--weight 0.7] [--wtype "style transfer"] [--style …] [--scene]
  python main_menu.py img  <seed> [--denoise 0.6] [--style …]

  txt   — только по тексту;
  ipa   — IP-Adapter: стиль (или стиль и содержание при --wtype linear) берётся из образца;
  img   — img2img по образцу: чем меньше denoise, тем ближе к образцу.
  --style cartoon     — яркий мультяшный стиль, как образец владельца;
  --style watercolor  — акварельная «сказочная книжка», как игра сейчас;
  --scene             — только фон-сцена без интерфейса (для сборки экрана в HTML поверх).

Образец — ComfyUI/input/main-menu-example.webp. Готовые PNG сохраняются в --out
(по умолчанию D:/08 Alisa app/.art-raw/raw/main-menu). Надписи SDXL рисует кашей —
оцениваем композицию и стиль, настоящие надписи делаются в HTML/CSS.
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid

HOST = "http://127.0.0.1:8188"
REFERENCE = "main-menu-example.webp"
W, H = 1216, 832

STYLE = {
    "cartoon": (
        "bright kawaii cartoon game art, clean bold outlines, soft cel shading, vivid pastel colors, "
        "polished mobile game illustration, cheerful"
    ),
    "watercolor": (
        "hand painted watercolor storybook illustration, soft washes on textured paper, thin ink outlines, "
        "muted pastel palette, gentle children's picture book, cozy"
    ),
}

UI = (
    "main menu screen of a children's educational game, landscape layout, "
    "on the left a cute puppy dog with a pink bow sitting on the grass, white speech bubble above the dog, "
    "a glowing golden bone on a tree stump next to the dog, "
    "at the bottom left a long rounded panel with a yellow progress bar, "
    "on the right a big open paper book page with a pink ribbon banner on top and a neat grid of seven rounded "
    "cards, each card with a round colorful badge and three small gold stars, "
    "a wooden sign with a paw print at the top left, a star counter at the top, "
    "round gift button and settings button at the top right, "
    "background: sunny fairy tale meadow, green trees, flowers, pink castle with towers in the distance, "
    "blue sky with fluffy clouds"
)
SCENE = (
    "wide landscape background for a children's game, sunny fairy tale meadow with soft green grass and flowers, "
    "green trees on the sides, a stone path, a tree stump on the left, a pink castle with towers in the distance, "
    "blue sky with fluffy white clouds, empty space in the middle and on the right, no characters"
)
NEGATIVE = (
    "photo, realistic, photorealistic, 3d render, dark, night, scary, ugly, deformed, blurry, lowres, "
    "watermark, signature, logo, jpeg artifacts, cropped, messy, cluttered, horror"
)


def node(cls, **inputs):
    return {"class_type": cls, "inputs": inputs}


def build(a):
    style = STYLE[a.style]
    body = SCENE if a.scene else UI
    prompt = f"{body}, {style}"
    neg = NEGATIVE + (", text, letters, user interface, buttons, panels, people, animals" if a.scene else "")
    g = {
        "1": node("CheckpointLoaderSimple", ckpt_name="sd_xl_base_1.0.safetensors"),
        "2": node("VAELoader", vae_name="sdxl_vae.safetensors"),
        "3": node("CLIPTextEncode", text=prompt, clip=["1", 1]),
        "4": node("CLIPTextEncode", text=neg, clip=["1", 1]),
    }
    model = ["1", 0]
    latent = None
    denoise = 1.0
    if a.mode in ("ipa", "img"):
        g["10"] = node("LoadImage", image=REFERENCE)
    if a.mode == "ipa":
        # Весь образец (с полями), а не центральный квадрат: собака и книга по краям.
        g["11"] = node("PrepImageForClipVision", image=["10", 0], interpolation="LANCZOS",
                       crop_position="pad", sharpening=0.0)
        g["20"] = node("IPAdapterUnifiedLoader", model=["1", 0], preset="PLUS (high strength)")
        g["22"] = node("IPAdapterAdvanced", model=["20", 0], ipadapter=["20", 1], image=["11", 0],
                       weight=a.weight, weight_type=a.wtype, combine_embeds="concat",
                       start_at=0.0, end_at=1.0, embeds_scaling="V only")
        model = ["22", 0]
    if a.mode == "img":
        g["12"] = node("ImageScale", image=["10", 0], upscale_method="lanczos", width=W, height=H, crop="center")
        g["13"] = node("VAEEncode", pixels=["12", 0], vae=["2", 0])
        latent, denoise = ["13", 0], a.denoise
    else:
        g["5"] = node("EmptyLatentImage", width=W, height=H, batch_size=1)
        latent = ["5", 0]
    g["6"] = node("KSampler", model=model, positive=["3", 0], negative=["4", 0], latent_image=latent,
                  seed=a.seed, steps=a.steps, cfg=a.cfg, sampler_name="dpmpp_2m", scheduler="karras",
                  denoise=denoise)
    g["7"] = node("VAEDecode", samples=["6", 0], vae=["2", 0])
    g["8"] = node("SaveImage", images=["7", 0], filename_prefix="mm_tmp")
    return g


def call(path, data=None):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def name_of(a):
    parts = ["mm", a.mode, a.style]
    if a.scene:
        parts.append("scene")
    if a.mode == "ipa":
        parts.append(f"w{a.weight}-{a.wtype.replace(' ', '')}")
    if a.mode == "img":
        parts.append(f"d{a.denoise}")
    parts.append(str(a.seed))
    return "_".join(parts) + ".png"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["txt", "ipa", "img"])
    p.add_argument("seed", type=int)
    p.add_argument("--style", choices=list(STYLE), default="cartoon")
    p.add_argument("--scene", action="store_true")
    p.add_argument("--weight", type=float, default=0.7)
    p.add_argument("--wtype", default="style transfer")
    p.add_argument("--denoise", type=float, default=0.6)
    p.add_argument("--steps", type=int, default=25)
    p.add_argument("--cfg", type=float, default=6.5)
    p.add_argument("--out", default=r"D:\08 Alisa app\.art-raw\raw\main-menu")
    a = p.parse_args()

    t = time.time()
    try:
        pid = call("/prompt", {"prompt": build(a), "client_id": str(uuid.uuid4())})["prompt_id"]
    except urllib.error.HTTPError as e:
        print("ComfyUI отклонил граф:", e.read().decode()[:1500])
        sys.exit(1)
    while True:
        h = call(f"/history/{pid}")
        if pid in h:
            break
        time.sleep(2)
    st = h[pid].get("status", {})
    if st.get("status_str") != "success":
        print("ошибка:", json.dumps(st.get("messages", [])[-2:], ensure_ascii=False)[:1500])
        sys.exit(1)
    img = [i for o in h[pid]["outputs"].values() for i in o.get("images", [])][0]
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    with urllib.request.urlopen(f"{HOST}/view?{q}") as r:
        data = r.read()
    os.makedirs(a.out, exist_ok=True)
    dest = os.path.join(a.out, name_of(a))
    with open(dest, "wb") as f:
        f.write(data)
    print(f"{os.path.basename(dest)}  {time.time() - t:.0f} с")


if __name__ == "__main__":
    main()
