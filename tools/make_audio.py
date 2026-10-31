"""Создаёт озвучку английских слов, сочетаний и предложений голосом Sonia (британский английский).

Что озвучивается:
  * слова из modules/english-words/words.json (модули english-words и english-quiz);
  * сочетания «цвет + предмет» из modules/english-phrases/phrases.json (красный кот -> «red cat»);
  * предложения из modules/english-sentences/sentences.json;
  * рассказы для сложного задания из modules/challenge/pools/en.json (рассказ целиком и вопрос к нему,
    файлы audio/en/ch-<id>-story.mp3 и audio/en/ch-<id>-q.mp3).
Файлы кладутся в audio/en/<текст>.mp3, имя файла строится так же, как ключ в приложении
(core/speech.js): «ice cream» -> ice-cream.mp3, «The cat sleeps.» -> the-cat-sleeps.mp3.
Уже созданные файлы пропускаются, поэтому после добавления слов достаточно запустить скрипт снова.
Заодно скрипт обновляет списки файлов в манифестах английских модулей (для работы без интернета).

Установка: pip install edge-tts truststore  (если pip ругается на сертификат — добавьте
--use-feature=truststore после установки truststore). Проверка сертификатов идёт через
системное хранилище Windows.

Запуск:
    python tools/make_audio.py

Скрипту нужен интернет: он отправляет короткие тексты («cat», «red cat», «The cat sleeps.»…) в сервис
синтеза речи Microsoft Edge и сохраняет ответ.
"""
import asyncio
import json
import re
import sys
from pathlib import Path

try:
    import truststore  # использовать сертификаты Windows (нужно, если антивирус/прокси подменяет их)

    truststore.inject_into_ssl()
except ImportError:
    pass

import edge_tts

VOICE = "en-GB-SoniaNeural"
RATE = "-10%"  # чуть медленнее обычного, как для ребёнка
PARALLEL = 4  # сколько файлов создаётся одновременно

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "modules"
WORDS = MODULES / "english-words" / "words.json"
PHRASES = MODULES / "english-phrases" / "phrases.json"
SENTENCES = MODULES / "english-sentences" / "sentences.json"
CHALLENGE = MODULES / "challenge" / "pools" / "en.json"
OUT = ROOT / "audio" / "en"


def slug(text: str) -> str:
    """То же правило, что keyFrom() в core/speech.js."""
    return re.sub(r"[^\w]+", "-", text.lower(), flags=re.UNICODE).strip("-")


def words() -> list[str]:
    topics = json.loads(WORDS.read_text(encoding="utf-8"))["topics"]
    return [w["en"] for t in topics for w in t["words"]]


def phrases() -> list[str]:
    data = json.loads(PHRASES.read_text(encoding="utf-8"))
    return [f"{color} {noun}" for color in data["colors"] for noun in data["nouns"]]


def sentences() -> list[str]:
    return [s["en"] for s in json.loads(SENTENCES.read_text(encoding="utf-8"))["sentences"]]


def challenge() -> dict[str, str]:
    """Рассказы сложного задания: имя файла (без .mp3) -> что произносится."""
    out = {}
    for story in json.loads(CHALLENGE.read_text(encoding="utf-8"))["stories"]:
        out[slug(f"ch-{story['id']}-story")] = " ".join(story["sentences"])
        out[slug(f"ch-{story['id']}-q")] = story["question"]
    return out


# Манифест модуля -> (его собственные файлы, имена озвучки, которые он использует). Озвучка добавляется после файлов.
MANIFESTS = {
    MODULES / "english-words" / "manifest.json": (["texts.js", "words.json"], lambda: [slug(t) for t in words()]),
    MODULES / "english-quiz" / "manifest.json": (["texts.js", "../english-words/words.json"], lambda: [slug(t) for t in words()]),
    MODULES / "english-phrases" / "manifest.json": (["texts.js", "phrases.json", "../english-words/words.json"], lambda: [slug(t) for t in phrases()]),
    MODULES / "english-sentences" / "manifest.json": (["texts.js", "sentences.json"], lambda: [slug(t) for t in sentences()]),
    MODULES / "challenge" / "manifest.json": (
        ["texts.js", "pools/ru.js", "pools/de.js", "pools/math.js", "pools/orientation.js", "pools/en.json"],
        lambda: list(challenge()),
    ),
}


async def make(name: str, text: str) -> str:
    target = OUT / f"{name}.mp3"
    if target.exists():
        return "есть"
    OUT.mkdir(parents=True, exist_ok=True)
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(target))
    return f"{target.stat().st_size // 1024} КБ"


def update_manifests() -> None:
    """Списки файлов в манифестах: по ним приложение сохраняет озвучку для работы без интернета."""
    for path, (base, names) in MANIFESTS.items():
        if not path.exists():
            continue
        audio = [f"../../audio/en/{n}.mp3" for n in names() if (OUT / f"{n}.mp3").exists()]
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["files"] = base + audio
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def main() -> int:
    items = {slug(t): t for t in [*words(), *phrases(), *sentences()]}  # без повторов, порядок сохраняется
    items.update(challenge())
    texts = list(items)
    failed = 0
    gate = asyncio.Semaphore(PARALLEL)

    async def one(name: str) -> None:
        nonlocal failed
        async with gate:
            try:
                result = await make(name, items[name])
                if result != "есть":
                    print(f"{name:40} {result}")
            except Exception as err:  # сеть, голос недоступен и т. п.
                failed += 1
                print(f"{name:40} ОШИБКА: {err}")

    await asyncio.gather(*(one(t) for t in texts))
    update_manifests()
    print(f"\nГотово: {len(texts) - failed} из {len(texts)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # чтобы русские буквы не превращались в кракозябры в консоли Windows
    sys.exit(asyncio.run(main()))
