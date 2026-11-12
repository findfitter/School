# Gemini вручную: лист наклеек 3×4 (проба на альбоме «Питомцы»)

Одна генерация — 12 наклеек одного альбома в едином стиле. Порядок на листе = порядок в альбоме (`ALBUM_DEFS` в
`core/rewards.js`), поэтому скрипт режет лист по сетке и сам знает, где какая наклейка.
Фон — ровный серый, без белой каймы: кайму и тень потом добавляет `tools/art/sticker_finish.py`, одинаковые для всех.

## Шаги

1. Новый чат в Gemini, создание картинки.
2. Приложить `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png` (образец стиля — щенок-наклейка).
3. Вставить запрос ниже, отправить.
4. Скачать в `D:\08 Alisa app\.art-raw\gemini\inbox\` как `stickers-pets-1.png` (следующие попытки — `-2`, `-3`).
5. Если наклейки слиплись, вылезли за клетку или появились надписи — в том же чате:
   «Keep exactly 4 columns and 3 rows, more space between stickers, no text» и сохранить как следующую попытку.

## Запрос

```text
Create a sticker sheet in exactly the same style as the attached image: cute kawaii children's stickers, thick clean dark brown outlines, soft warm colors with gentle shading, big shiny eyes with highlights, happy friendly faces.

Layout: a neat grid of exactly 12 stickers — 4 columns and 3 rows, evenly spaced, each sticker centred in its own cell, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. Do NOT draw a white sticker border or outline around the stickers, no shadows on the background, no frames, no text, no numbers, no letters, no extra hearts, paw prints or sparkles between the stickers.

Each sticker is one single cute animal, full body, with its own natural colours (do not make everything golden):
Row 1, left to right:
1. a small round golden-brown and white hamster with chubby cheeks
2. a little grey mouse with big pink ears and a long pink tail
3. a fluffy bright yellow baby chick with an orange beak
4. a bright orange tropical fish with white stripes (like a clownfish)
Row 2, left to right:
5. a green parrot with a red and blue wing tip and a yellow beak
6. a brown pony with a dark brown mane and tail
7. a fluffy white sheep with a grey face and grey legs
8. a pink piglet with a curly tail
Row 3, left to right:
9. a white rabbit with long ears and pink inner ears
10. a light brown puppy with floppy ears and a red collar
11. a grey tabby kitten with stripes and a pink nose
12. a duck with a shiny green head, white neck ring, brown body and an orange beak and feet

Landscape 4:3 image, high resolution.
```

## Что дальше

Когда лист в `inbox`, Claude Code режет его по сетке 4×3, вырезает фон, добавляет кайму и тень
(`sticker_finish.py`; у супер-наклеек — `--rim gold`), сохраняет 12 WebP по 256 px и собирает лист «эмодзи ↔ наклейка».
Если стиль понравится — такие же запросы для остальных альбомов (всего ~14 листов на 157 картинок).
