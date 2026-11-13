# Gemini вручную: замена повторяющихся наклеек (4 листа по 12)

Решение владельца (2026-11-13): обычные наклейки и супер-наклейки всегда разные. 57 эмодзи стояли и в альбомах,
и в мирах; около 45 пар выглядели почти одинаково. Миры не меняются (у предметов мира место на сцене и названия
на двух языках), меняются наклейки альбомов. Исключения — подарки дня рождения (`GIFT` в `core/birthday-data.js`:
`sweets-5` торт 🎂 и `party-1` подарок 🎁): они остаются в альбомах, а в мирах вместо них новые предметы.

## Шаги

1. Новый чат в Gemini (один лист — один чат), создание картинки.
2. Приложить `D:\08 Alisa app\.art-raw\gemini\attach\4-obrazec-naklejki.png`.
3. Вставить **общее начало** из `stickers-albums.md` и сразу под ним **список одного листа** — одним сообщением.
4. Сохранить в `D:\08 Alisa app\.art-raw\gemini\inbox\` (имя любое — лист узнаётся по картинке).
5. Если наклейки слиплись или появились надписи — в том же чате: «Keep exactly 4 columns and 3 rows, more space
   between stickers, no text».

Нарезка — `tools/art/sheet_slice.py <лист> - --border 0.03 --items "…"` (строка `--items` под каждым листом).

## new-a — новые животные («Первые наклейки»)

```text
Row 1, left to right:
1. a little brown hedgehog with a cute face and soft spines
2. a sleepy sloth hanging happily from a short branch
3. a kangaroo mother with a tiny baby peeking out of her pouch
4. a grey baby seal lying on its tummy
Row 2, left to right:
5. a blue peacock with its colourful green and blue tail fan open
6. a snail with a swirly orange shell
7. a friendly little green crocodile, smiling, sitting
8. a brown otter floating on its back holding a pebble
Row 3, left to right:
9. a white swan with an orange beak, swimming
10. a friendly little purple baby dragon with small wings
11. a small round pink-grey hippo
12. a fluffy cream-white llama with a colourful blanket on its back
```

`--items "🦔 🦥 🦘 🦭 🦚 🐌 🐊 🦦 🦢 🐲 🦛 🦙"`

## new-b — разные альбомы

```text
Row 1, left to right:
1. a grey raccoon with a striped tail and a black mask around its eyes
2. a slice of red watermelon with black seeds
3. a proud rooster with a red comb and colourful tail feathers
4. a little white baby goat
Row 2, left to right:
5. a cluster of shiny rainbow soap bubbles
6. a magic wand with a golden star on the tip and a ribbon
7. a little oval hand mirror with a pink frame
8. a pink lotus flower floating on a green lily pad
Row 3, left to right:
9. a small green cactus in a terracotta pot with a little pink flower
10. a silver microphone with a pink grip
11. a shiny golden trumpet
12. a sparkly silver disco ball
```

`--items "🦝 🍉 🐓 🐐 🫧 🪄 🪞 🪷 🌵 🎤 🎺 🪩"`

## new-c — альбом «Игрушки» (бывший альбом «Космос»)

```text
Row 1, left to right:
1. a soft brown teddy bear with a red bow tie
2. a Russian nesting doll (matryoshka) painted red with yellow flowers
3. a colourful diamond-shaped kite with a long tail of bows
4. a red yo-yo on a string
Row 2, left to right:
5. two jigsaw puzzle pieces that fit together, blue and yellow
6. a white dice with black dots
7. a colourful donkey piñata with paper fringes
8. a black and white football (soccer ball)
Row 3, left to right:
9. a pair of pink roller skates
10. a small playground slide, yellow with a blue ladder
11. a bowling pin and a blue bowling ball
12. a friendly little robot toy with round eyes and antennae
```

`--items "🧸 🪆 🪁 🪀 🧩 🎲 🪅 ⚽ 🛼 🛝 🎳 🤖"`

## new-d — «Сладости» и два предмета миров

Клетки 10 и 11 — супер-наклейки миров («Сладкая страна», «Зимняя сказка»), скрипт добавит им золотой ободок.
Клетка 12 — запас (не сохраняется), чтобы лист был полным 4×3.

```text
Row 1, left to right:
1. a caramel pudding (flan) with caramel sauce dripping down
2. a golden waffle with a strawberry and cream on top
3. a round fruit pie with a lattice top
4. a cup of shaved ice with pink and blue syrup
Row 2, left to right:
5. an ice cream sundae in a glass bowl with three scoops, cream and a cherry
6. a golden croissant
7. a strawberry milkshake in a tall glass with cream and a straw
8. a red apple covered in shiny caramel on a stick
Row 3, left to right:
9. a round honey gingerbread cookie with white icing patterns
10. a stack of pancakes with honey dripping down and a pat of butter
11. a pair of white ice skates with pink laces
12. a pink cotton candy on a stick
```

`--items "🍮 🧇 🥧 🍧 🍨 🥐 🥤 🍎 🥮 candy:🥞 winter:⛸️ -"`

## Правка `core/rewards.js` (делается в `main`, в этой ветке файл данных не правим)

Меняются только эмодзи (и у альбома «Космос» — название и значок); номера наклеек (`<альбом>-<i>`) остаются, поэтому
купленные наклейки остаются купленными, просто на их месте новая картинка.

| Альбом | Было → стало (по порядку в списке) |
|---|---|
| `BASE_STICKERS` | 🦊→🦔, 🐼→🦥, 🦁→🦘, 🐧→🦭, 🦉→🦚, 🦋→🐌, 🐢→🐊, 🐙→🦦, 🐬→🦢, 🦄→🐲, 🐳→🦛, 🚀→🦙, 🌈→🦝, 🍓→🍉 |
| `princess` | 👑→🪄, 🎀→🪞 |
| `unicorn` | ✨→🫧 |
| `pets` | 🦜→🐓, 🐇→🐐 |
| `sweets` | 🍭→🍮, 🍬→🧇, 🍫→🥧, 🍩→🍧, 🍪→🍨, 🧁→🥐, 🍦→🥤, 🍰→🍎, 🍡→🥮; значок альбома 🍭→🧇 (🎂 `sweets-5` не трогать — подарок дня рождения) |
| `flowers` | 🌷→🪷, 🍄→🌵; значок 🌷→🌻 |
| `space` | название «Космос» → «Игрушки», значок 🪐→🧸, все 12: 🧸 🪆 🪁 🪀 🧩 🎲 🪅 ⚽ 🛼 🛝 🎳 🤖 (id `space` не менять — на нём номера купленных) |
| `party` | 🎭→🎤, 🎡→🎺, 🎪→🪩 (🎁 `party-1` не трогать — подарок дня рождения) |
| мир `candy` | 🎂 «Именинный торт» → 🥞 «Блинчики с мёдом» / «Pfannkuchen mit Honig» (место и размер те же) |
| мир `winter` | 🎁 «Подарок» → ⛸️ «Коньки» / «Schlittschuhe» (место и размер те же) |

После правки (проверено расчётом на текущем `rewards.js`): в альбомах 120 разных эмодзи; общими с мирами остаются
только 12, у которых картинки нарисованы по-разному и владелец их оставил: 🐻 (медвежонок / медведь на мяче),
👸 🧚‍♀️ 🧜‍♀️ (другие внешность и наряд), 🎠 (лошадка на шесте / карусель), ⭐ (звёздочка / звезда на ёлку),
🌟 (сияющая звезда / морская звезда), 🐠 (рыба-клоун / жёлто-синяя рыбка), 🐴 (бурая лошадка / белый пони с пером),
🌸 (цветок сакуры / цветущий куст), 🚢 (лайнер / парусник), 🎈 (один шарик / связка шариков).
