# Gemini вручную: Аглая для комикса (проба — первая страница)

Для первой страницы комикса нужны **3 позы Аглаи** (спит, стоит, удивлена). Рисовать только их: остальные позы — после пробы,
с этим же листом как образцом, чтобы собака не «плыла» от листа к листу.

## Шаги

1. Новый чат в Gemini, создание картинки.
2. Приложить `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png` (образец стиля — щенок-наклейка).
3. Вставить запрос ниже, отправить.
4. Скачать в `D:\08 Alisa app\.art-raw\gemini\inbox\` как **`comic-ag-poses-1.png`** (следующие попытки — `-2`, `-3`).
   Имя важно: по нему я нахожу файл, не открывая картинку.
5. Если собаки слиплись, вылезли за клетку или появились надписи — в том же чате:
   «Keep exactly 3 dogs in one row, more space between them, no text, no marks» и сохранить как следующую попытку.

## Запрос

```text
Redraw the attached puppy sticker as a new character, keeping EXACTLY its drawing style: the same cute chibi cartoon proportions (a very big round head, about as big as the whole body, a small short body, short stubby legs), the same thick clean dark brown outlines, the same flat soft cartoon colouring with very gentle shading, the same huge shiny eyes with highlights, and the same simple happy face. It must look like a cartoon sticker or a mascot, NOT a realistic dog, NOT a detailed illustration, no fur texture.

The character is a ginger whippet puppy-like dog named Aglaya. Change only these things compared with the attached puppy: her coat is a warm ginger-orange colour with a slightly lighter belly; she has small soft folded "rose" ears; a slightly slimmer, smoother body and a slightly longer, thin tail than the attached puppy. No collar, no clothes, no accessories. Keep her design identical in all three drawings.

Layout: exactly 3 drawings of the same dog in one row (3 columns, 1 row), evenly spaced, each one centred in its own third of the image, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. Do NOT draw a white border around the dog, no ground, no shadow, no frames, no text, no letters, no numbers, no hearts, no sparkles, no exclamation marks or other symbols.

Poses, left to right (all in side or three-quarter view, facing to the right):
1. Asleep: curled up in a cosy round ball, eyes closed, a tiny peaceful smile, nose tucked near her tail.
2. Standing: standing on all four legs, head up, cheerful open-mouth smile, tail raised and relaxed, looking forward.
3. Surprised: standing, eyes wide and round, mouth open in a round "O", ears lifted, one front paw slightly raised, tail stiff.

Landscape 16:9 image, high resolution.
```

Если всё равно получается «как настоящая собака»: в том же чате написать «Too realistic. Make her much cuter and more cartoonish: chibi proportions, head as big as the body, short legs, thick outlines, exactly like the attached sticker» и сохранить как следующую попытку. Если и это не помогает — убрать из запроса слово «whippet» совсем (оставить «ginger dog with small folded ears»): породу в комиксе всё равно выдают рыжий цвет, тонкий хвост и имя.

## Что дальше

Когда файл в `inbox`, скрипт режет его на 3 части, вырезает фон, добавляет тонкую кайму и сохраняет прозрачные WebP
в `modules/comic-aglaya/art/` (`tools/comic/sprites.py`), после чего поза подключается в `art.js`.

---

# Глава 1 целиком: остальные позы Аглаи и предметы

Первый лист (`comic-ag-poses-1`) уже в игре. Теперь рисуем **остальные 9 поз Аглаи одним листом 3×3** (в главе 1 нужны «нюхает» и «бежит», остальные пригодятся в главах 2–6) и **лист предметов**. Оба запроса — в тех же стилевых рамках.

## Лист 2: 9 поз Аглаи

1. Новый чат в Gemini, создание картинки.
2. Приложить **две** картинки: `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png` (стиль) и `D:\08 Alisa app\.art-raw\gemini\inbox\comic-ag-poses-1.webp` (сама Аглая — чтобы собака осталась той же).
3. Вставить запрос, отправить, сохранить как **`comic-ag-poses-2.png`** (потом `-3`, `-4`).
4. Если собаки слиплись, вылезли за клетку, появились надписи или лишние знаки — в том же чате: «Keep exactly 3 columns and 3 rows, more space between the dogs, no text, no marks, same dog as the second image».

```text
Create a new character sheet of the SAME dog as in the second attached image (a ginger dog named Aglaya), drawn in exactly the same style as both attached images: cute chibi cartoon sticker, a very big round head, a small body, short legs, thick clean dark brown outlines, flat soft colouring with very gentle shading, huge shiny eyes with highlights. Keep her design identical to the second image: the same ginger-orange coat with a lighter belly, the same small folded ears, the same face, no collar, no clothes. It must look like a cartoon sticker, NOT a realistic dog.

