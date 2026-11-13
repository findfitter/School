# Gemini вручную: наклейки альбомов (9 листов по 12)

Лист «Питомцы» уже сделан и подключён (`stickers-pets-1`). Здесь — остальные альбомы `ALBUMS` из `core/rewards.js`.
Порядок на листе = порядок в альбоме. «Первые наклейки» — 24 штуки, поэтому два листа (`base-a`, `base-b`).
Супер-наклейки миров — отдельный файл `super-stickers.md`.

## Шаги

1. Новый чат в Gemini (один лист — один чат), создание картинки.
2. Приложить `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png`.
3. Вставить **общее начало** и сразу под ним **список одного листа** — одним сообщением.
4. Сохранить в `D:\08 Alisa app\.art-raw\gemini\inbox\` как `stickers-<лист>-1.png` (имя листа — в заголовке:
   `stickers-base-a-1.png`, `stickers-princess-1.png` …).
5. Если наклейки слиплись, вылезли за клетку или появились надписи — в том же чате: «Keep exactly 4 columns and
   3 rows, more space between stickers, no text» и сохранить как `-2`.
6. Можно копить несколько листов и потом написать Claude Code «листы в inbox».

## Общее начало (для всех листов)

```text
Create a sticker sheet in exactly the same style as the attached image: cute kawaii children's stickers, thick clean dark brown outlines, soft warm colors with gentle shading, big shiny eyes with highlights on characters, happy friendly faces.

Layout: a neat grid of exactly 12 stickers — 4 columns and 3 rows, evenly spaced, each sticker centred in its own cell, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. No shadows on the background, no frames, no text, no numbers, no letters anywhere (also not on objects), no extra hearts, paw prints or sparkles between the stickers.

