# Gemini вручную: слои главного экрана по макету C-1

Макет одобрен: `design/ai-ref/main-menu-C1.webp` (вариант C — яркий сказочный мир + бумажная книга с закладками).
Из картинки целиком экран не делается: фон и несколько предметов — картинки, всё остальное (бумажная панель, закладки,
карточки, значки, облачко, счётчики, кнопки, полоса прогресса, все надписи) собирается кодом.

## Как делать

1. Открыть **тот же чат Gemini**, где получился C-1 (так он держит стиль). Если чата уже нет — новый чат, приложить
   `D:\08 Alisa app\.art-raw\gemini\attach\3-maket-C1.png` и начать каждый запрос со слов
   «In the exact style of the attached image, …».
2. Отправлять запросы ниже по одному, каждую картинку скачивать в `D:\08 Alisa app\.art-raw\gemini\inbox\`
   с указанным именем (расширение любое — `.png`, `.jpg`, `.jfif`).
3. Если на картинке что-то лишнее (тень, трава под пеньком, текст) — в том же чате: «Remove …, keep everything else».
4. Написать Claude Code «слои в inbox».

Предметы (2–5) просим на ровном светло-сером фоне: локальный ПК его вырезает чисто (белый фон хуже — теряются светлые края).

## 1. Фон — `bg-1`

```text
Now make the background of this screen only, in exactly the same style and colours: the same sunny fairy-tale meadow, trees on both sides, the pink castle on the left in the distance, blue sky with fluffy clouds, flowers, a soft stone path in the lower left. Remove everything else: no puppy, no bone, no tree stump, no wooden sign, no wooden panel, no paper book, no bookmarks, no buttons, no counters, no speech bubble and no text at all. The right half will be covered by a menu, so keep it calm and simple there (sky, soft trees, meadow). Leave an empty grassy spot in the lower left-centre where a puppy will sit. Landscape 16:9, as large as possible (at least 1920×1080).
```

## 2. Пенёк — `stump`

```text
Draw only the tree stump from this screen, in exactly the same style: a short cut tree stump with a few grass blades at its base, seen slightly from above, the top is a light wooden cut with rings. Nothing on top of it — no bone and no glow. One single object, centred, on a plain flat solid light grey background (#C8C8C8). No shadow on the background, no other objects, no text. Square image.
```

## 3. Косточка — `bone`

```text
Draw only the bone from this screen, in exactly the same style: one cute cartoon dog bone, cream white with soft shading and a clean brown outline, lying horizontally. No glow, no sparkles, no stump. One single object, centred, on a plain flat solid light grey background (#C8C8C8). No shadow on the background, no other objects, no text. Square image.
```

## 4. Деревянная табличка — `sign`

```text
Draw only the wooden sign from the top left of this screen, in exactly the same style: a horizontal light wooden plank sign with rounded corners and a slightly wavy shape, a brown paw print on the left side, and an EMPTY space on the right for a title — no letters, no text at all. One single object, centred, on a plain flat solid light grey background (#C8C8C8). No shadow on the background, no other objects. Wide landscape image.
```

## 5. Деревянная доска для дорожки — `plank`

```text
Draw only the long wooden panel from the bottom left of this screen, in exactly the same style: a wide light wooden board with rounded corners and a darker wooden frame, completely EMPTY — no progress bar, no star, no text, no letters. One single object, centred, on a plain flat solid light grey background (#C8C8C8). No shadow on the background, no other objects. Very wide landscape image (about 4:1).
```

## По желанию — собака-проводник из макета — `dog-guide`

Нужна, только если решим рисовать картинкой собаку-проводника Бобика (пока у ребёнка нет своей собаки). Купленная собака
ребёнка (порода, окрас, наряды) остаётся нарисованной кодом.

```text
Draw only the puppy from this screen, in exactly the same style and colours, the same pose: sitting, facing slightly right, happy, with the pink bow and yellow collar. One single character, centred, full body, on a plain flat solid light grey background (#C8C8C8). No shadow on the background, no grass, no other objects, no text. Square image.
```
