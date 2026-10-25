"""Создаёт озвучку английских слов голосом Sonia (британский английский).

Слова берутся из modules/english-words/words.json. Файлы кладутся в audio/en/<слово>.mp3,
имя файла строится так же, как ключ в приложении (core/speech.js): «ice cream» -> ice-cream.mp3.
Уже созданные файлы пропускаются, поэтому после добавления слов достаточно запустить скрипт снова.
Заодно скрипт обновляет список файлов в modules/english-words/manifest.json (для работы без интернета).

Установка: pip install edge-tts truststore  (если pip ругается на сертификат — добавьте
--use-feature=truststore после установки truststore). Проверка сертификатов идёт через
системное хранилище Windows.

Запуск:
    python tools/make_audio.py

Скрипту нужен интернет: он отправляет короткие слова («cat», «ice cream»…) в сервис синтеза речи
Microsoft Edge и сохраняет ответ.
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

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "modules" / "english-words" / "words.json"
MANIFEST = ROOT / "modules" / "english-words" / "manifest.json"
OUT = ROOT / "audio" / "en"


def slug(text: str) -> str:
    """То же правило, что keyFrom() в core/speech.js."""
    return re.sub(r"[^\w]+", "-", text.lower(), flags=re.UNICODE).strip("-")


def all_words() -> list[str]:
    topics = json.loads(WORDS.read_text(encoding="utf-8"))["topics"]
    return [w["en"] for t in topics for w in t["words"]]


async def make(text: str) -> str:
    target = OUT / f"{slug(text)}.mp3"
    if target.exists():
        return "есть"
    OUT.mkdir(parents=True, exist_ok=True)
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(target))
    return f"{target.stat().st_size // 1024} КБ"


def update_manifest(words: list[str]) -> None:
    """Список файлов в манифесте: по нему приложение сохраняет озвучку для работы без интернета."""
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    base = ["texts.js", "words.json"]
    manifest["files"] = base + [f"../../audio/en/{slug(w)}.mp3" for w in words if (OUT / f"{slug(w)}.mp3").exists()]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def main() -> int:
    words = all_words()
    failed = 0
    for text in words:
        try:
            print(f"{text:12} {await make(text)}")
        except Exception as err:  # сеть, голос недоступен и т. п.
            failed += 1
            print(f"{text:12} ОШИБКА: {err}")
    update_manifest(words)
    print(f"\nГотово: {len(words) - failed} из {len(words)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # чтобы русские буквы не превращались в кракозябры в консоли Windows
    sys.exit(asyncio.run(main()))