Layout: exactly 9 drawings of the same dog in a grid of 3 columns and 3 rows, evenly spaced, each one centred in its own cell, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. No ground, no shadows, no frames, no text, no letters, no numbers, no hearts, no sparkles, no motion lines, no exclamation marks or other symbols.

Poses, in reading order (all in side or three-quarter view, facing to the right):
Row 1:
1. Sniffing: head and nose down close to the ground, eyes focused, tail raised.
2. Running: galloping fast with all legs off the ground, ears flying back, a happy open-mouth smile.
3. Leaping: jumping high into the air, front legs stretched forward, ears up, joyful face.
Row 2:
4. Cold: standing hunched with shoulders up, tail tucked between her legs, eyes squeezed shut, teeth gritted, trembling.
5. Sad: sitting down, head low, ears drooping, big watery sad eyes, tail on the ground.
6. Laughing: head tilted back a little, eyes squeezed shut with joy, mouth wide open laughing.
Row 3:
7. Proud: standing with chest out and head held high, a confident smug smile, tail up.
8. Growling: standing with a determined frown, narrowed eyes, ears back, showing tiny cute teeth - funny and cute, not scary.
9. Muddy: standing, covered in brown mud splatters and blotches over her ginger coat, an annoyed grumpy face, ears drooping.

Landscape 16:9 image, high resolution.
```

Имена поз в порядке листа: `sniff,run,leap,shiver,sad,laugh,proud,growl,muddy`.

## Лист предметов (5 штук в один ряд)

1. Новый чат, приложить `4-obrazec-naklejki.png`.
2. Вставить запрос, сохранить как **`comic-props-1.png`**.

```text
Create a sheet of 5 small objects in exactly the same style as the attached image: cute kawaii children's storybook sticker style, thick clean dark brown outlines, soft warm colors with gentle shading.

Layout: the 5 objects in one single row, evenly spaced, each one centred in its own fifth of the image, with wide empty space between the objects. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. No shadows, no frames, no text, no letters, no numbers, no hearts, no sparkles.

Objects, left to right:
1. A bright yellow ball with a green stripe around it.
2. One big fluffy white goose feather, lying at a slight angle.
3. A folded cosy red-and-white checkered blanket with small fringes on the ends.
4. A trail of three webbed goose footprints (brown-grey, each print with three wide toes joined by webbing) drawn close together in a short diagonal line, as one single group.
5. A flat blue puddle of water with a little white highlight on it, seen slightly from above.

Landscape 16:9 image, high resolution.
```

Имена в порядке листа: `ball,feather,plaid,tracks,puddle`.

## Что дальше

Файлы в `inbox`, я режу: `build_art.py sprites … ag sniff,run,…` и `build_art.py props …`, подключаю в `art.js` и проверяю главу 1.

---

# Глава 2: Гордей и Квак

В главе 2 нужны Гордей (`proud`, `sneaky`, `waddle`) и лягушка Квак (`stare`, `hide`); фон пруда, Аглая и предметы уже есть. Рисуем сразу все позы Гордея на одном листе (в главах 3–6 пригодятся остальные), лягушку отдельным маленьким листом.

## Лист: Гордей (12 поз, 3 столбца × 4 ряда)

1. Новый чат в Gemini. Приложить **две** картинки: образец стиля `.art-raw\gemini\attach\4-obrazec-naklejki.png` и лист Аглаи `.art-raw\gemini\inbox\comic-ag-poses-2.jfif` (чтобы стиль и толщина контуров совпали).
2. Сохранить как **`comic-gor-poses-1.png`** в `.art-raw\gemini\inbox\` (потом `-2`, `-3`).

```text
Create a character sheet of a new character in exactly the same drawing style as both attached images: cute chibi cartoon sticker, thick clean dark brown outlines, flat soft colouring with very gentle shading, huge shiny eyes with highlights, a very big head. The character is a big, pompous, funny white goose named Gordey: a chubby round white body, a long neck, a bright orange beak and bright orange webbed feet, a small tuft of white feathers on top of his head, and proud, slightly arrogant eyebrows. No clothes, no accessories. Keep his design identical in all twelve drawings. It must look like a cartoon sticker, NOT a realistic goose.

