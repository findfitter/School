# Gemini вручную: супер-наклейки миров (8 листов по 12)

Супер-наклейки — предметы миров (`WORLDS` в `core/rewards.js`): 8 миров × 12. Один мир = один лист 4×3, порядок на
листе = порядок предметов мира. Стиль тот же, что у обычных наклеек (образец — щенок), но богаче: чуть больше деталей
и мягкого волшебного блеска внутри рисунка. Золотой ободок добавляет скрипт (`sticker_finish.py --rim gold`), его в
запросе не просим. Фон — ровный серый, без белой каймы.

## Шаги

1. Новый чат в Gemini (один мир — один чат), создание картинки.
2. Приложить `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png`.
3. Вставить **общее начало** и сразу под ним **список одного мира** (одним сообщением).
4. Сохранить в `D:\08 Alisa app\.art-raw\gemini\inbox\` как `super-<мир>-1.png` (имя мира — в заголовке ниже: `super-fairy-1.png` …).
5. Если наклейки слиплись, появились надписи или рамки — в том же чате: «Keep exactly 4 columns and 3 rows, more space
   between stickers, no text, no white borders» и сохранить как `-2`.

## Общее начало (для всех миров)

```text
Create a sheet of 12 special "super stickers" in exactly the same style as the attached image: cute kawaii children's stickers, thick clean dark brown outlines, soft rich colors with gentle shading, big shiny eyes on characters, happy friendly faces. These are rare magical stickers, so make each one a little more detailed and festive, with a soft magical glow and a few tiny sparkles INSIDE the drawing.

Layout: a neat grid of exactly 12 stickers — 4 columns and 3 rows, evenly spaced, each sticker centred in its own cell, all about the same size, with wide empty space between them. Nothing overlaps and nothing touches the edges of the image.

