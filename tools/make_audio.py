"""Создаёт озвучку английских слов, сочетаний и предложений голосом Sonia (британский английский).

Что озвучивается:
  * слова из modules/english-words/words.json (модули english-words и english-quiz);
  * сочетания «цвет + предмет» из modules/english-phrases/phrases.json (красный кот -> «red cat»);
  * предложения из modules/english-sentences/sentences.json.
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


# Манифест модуля -> (его собственные файлы, какие тексты он озвучивает). Озвучка добавляется после файлов.
MANIFESTS = {
    MODULES / "english-words" / "manifest.json": (["texts.js", "words.json"], words),
    MODULES / "english-quiz" / "manifest.json": (["texts.js", "../english-words/words.json"], words),
    MODULES / "english-phrases" / "manifest.json": (["texts.js", "phrases.json", "../english-words/words.json"], phrases),
    MODULES / "english-sentences" / "manifest.json": (["texts.js", "sentences.json"], sentences),
}


async def make(text: str) -> str:
    target = OUT / f"{slug(text)}.mp3"
    if target.exists():
        return "есть"
    OUT.mkdir(parents=True, exist_ok=True)
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(target))
    return f"{target.stat().st_size // 1024} КБ"


def update_manifests() -> None:
    """Списки файлов в манифестах: по ним приложение сохраняет озвучку для работы без интернета."""
    for path, (base, texts) in MANIFESTS.items():
        if not path.exists():
            continue
        audio = [f"../../audio/en/{slug(t)}.mp3" for t in texts() if (OUT / f"{slug(t)}.mp3").exists()]
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["files"] = base + audio
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def main() -> int:
    texts = list(dict.fromkeys([*words(), *phrases(), *sentences()]))  # без повторов, порядок сохраняется
    failed = 0
    gate = asyncio.Semaphore(PARALLEL)

    async def one(text: str) -> None:
        nonlocal failed
        async with gate:
            try:
                result = await make(text)
                if result != "есть":
                    print(f"{text:34} {result}")
            except Exception as err:  # сеть, голос недоступен и т. п.
                failed += 1
                print(f"{text:34} ОШИБКА: {err}")

    await asyncio.gather(*(one(t) for t in texts))
    update_manifests()
    print(f"\nГотово: {len(texts) - failed} из {len(texts)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # чтобы русские буквы не превращались в кракозябры в консоли Windows
    sys.exit(asyncio.run(main()))
