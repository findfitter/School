# Gemini вручную: макет главного экрана

Это макет-картинка для обсуждения, а не готовый экран. Экран потом собирается в HTML/CSS, надписи берутся из `core/strings.js`.
Имя и фото ребёнка в запросы не вставлять: запросы уходят в Google.

## Шаги

1. Открыть https://gemini.google.com (или Google AI Studio — https://aistudio.google.com, там справа можно выбрать соотношение сторон 16:9).
2. В Gemini выбрать создание картинок (кнопка «Создать изображение» / значок банана в «Инструментах»).
3. Приложить картинки из папки `D:\08 Alisa app\.art-raw\gemini\attach\` (какие — написано у каждого варианта):
   - `1-obrazec.png` — образец главного экрана;
   - `2-igra-seychas.png` — как игра выглядит сейчас.
4. Вставить текст запроса (блок ниже, целиком) и отправить.
5. Скачать картинку (кнопка «Скачать» на картинке, полный размер) в `D:\08 Alisa app\.art-raw\gemini\inbox\` с именем `A-1.png`, `A-2.png`, `B-1.png`… (буква — вариант, цифра — попытка). Если вариант понравился, но с ошибкой — можно написать в том же чате «исправь: …», это будет следующая попытка.
6. Написать Claude Code «картинки в inbox» — соберу лист сравнения с образцом.

Если в настройках Gemini есть переключатель видимого водяного знака — можно выключить; если нет, не страшно: это только макет.
Если Gemini сделал квадрат или «портрет» — написать в том же чате: «Make it landscape 16:9, 1280×720».

## Вариант A — как в образце (яркий мультяшный)

Приложить: `1-obrazec.png`.

```text
Redesign the attached main menu screen of a children's learning game as a clean, high-quality version in the same style: bright kawaii cartoon game art, soft rounded shapes, warm pastel colors, polished mobile-game UI. Landscape 16:9, 1280×720 (Chromebook screen). Keep the same layout:
- Background: sunny fairy-tale meadow, green trees, flowers, a pink castle with towers in the distance, blue sky with fluffy clouds.
- Top left: a wooden sign with a paw print and the text «Моя школа».
- Top centre: a star counter with the number «120».
- Top right: two round buttons — a gift and a settings gear.
- Left: a cute light-tan puppy with a pink bow and a yellow collar sitting on the grass; above it a white speech bubble with the text «Ждёт сложная задача с косточкой!».
- Next to the puppy: a glowing golden bone on a tree stump.
- Bottom left: a rounded panel with a bone icon, the title «Дорожка к косточке», the text «14 из 25 звёзд», a yellow progress bar about half full with a star, and the small line «Ещё 11 звёзд — и откроется сложная задача с косточкой!».
- Right: a large cream paper panel like an open book page, a pink ribbon on top with «Глава первая», the heading «Математика» and small text «7 заданий». Below it a grid of 7 rounded cards in two columns; each card has a round coloured badge with a short sign, a title and three small stars:
  «+10» «Сложение до 10»; «+20» «Сложение до 20»; «−10» «Вычитание до 10»; «−20» «Вычитание до 20»; «5>3» «Сравни числа»; «2+?» «Задачи»; «€» «Деньги».
All text must be in Russian exactly as written above, correctly spelled, large and readable, Cyrillic letters. No other text, no logos, no watermark. Big touch-friendly elements for a 7-year-old.
```

## Вариант B — акварельная «сказочная книжка» (как игра сейчас)

Приложить: `1-obrazec.png` и `2-igra-seychas.png`.

```text
Two images are attached: the first is a layout reference for the main menu of a children's learning game, the second shows the current visual style of the game (a storybook open on a table). Create a new main menu screen that keeps the layout and content of the first image but is painted in a gentle storybook style: hand-painted watercolor on textured paper, thin brown ink outlines, soft muted pastel colors, like a children's picture book. Landscape 16:9, 1280×720.
- The whole screen is a big open storybook lying on a light table. Left page: a watercolor illustration of a meadow with trees and a small pink castle far away, a cute light-tan puppy with a pink bow sitting in it, a speech bubble «Ждёт сложная задача с косточкой!», a bone on a tree stump with a soft glow, and a dotted path leading to it. Under the picture the handwritten title «Дорожка к косточке», «14 из 25 звёзд» and a thin progress bar about half full.
- Top of the left page, handwritten: «Моя школа».
- Right page: fabric bookmark ribbons hanging from the top edge (five colours), a small handwritten «Глава первая», the big handwritten heading «Математика» and «7 заданий». Below, 7 paper cards with a strip of tape on top, in two columns; each card has a round watercolor badge, a title and three small outline stars:
  «+10» «Сложение до 10»; «+20» «Сложение до 20»; «−10» «Вычитание до 10»; «−20» «Вычитание до 20»; «5>3» «Сравни числа»; «2+?» «Задачи»; «€» «Деньги».
- Above the book, top right: small paper buttons «Моя собака» and «Наклейки», a star counter «120».
All text in Russian exactly as written, correctly spelled, readable Cyrillic, a friendly handwritten font. No other text, no watermark. Calm, cosy, not too busy; large touch-friendly cards for a 7-year-old.
```

## Вариант C — смесь: яркий сказочный мир + настоящая книга с закладками

Приложить: `1-obrazec.png`.

```text
Using the attached image as a layout reference, create a main menu screen for a children's learning game that mixes two styles: the background and the puppy are bright, colourful cartoon (sunny meadow, trees, flowers, a pink castle in the distance, blue sky), while the menu on the right is a real open storybook made of cream paper with soft watercolor details. Landscape 16:9, 1280×720.
- Top left: a wooden sign with a paw print, text «Моя школа». Top right: a star counter «120», and two rounded buttons «Моя собака» and «Наклейки».
- Left: a cute light-tan puppy with a pink bow and a yellow collar sitting on the grass, a white speech bubble «Ждёт сложная задача с косточкой!», a glowing golden bone on a tree stump.
- Bottom left: a wooden or paper panel «Дорожка к косточке», «14 из 25 звёзд», a yellow progress bar about half full.
- Right: the open book. Along its top edge five colourful fabric bookmark tabs with short signs «1+2», «↻», «Аа», «Dd», «Hi» (chapters: maths, spatial thinking, Russian, German, English); the first tab is pulled out. On the page: a ribbon «Глава первая», heading «Математика», small «7 заданий», and 7 rounded paper cards in two columns, each with a round coloured badge, a title and three small stars:
  «+10» «Сложение до 10»; «+20» «Сложение до 20»; «−10» «Вычитание до 10»; «−20» «Вычитание до 20»; «5>3» «Сравни числа»; «2+?» «Задачи»; «€» «Деньги».
All text exactly as written (Russian Cyrillic, plus Latin «Dd», «Hi»), correctly spelled and readable. No other text, no watermark. Large touch-friendly elements for a 7-year-old.
```

## Если вариант понравится — фон без интерфейса (потом, по желанию)

В том же чате, где получился понравившийся макет:

```text
Now make the same scene as an empty background only: the same meadow, trees, castle and sky in the same style, landscape 16:9, 1280×720 — without the puppy, the bone, the stump, the book, panels, buttons and any text. Leave the right half calm and simple so a menu can be placed on top of it.
```