Background: one plain flat solid light grey colour (#C8C8C8) everywhere. Do NOT draw a white sticker border or outline around the stickers, no shadows on the background, no frames, no text, no numbers, no letters anywhere (also not on objects), no decorations between the stickers.

Each sticker is one single subject, complete and not cut off, in its own natural colours (do not make everything golden). Landscape 4:3 image, high resolution.
```

## fairy — «Моя сказка»

```text
Row 1, left to right:
1. a white unicorn with a pastel rainbow mane and tail and a golden spiral horn
2. a little princess with long brown hair, a small golden tiara and a pink ball gown
3. a pink fairy-tale castle with round towers, pointed purple roofs and little flags
4. a pretty soft pink sofa with curved golden legs and two heart-shaped cushions
Row 2, left to right:
5. a bright rainbow arch with two small fluffy white clouds at its ends
6. a kind little fairy with blonde hair, a light green dress and shimmering transparent wings, holding a star wand
7. a golden royal crown with red, blue and green gems
8. a cluster of magic sparkles: three golden four-pointed stars of different sizes
Row 3, left to right:
9. a blue and purple butterfly with patterned wings
10. a blossoming garden: a small round bush with many pink cherry blossoms
11. a big pink satin ribbon bow
12. a shining pale blue fairy-tale crystal gem with facets
```

## sea — «Подводный мир»

```text
Row 1, left to right:
1. a little mermaid with long red hair and a green fish tail, sitting
2. a magic pink spiral seashell with a small white pearl
3. a smiling blue-grey dolphin jumping
4. a bright yellow and blue tropical fish
Row 2, left to right:
5. a cute pink-purple baby octopus waving its tentacles
6. a small red crab with big claws
7. a green sea turtle swimming
8. a big friendly blue whale with a small water spout
Row 3, left to right:
9. an orange starfish with a smiling face
10. a second mermaid friend with long blonde hair and a purple fish tail
11. a little wooden sailing ship with white sails
12. a round spiky yellow pufferfish
```

## forest — «Волшебный лес»

```text
Row 1, left to right:
1. a big old oak tree with a thick trunk and a round green crown
2. a cosy little wooden house in the forest with a red roof and round window
3. a gentle young deer with antlers and white spots
4. a wise brown owl with big round eyes, sitting on a branch
Row 2, left to right:
5. a forest fairy with green hair, a leaf dress and shimmering wings
6. a magic red toadstool mushroom with white spots and a tiny glow
7. a little orange fox with a white chest and tail tip, sitting
8. a red squirrel with a fluffy tail holding an acorn
Row 3, left to right:
9. a small grey-brown baby hare with long ears
10. one pink tulip flower with green leaves
11. a smiling yellow crescent moon
12. three glowing yellow-green fireflies with little wings
```

## candy — «Сладкая страна»

```text
Row 1, left to right:
1. a birthday cake with pink frosting, three candles and colourful sprinkles
2. a big round swirl lollipop in rainbow colours on a stick
3. a waffle ice cream cone with pink strawberry and white vanilla scoops
4. a cupcake with a swirl of purple frosting and a cherry on top
Row 2, left to right:
5. a pink glazed doughnut with colourful sprinkles
6. a slice of strawberry cream cake
7. a round chocolate chip cookie
8. a chocolate bar in a red wrapper, partly unwrapped (no letters)
Row 3, left to right:
9. a wrapped candy in shiny blue paper with twisted ends
10. a red strawberry with green leaves and a cute face
11. a gingerbread house with white icing on the roof and candy decorations
12. a stick with three round sweet dumplings: pink, white and green
```

## zoo — «Зоопарк»

```text
Row 1, left to right:
1. a tall yellow giraffe with brown spots
2. a baby grey elephant with big ears
3. a friendly lion with a big orange mane
4. a black and white striped zebra
Row 2, left to right:
5. a little black and white penguin with a yellow beak
6. a bright red, blue and yellow macaw parrot
7. a cheeky brown monkey with a long curly tail
8. a black and white panda sitting and holding bamboo
Row 3, left to right:
9. an orange tiger with black stripes
10. a pink flamingo standing on one leg
11. a palm tree with green leaves and coconuts
12. a bunch of three yellow bananas
```

## winter — «Зимняя сказка»

```text
Row 1, left to right:
1. a decorated Christmas tree with coloured balls, garland and a star on top
2. Father Frost (Ded Moroz): a kind old man with a long white beard, long red coat with white fur trim, red hat and a staff
3. a happy snowman with a carrot nose, red scarf and a little hat
4. a reindeer with big antlers and a red scarf
Row 2, left to right:
5. a small wooden sledge with red runners
6. a wrapped present box with a big ribbon bow
7. a cosy little house covered with snow, warm light in the windows
8. a golden Christmas star
Row 3, left to right:
9. a golden bell with a red ribbon bow
10. a red and white Christmas stocking for presents
11. a pair of warm knitted mittens, red with white snowflake pattern
12. one big light blue snowflake
```

## circus — «Цирк»

```text
Row 1, left to right:
1. a red and white striped circus tent with little flags on top
2. a funny friendly clown with a red nose, colourful curly hair and a polka-dot costume
3. a juggler child in a colourful costume juggling three balls
4. a bunch of five colourful balloons on strings
Row 2, left to right:
5. a small carousel with painted horses and a striped roof
6. a big Ferris wheel with colourful cabins
7. a burst of colourful fireworks
8. two theatre masks, one happy and one sad, gold and purple
Row 3, left to right:
9. a black magician's top hat with a red band and a white rabbit peeking out
10. a white circus pony with a pink feather plume on its head
11. a red and white striped box of popcorn
12. a brown circus bear balancing on a big striped ball
```

## space — «Космос»

```text
Row 1, left to right:
1. a red and white rocket flying up with a little flame
2. a purple planet with a pink ring around it
3. a big full moon with craters and a friendly face
4. a girl astronaut in a white spacesuit with a round helmet, waving
Row 2, left to right:
5. a cute little green alien with big black eyes and antennae
6. a silver flying saucer with coloured lights
7. a shooting star with a long sparkly golden tail
8. a blue-white comet with a glowing tail
Row 3, left to right:
9. planet Earth with blue oceans and green continents
10. a small satellite with blue solar panels
11. a telescope on a tripod
12. a smiling bright yellow sun with rays
```

## Что дальше

Когда лист в `inbox`, Claude Code режет его по сетке 4×3, вырезает фон, добавляет белую кайму, золотой ободок и тень,
сохраняет 12 WebP по 256 px и собирает лист «эмодзи ↔ супер-наклейка». Картинки, общие с обычными наклейками
(единорог, бабочка, корона…), можно брать из листов миров и для альбомов — без ободка.