Each sticker is one single subject, complete and not cut off, in its own natural colours (do not make everything golden). Landscape 4:3 image, high resolution.
```

## base-a — «Первые наклейки», 1–12

```text
Row 1, left to right:
1. a white puppy with brown ear patches, sitting
2. a ginger orange kitten, sitting
3. a light grey bunny holding an orange carrot
4. an orange fox with a white chest and white tail tip, sitting
Row 2, left to right:
5. a brown bear cub, sitting
6. a black and white panda cub, sitting
7. a grey koala hugging a small eucalyptus branch
8. a lion cub with a small orange mane
Row 3, left to right:
9. a green frog sitting, with big eyes
10. a brown monkey with a beige face and a long tail
11. a little black and white penguin chick with yellow feet
12. a brown owl with big round eyes
```

## base-b — «Первые наклейки», 13–24

```text
Row 1, left to right:
1. an orange and pink butterfly with open wings
2. a little green turtle with a brown patterned shell
3. a purple octopus waving its tentacles
4. a blue-grey dolphin jumping
Row 2, left to right:
5. a white unicorn with a pink and purple mane and a golden horn
6. a fuzzy yellow and black striped bee with small wings
7. a red ladybug with black spots
8. a big friendly blue whale with a small water spout
Row 3, left to right:
9. a friendly green baby dinosaur (T-rex)
10. a red and white rocket with a little flame
11. a bright rainbow arch with a fluffy white cloud at each end
12. a red strawberry with green leaves and tiny yellow seeds
```

## princess — «Принцессы и феи»

```text
Row 1, left to right:
1. a little princess with long blonde hair, a golden tiara and a pink ball gown
2. a little fairy with light purple hair, a lilac dress and shimmering transparent wings
3. a little mermaid with long red hair and a teal fish tail, sitting
4. a superhero girl with a red cape and a blue costume, flying pose
Row 2, left to right:
5. a golden royal crown with red and blue gems
6. a pretty pink princess dress on a little hanger
7. a sparkly pink high-heel princess shoe
8. a golden ring with a big shiny diamond
Row 3, left to right:
9. a pink lipstick tube
10. a big pink satin ribbon bow
11. a purple crystal ball with a swirl of light inside, on a golden stand
12. a friendly girl genie with a ponytail, coming out of a golden magic lamp
```

## unicorn — «Единороги и радуга»

```text
Row 1, left to right:
1. a white carousel horse with a pink saddle on a golden pole
2. a fluffy white cloud with a cute smiling face
3. a yellow star with a cute smiling face
4. a big glowing golden star with rays
Row 2, left to right:
5. a little golden star swirling with a curly sparkly trail
6. a cluster of three golden four-pointed sparkles of different sizes
7. a shiny pink heart with little sparkles and a cute smiling face
8. a glossy purple heart with a cute smiling face
Row 3, left to right:
9. a glossy blue heart with a cute smiling face
10. a glossy yellow heart with a cute smiling face
11. a glossy green heart with a cute smiling face
12. a glossy orange heart with a cute smiling face
```

## sweets — «Сладости»

```text
Row 1, left to right:
1. a big round swirl lollipop in pink and white on a stick
2. a wrapped candy in shiny purple paper with twisted ends
3. a chocolate bar in a red wrapper, partly unwrapped
4. a doughnut with chocolate glaze and colourful sprinkles
Row 2, left to right:
5. a round cookie with chocolate chips
6. a birthday cake with white frosting, pink drips and three candles
7. a cupcake with a swirl of pink frosting and a cherry on top
8. a soft-serve vanilla ice cream in a waffle cone
Row 3, left to right:
9. a slice of strawberry shortcake with cream
10. two shiny red cherries on stems with a green leaf
11. a honey pot with golden honey dripping and a honey dipper
12. a stick with three round sweet dumplings: pink, white and green
```

## flowers — «Цветы и бабочки»

```text
Row 1, left to right:
1. one pink tulip with green leaves
2. one red rose with green leaves
3. a big yellow sunflower with a brown centre
4. a small yellow daisy flower with a cute face
Row 2, left to right:
5. a pink cherry blossom flower
6. a bouquet of colourful flowers tied with a ribbon
7. a big red hibiscus flower
8. a green four-leaf clover
Row 3, left to right:
9. a green sprig of herbs with several leaves
10. a red toadstool mushroom with white spots
11. a cute green caterpillar with a smiling face
12. a cute green grasshopper (cricket)
```

## space — «Космос»

```text
Row 1, left to right:
1. a yellow crescent moon with a sleepy smiling face
2. a purple planet with a pink ring around it
3. a cute little green alien with big black eyes and antennae
4. a silver flying saucer with coloured lights
Row 2, left to right:
5. a blue-white comet with a glowing tail
6. planet Earth with blue oceans and green continents
7. a smiling yellow sun with rays
8. a telescope on a wooden tripod
Row 3, left to right:
9. a boy astronaut in a white spacesuit with a round helmet, waving
10. a small satellite with blue solar panels
11. a round patch of dark blue starry night sky with a purple swirl of the Milky Way
12. a shooting star with a long sparkly golden tail
```

## transport — «Транспорт»

```text
Row 1, left to right:
1. a small red car
2. a yellow taxi car (no letters)
3. a big yellow school bus (no letters)
4. a red fire engine with a ladder
Row 2, left to right:
5. a white ambulance with a red stripe and a blue light (no letters)
6. a green tractor with big wheels
7. a steam train locomotive with smoke puffs
8. a white and blue passenger aeroplane
Row 3, left to right:
9. a red helicopter
10. a little sailing boat with white sails
11. a blue bicycle
12. a big passenger ship with red funnels
```

## party — «Праздник»

```text
Row 1, left to right:
1. one red balloon on a string
2. a wrapped present box with a big ribbon bow
3. a party popper with colourful confetti bursting out
4. a round confetti ball with colourful streamers
Row 2, left to right:
5. two theatre masks, one happy and one sad, gold and purple
6. a big Ferris wheel with colourful cabins
7. a red and white striped circus tent with little flags
8. a painter's palette with blobs of paint and a brush
Row 3, left to right:
9. a few colourful music notes
10. a brown violin with a bow
11. a red drum with drumsticks
12. a small piano keyboard
```

## Что дальше

Claude Code режет каждый лист (`tools/art/sheet_slice.py <лист> <альбом>`, для «Первых наклеек» — `--part 1` / `--part 2`),
вырезает фон, добавляет тень, обновляет `images/index.json` и собирает лист «эмодзи ↔ наклейка» для проверки.
