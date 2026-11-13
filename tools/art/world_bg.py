"""Фон мира супер-наклеек через локальный ComfyUI (SDXL, 1216×832 ≈ сцена 516×360).

Запуск (сервер ComfyUI уже работает на 127.0.0.1:8188), встроенным Python ComfyUI:
  python world_bg.py <мир> <seed> [txt|ipa] [--weight 0.5] [--wtype "style transfer"]

  txt — только по тексту; ipa — стиль берётся с образца (фон главного экрана из Gemini, ComfyUI/input/menu-bg-ref.png),
  чтобы миры были в одном стиле с главным экраном.
Фон спокойный: наклейки мира (замок, единорог, радуга…) лягут сверху, поэтому в запросе нет предметов из мира и
много пустого места. Готовые PNG — в --out (по умолчанию D:/08 Alisa app/.art-raw/raw/worlds).
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

HOST = "http://127.0.0.1:8188"
REFERENCE = "menu-bg-ref.png"
W, H = 1216, 832

STYLE = (
    "kawaii storybook cartoon illustration for a children's game, clean soft outlines, smooth soft gradients, "
    "gentle cel shading, pastel colors, dreamy, cheerful, high quality"
)
# мир → (что нарисовать, чего не рисовать: предметы этого мира, они лягут сверху наклейками)
WORLDS = {
    "fairy": (
        "wide calm background landscape for a children's sticker book page: dreamy pastel pink and lilac sky "
        "with big soft fluffy white clouds, tiny twinkling stars and soft magical glow, faint lilac hills far away, "
        "a gentle rolling green meadow with tiny pink and white flowers along the bottom third, "
        "lots of calm empty space in the middle, no buildings, no characters",
        "castle, house, building, tower, princess, unicorn, horse, rainbow, crown, bow, butterfly, sofa",
    ),
    "sea": (
        "(underwater scene:1.4), view inside the sea below the water surface, the whole picture is under water, "
        "soft clear turquoise and blue water everywhere, gentle sunbeams shining down through the water from above, "
        "a few rising bubbles, soft sandy ocean floor with small pebbles along the bottom, a little soft green seaweed "
        "and pink coral only at the far left and right edges, lots of calm empty water in the middle",
        "(sky, clouds, sun, land, beach, shore, island, lake, mountains, trees, horizon:1.3), "
        "fish, mermaid, whale, dolphin, turtle, crab, octopus, starfish, seashell, ship, boat, pufferfish, shark",
    ),
    "forest": (
        "wide calm background for a children's sticker book page: a sunny magical forest clearing, soft green and "
        "golden light, tall tree trunks only at the far left and right edges, soft leafy canopy at the very top, "
        "a gentle mossy green meadow with tiny flowers along the bottom third, soft misty glow, "
        "lots of calm empty space in the middle",
        "deer, fox, owl, squirrel, hare, rabbit, fairy, house, cabin, mushroom, moon, tulip, fireflies, big oak tree",
    ),
    "candy": (
        "(candy land:1.4), a sweet fairy-tale landscape made of sweets for a children's sticker book page: "
        "soft rolling hills of pink and white whipped cream frosting with colourful sprinkles, a little winding "
        "chocolate river, red and white striped candy canes and round gumdrop bushes only at the far left and right "
        "edges, cotton candy clouds in a pastel pink and mint sky, lots of calm empty space in the middle",
        "(ordinary grass, green meadow, ordinary trees, forest, mountains, volcano:1.3), "
        "cake, birthday cake, ice cream cone, cupcake, donut, cookie, chocolate bar, wrapped candy, strawberry, "
        "gingerbread house, house, characters",
    ),
    "zoo": (
        "(children's zoo park:1.4), a sunny cartoon zoo for a children's sticker book page: low wooden fences "
        "and light sandy paths dividing grassy animal enclosures, big grey rocks, a small blue pond, green bushes "
        "and bamboo, a few palm trees only at the far left and right edges, soft blue sky with small clouds, "
        "empty enclosures, lots of calm empty space in the middle",
        "(wild nature, empty meadow, mountains:1.2), giraffe, elephant, lion, zebra, penguin, parrot, monkey, "
        "panda, tiger, flamingo, bananas, animals, birds, people, signs, text",
    ),
    "winter": (
        "wide calm winter background landscape for a children's sticker book page: soft pale blue sky with gentle "
        "falling snowflakes, soft snowy hills, a few small snowy fir trees only at the far left and right edges, "
        "smooth white snow along the bottom third, cosy soft light, lots of calm empty space in the middle",
        "snowman, house, cabin, decorated christmas tree, reindeer, deer, santa, old man, presents, gift, sledge, "
        "bell, stocking, mittens, star",
    ),
    "circus": (
        "(inside a big circus tent:1.4), cartoon circus arena for a children's sticker book page: red and white "
        "striped tent walls rising to the top, a round circus ring with a red and gold edge and a soft sandy floor "
        "at the bottom, warm golden spotlight beams, strings of small colourful triangle flags across the top, "
        "a few tiny confetti, empty stage, lots of calm empty space in the middle",
        "(outdoor landscape, hills, mountains, lake, sky, sunset:1.3), clown, juggler, carousel, ferris wheel, "
        "balloons, fireworks, masks, top hat, rabbit, pony, horse, popcorn, bear, ball, animals, people, audience",
    ),
    "space": (
        "(outer space:1.4), deep space seen from a spaceship, cosmos, soft deep blue and purple starry space "
        "with gentle pink and violet nebula clouds, a soft milky way, many tiny twinkling stars of different sizes, "
        "no ground, lots of calm empty space in the middle",
        "(landscape, ground, land, mountains, hills, trees, water, lake, horizon, moon:1.3), "
        "rocket, planet, saturn, moon face, astronaut, alien, ufo, flying saucer, comet, shooting star, satellite, "
        "sun, earth, telescope, spaceship",
    ),
}
NEGATIVE = (
    "photo, realistic, photorealistic, 3d render, scary, ugly, deformed, blurry, lowres, "
    "watermark, signature, logo, text, letters, jpeg artifacts, cropped, messy, cluttered, busy, horror, "
    "people, characters, user interface, frame, border"
)


def node(cls, **inputs):
    return {"class_type": cls, "inputs": inputs}


def build(a):
    g = {
        "1": node("CheckpointLoaderSimple", ckpt_name="sd_xl_base_1.0.safetensors"),
        "2": node("VAELoader", vae_name="sdxl_vae.safetensors"),
        "3": node("CLIPTextEncode", text=f"{WORLDS[a.world][0]}, {STYLE}", clip=["1", 1]),
        "4": node("CLIPTextEncode", text=f"{NEGATIVE}, {WORLDS[a.world][1]}", clip=["1", 1]),
        "5": node("EmptyLatentImage", width=W, height=H, batch_size=1),
    }
    model = ["1", 0]
    if a.mode == "ipa":
        g["10"] = node("LoadImage", image=REFERENCE)
        g["11"] = node("PrepImageForClipVision", image=["10", 0], interpolation="LANCZOS",
                       crop_position="pad", sharpening=0.0)
        g["20"] = node("IPAdapterUnifiedLoader", model=["1", 0], preset="PLUS (high strength)")
        g["22"] = node("IPAdapterAdvanced", model=["20", 0], ipadapter=["20", 1], image=["11", 0],
                       weight=a.weight, weight_type=a.wtype, combine_embeds="concat",
                       start_at=0.0, end_at=1.0, embeds_scaling="V only")
        model = ["22", 0]
    g["6"] = node("KSampler", model=model, positive=["3", 0], negative=["4", 0], latent_image=["5", 0],
                  seed=a.seed, steps=a.steps, cfg=a.cfg, sampler_name="dpmpp_2m", scheduler="karras", denoise=1.0)
    g["7"] = node("VAEDecode", samples=["6", 0], vae=["2", 0])
    g["8"] = node("SaveImage", images=["7", 0], filename_prefix="wb_tmp")
    return g


def call(path, data=None):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser()
    p.add_argument("world", choices=list(WORLDS))
    p.add_argument("seed", type=int)
    p.add_argument("mode", nargs="?", choices=["txt", "ipa"], default="txt")
    p.add_argument("--weight", type=float, default=0.5)
    p.add_argument("--wtype", default="style transfer")
    p.add_argument("--steps", type=int, default=25)
    p.add_argument("--cfg", type=float, default=6.5)
    p.add_argument("--out", default=r"D:\08 Alisa app\.art-raw\raw\worlds")
    a = p.parse_args()

    t = time.time()
    try:
        pid = call("/prompt", {"prompt": build(a), "client_id": str(uuid.uuid4())})["prompt_id"]
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
    os.makedirs(a.out, exist_ok=True)
    extra = f"_w{a.weight}" if a.mode == "ipa" else ""
    dest = os.path.join(a.out, f"{a.world}_{a.mode}{extra}_{a.seed}.png")
    with open(dest, "wb") as f:
        f.write(data)
    print(f"{os.path.basename(dest)}  {time.time() - t:.0f} с")


if __name__ == "__main__":
    main()