Layout: exactly 12 drawings of the same goose in a grid of 3 columns and 4 rows, evenly spaced, each one centred in its own cell, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. No ground, no shadows, no frames, no text, no letters, no numbers, no hearts, no sparkles, no motion lines, no exclamation marks or other symbols.

Poses in reading order (all in side or three-quarter view, facing to the right):
Row 1:
1. Proud: chest puffed out, head high, beak up, eyes half closed with a smug look, wings held behind him like a king.
2. Honking: neck stretched forward, beak wide open in a loud honk.
3. Hissing: neck low and forward, beak open showing a little tongue, wings slightly spread, angry but still cute.
Row 2:
4. Waddling: walking with a waddle, one webbed foot lifted mid-step, a confident face.
5. Flapping: wings spread wide, flapping and hopping just above the ground.
6. Sad: head low, beak pointing down, wings drooping, big watery sad eyes.
Row 3:
7. Scared: frozen with fear, huge round eyes, feathers puffed up, beak open in a gasp.
8. Laughing: head thrown back, eyes squeezed shut, beak wide open laughing out loud.
9. Sneaky: crouched low with narrowed eyes and a sly grin, one wing held up beside his beak as if whispering a secret plan.
Row 4:
10. Wet: soaking wet and bedraggled, feathers flat and dripping, a grumpy surprised face.
11. Cheering: wings raised high in joy, a huge happy smile, sparkling eyes.
12. Thinking: one wing under his beak, eyes looking up, a thoughtful face.

Landscape 16:9 image, high resolution.
```

Имена поз в порядке листа: `proud,honk,hiss,waddle,flap,sad,scared,laugh,sneaky,wet,cheer,thinking`.

## Лист: лягушка Квак (2 позы в ряд)

1. Новый чат. Приложить образец стиля `4-obrazec-naklejki.png`.
2. Сохранить как **`comic-frog-1.png`**.

```text
Create a character sheet of a new character in exactly the same drawing style as the attached image: cute chibi cartoon sticker, thick clean dark brown outlines, flat soft colouring with very gentle shading, a very big head and huge shiny eyes. The character is a small green frog named Kvak with a pale yellow-green belly, very big round eyes, and a dry, deadpan, unimpressed, slightly sarcastic expression. No clothes, no accessories. Keep his design identical in both drawings. It must look like a cartoon sticker, NOT a realistic frog.

Layout: exactly 2 drawings in one row (2 columns, 1 row), evenly spaced, each centred in its own half of the image, about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. No ground, no water, no shadows, no frames, no text, no letters, no numbers, no hearts, no sparkles, no motion lines, no exclamation marks or other symbols.

Poses, left to right (side or three-quarter view, facing to the right):
1. Sitting on a small round green lily pad (the lily pad is part of the drawing), looking straight ahead with half-closed, bored, deadpan eyes and a flat mouth.
2. Hiding: crouching low behind a big green leaf (the leaf is part of the drawing), only the top of his head and his two nervous wide eyes peeking over the leaf.

Landscape 16:9 image, high resolution.
```

Имена поз: `stare,hide`.

## Что дальше

Файлы в `inbox`: я режу (`build_art.py sprites … gor …` и `… frog stare,hide`), подгоняю размеры героев друг к другу (гусь крупнее собаки, лягушка мельче), подключаю и прохожу главу 2.
