# Gemini вручную: 5 больших кадров комикса (главы 3, 5, 6)

Последнее, что рисуется в Gemini: большие кадры — целиком иллюстрация вместо «фон + герои». Все остальные герои, предметы и позы уже готовы. Фоны (мостик, гроза, сарай, луг, закат и пруд) делаю локально, вы выбираете по листам.

## Общее для всех пяти

1. Новый чат на каждый кадр. Приложить **три-четыре** картинки:
   - образец стиля `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png`;
   - Аглая: `D:\08 Alisa app\.art-raw\gemini\inbox\comic-ag-poses-2.jfif`;
   - Гордей: `D:\08 Alisa app\.art-raw\gemini\inbox\comic-gor-poses-1.jfif`;
   - только для кадра `hook` ещё Квак: `D:\08 Alisa app\.art-raw\gemini\inbox\comic-frog-1.jfif`.
2. Вставить запрос (общая часть + сцена), сохранить в `D:\08 Alisa app\.art-raw\gemini\inbox\` как **`comic-splash-<имя>.png`** (имена ниже; перегенерации — `-2`, `-3`).
3. Если появился текст, надписи или рамка — в том же чате: «No text, no letters, no speech bubbles, no frame. Same characters as in the attached sheets.» Если герои не похожи — «Make the characters look exactly like in the attached character sheets».

Общая часть (в начале каждого запроса):

```text
Create a single full-colour comic panel illustration in exactly the same drawing style as the attached images: cute chibi cartoon sticker style, thick clean dark brown outlines, flat soft colouring with very gentle shading, huge shiny eyes with highlights. The characters must look exactly like the characters in the attached character sheets (the same ginger whippet dog Aglaya and the same white goose Gordey: same colours, same faces, same proportions). Landscape 3:2 image, high resolution. IMPORTANT: no text, no letters, no speech bubbles, no sound-effect words, no frames or borders. Keep the main action in the middle; keep the top third of the picture calm (sky or plain background only) because speech bubbles will be placed there later; nothing important near the edges.
```

## 1. `comic-splash-race.png` (глава 3: гонка)

```text
Scene: a sunny village pond with water lilies and reeds. Aglaya, the ginger whippet dog, is sprinting at full speed along the grassy bank from left to right in the lower middle of the picture, ears flying back, a joyful determined smile, all four legs off the ground, little dust puffs behind her. Far behind her, tiny in the distance, Gordey the white goose is waddling along the bank, out of breath and falling behind.
```

## 2. `comic-splash-mud.png` (глава 3: грязь)

```text
Scene: a muddy path beside a big brown muddy puddle, with green grass and reeds around. Aglaya, the ginger whippet dog, stands in the middle, completely covered in brown mud splatters and blotches from her nose to her tail, with an annoyed, disgusted face and drooping ears, one front paw lifted. Mud droplets are still flying through the air. In the puddle behind her, only the white tail feathers and two orange webbed feet of a goose are sticking up out of the muddy water, as if Gordey has just fallen in head first. Funny, not scary.
```

## 3. `comic-splash-thunder.png` (глава 5: гром)

```text
Scene: the inside of a small wooden garden shed during a storm at night. In the open doorway in the background a bright white flash of lightning lights up heavy rain. In the lower middle of the picture Aglaya, the ginger whippet dog, and Gordey, the white goose, are huddled close together on a pile of hay, both jumping with fright: eyes huge, Aglaya shivering with her tail tucked between her legs, Gordey's feathers puffed up and his wings pressed to his cheeks. A folded red-and-white checkered blanket lies beside them. Dark blue moody kids'-book colours, a warm friendly glow on the two characters. Cozy and a little funny, not scary.
```

## 4. `comic-splash-play.png` (глава 6: игра)

```text
Scene: a sunny green flower meadow with a round haystack, colourful wildflowers and a bright blue sky. Aglaya, the ginger whippet dog, leaps high into the air with joy to kick a yellow ball with a green stripe, and Gordey, the white goose, jumps beside her flapping his wings with a huge happy open-beak laugh. The ball is in the air between them. Bright, cheerful and full of joy.
```

## 5. `comic-splash-hook.png` (глава 6: бабушка Гусыня)

Приложить ещё лист Квака.

```text
Scene: the edge of the village pond in warm evening light. A gigantic, very stately, stern old grandmother goose (white, much bigger than Gordey, wearing a small flowered hat and round glasses, with a little handbag hanging from her wing) marches toward the pond from the right side of the picture, looking down at everyone sternly. In the lower left tiny Gordey the white goose hides behind Aglaya, the ginger whippet dog, who stands with wide surprised eyes; Gordey's eyes are huge with fear and only his head peeks out. A small green frog (Kvak from the attached sheet) peeks out from behind a tall green reed. Funny comic mood, not scary.
```

## Что дальше

Как лягут файлы в `inbox`, я подключу их скриптом (`build_art.py splash …`), прогоню главы 3–6 и дам вам проверять.
