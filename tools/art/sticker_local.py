"""Наклейка локально: SDXL + IP-Adapter по образцу стиля (ComfyUI на 127.0.0.1:8188).

python sticker_local.py <имя> "<что нарисовать, с цветами>" <seed> [--weight 0.8] [--wtype "style transfer"]

Образец стиля — ComfyUI/input/example_puppy_white.png (design/ai-ref/sticker-style-puppy.webp).
Рисуем на ровном сером фоне без каймы и украшений вокруг: фон потом вырезается, кайма добавляется скриптом
одинаковой для всех (sticker_finish.py). Цвета предмета пишем явно — IP-Adapter тянет цвета образца.
Готовый PNG — в --out (по умолчанию D:/08 Alisa app/.art-raw/raw/stickers/<имя>_<seed>.png).
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
REFERENCE = "example_puppy_white.png"  # --ref example_puppy_gray.png — без цвета образца

PROMPT = (
    "one single cute kawaii sticker character: {subject}, centered, full body, "
    "cartoon illustration, thick clean dark brown outlines, soft flat colors with gentle shading, "
    "big shiny eyes, happy, children's sticker style, "
    "isolated on a plain flat solid light grey background"
)
NEGATIVE = (
    "photo, realistic, 3d render, text, letters, watermark, signature, blurry, dark, scary, "
    "extra legs, extra limbs, deformed, messy lines, white border, sticker border, frame, shadow on background, "
    "hearts, paw prints, sparkles, decorations around, many objects, multiple characters, sticker sheet, pattern, "
    "pale washed out colors, gradient background"
)


def node(cls, **inputs):
    return {"class_type": cls, "inputs": inputs}


def call(path, data=None):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("name")
    p.add_argument("subject")
    p.add_argument("seed", type=int)
    p.add_argument("--weight", type=float, default=0.8)
    p.add_argument("--wtype", default="style transfer")
    p.add_argument("--ref", default=REFERENCE, help="образец стиля в ComfyUI/input")
    p.add_argument("--steps", type=int, default=28)
    p.add_argument("--cfg", type=float, default=6.0)
    p.add_argument("--out", default=r"D:\08 Alisa app\.art-raw\raw\stickers")
    a = p.parse_args()

    g = {
        "1": node("CheckpointLoaderSimple", ckpt_name="sd_xl_base_1.0.safetensors"),
        "2": node("VAELoader", vae_name="sdxl_vae.safetensors"),
        "20": node("IPAdapterUnifiedLoader", model=["1", 0], preset="PLUS (high strength)"),
        "21": node("LoadImage", image=a.ref),
        "22": node("IPAdapterAdvanced", model=["20", 0], ipadapter=["20", 1], image=["21", 0], weight=a.weight,
                   weight_type=a.wtype, combine_embeds="concat", start_at=0.0, end_at=1.0, embeds_scaling="V only"),
        "3": node("CLIPTextEncode", text=PROMPT.format(subject=a.subject), clip=["1", 1]),
        "4": node("CLIPTextEncode", text=NEGATIVE, clip=["1", 1]),
        "5": node("EmptyLatentImage", width=1024, height=1024, batch_size=1),
        "6": node("KSampler", model=["22", 0], positive=["3", 0], negative=["4", 0], latent_image=["5", 0],
                  seed=a.seed, steps=a.steps, cfg=a.cfg, sampler_name="dpmpp_2m", scheduler="karras", denoise=1.0),
        "7": node("VAEDecode", samples=["6", 0], vae=["2", 0]),
        "8": node("SaveImage", images=["7", 0], filename_prefix="stk_tmp"),
    }
    t = time.time()
    try:
        pid = call("/prompt", {"prompt": g, "client_id": str(uuid.uuid4())})["prompt_id"]
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
    tag = "_gray" if "gray" in a.ref else ""
    dest = os.path.join(a.out, f"{a.name}_{a.seed}{tag}.png")
    with open(dest, "wb") as f:
        f.write(data)
    print(f"{os.path.basename(dest)}  {time.time() - t:.0f} с")


if __name__ == "__main__":
    main()
