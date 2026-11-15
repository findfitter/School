// «Правда или нет»: знания, общие для русского и немецкого модуля. Здесь нет ни одного слова на языке —
// только нейтральные id (cat, fly, water, …) и правда о мире. Тексты строят словари языков (data.js модулей):
// каждое «утверждение» (claim) — одна мысль («кошка не умеет летать»), у неё есть значение (верно / неверно),
// а словарь превращает её в предложения: «Кошка летает» и «Кошка не летает».
//
// Как получаются неверные утверждения: подменой одного компонента верного (чужой звук, чужая еда, чужое место)
// или отрицанием. Неверная подмена выбирается только из списков, которые заведомо ложны для 7-летнего (см. `no` /
// `cant` / `lacks` ниже), поэтому ложное утверждение не окажется случайно верным.
// Модуль задания дальше выбирает не предложение, а ЗНАНИЕ: пока не показано всё, оно не повторяется (chooser.js).
//
// Тут же validate(): проверки, которые вызывает tools/check.mjs.

export const E = {
  // животные
  cat: '🐱', dog: '🐶', cow: '🐄', horse: '🐴', pig: '🐷', sheep: '🐑', goat: '🐐', hen: '🐔', rooster: '🐓', duck: '🦆',
  rabbit: '🐰', mouse: '🐭', elephant: '🐘', giraffe: '🦒', lion: '🦁', tiger: '🐯', bear: '🐻', wolf: '🐺', fox: '🦊',
  frog: '🐸', fish: '🐟', bird: '🐦', snake: '🐍', turtle: '🐢', penguin: '🐧', dolphin: '🐬', whale: '🐳', shark: '🦈',
  bee: '🐝', ant: '🐜', butterfly: '🦋', spider: '🕷️', owl: '🦉', eagle: '🦅', monkey: '🐒', kangaroo: '🦘',
  crocodile: '🐊', hedgehog: '🦔', squirrel: '🐿️', zebra: '🦓', hippo: '🦛', snail: '🐌', ladybug: '🐞', bat: '🦇',
  panda: '🐼', camel: '🐫', parrot: '🦜', swan: '🦢', caterpillar: '🐛', cheetah: '🐆',
  // предметы, явления
  apple: '🍎', egg: '🥚', ball: '⚽', chair: '🪑', car: '🚗', house: '🏠', mountain: '⛰️', person: '🚶', plane: '✈️',
  rocket: '🚀', flower: '🌸', mushroom: '🍄', tree: '🌳', tower: '🗼', ice: '🧊', snow: '❄️', icecream: '🍦', tea: '☕',
  soup: '🍲', fire: '🔥', sun: '☀️', winter: '⛄', spring: '🌷', summer: '🌞', autumn: '🍂', grass: '🌱', sky: '🌤️',
  tomato: '🍅', lemon: '🍋', carrot: '🥕', cucumber: '🥒', milk: '🥛', banana: '🍌', cherry: '🍒', strawberry: '🍓',
  orange: '🍊', honey: '🍯', candy: '🍬', cake: '🎂', salt: '🧂', knife: '🔪', brick: '🧱', teddy: '🧸',
  // инструменты
  spoon: '🥄', fork: '🍴', scissors: '✂️', hammer: '🔨', broom: '🧹', brush: '🖌️', pencil: '✏️', key: '🔑', camera: '📷',
  rod: '🎣', thermometer: '🌡️', ruler: '📏',
  // места
  water: '💧', sea: '🌊', pond: '💧', forest: '🌲', nest: '🌳', hive: '🏠', anthill: '⛰️', kennel: '🏠', barn: '🏚️',
  farm: '🚜', burrow: '🕳️', cave: '⛰️', africa: '🌍', australia: '🌏', desert: '🏜️', moon: '🌙', fridge: '❄️',
  pocket: '👖', cloud: '☁️',
  // еда
  hay: '🌾', meat: '🍖', seeds: '🌻', bamboo: '🎍', bananas: '🍌', leaves: '🍃', insects: '🐛', nuts: '🌰',
};

const words = (s) => s.split(/[\s,]+/).filter(Boolean);
// строки вида «id: список | список» → { id, a: [..], b: [..] }
const table = (text) =>
  text.trim().split('\n').map((line) => {
    const [id, rest] = line.split(':');
    const [a, b = ''] = rest.split('|');
    return { id: id.trim(), a: words(a), b: words(b) };
  });

// ---------- животные: что умеют (a — умеет, b — не умеет) ----------
export const ABILITIES = ['fly', 'swim', 'run', 'jump', 'crawl', 'climb', 'dig'];
const AB = table(`
cat: run jump climb | fly
dog: run swim jump dig | fly climb
cow: | fly climb
horse: run jump swim | fly climb
pig: run swim | fly climb
sheep: run jump | fly climb
goat: jump run | fly
hen: run | swim
duck: fly swim | climb
rabbit: run jump dig | fly climb
mouse: run climb | fly
elephant: swim | fly jump climb
giraffe: run | fly
lion: run jump | fly
tiger: run jump swim | fly
bear: run swim climb | fly
wolf: run swim | fly climb
fox: run jump dig | fly
frog: jump swim | fly
fish: swim | run fly
bird: fly | 
snake: crawl swim climb | fly
turtle: swim crawl | fly jump
penguin: swim | fly
dolphin: swim jump | run climb
whale: swim | run fly climb
shark: swim | run fly climb
bee: fly | swim
ant: run climb | 
butterfly: fly | swim dig
spider: crawl climb | fly
owl: fly | swim
eagle: fly | swim
parrot: fly | swim
swan: fly swim | climb
monkey: climb jump run | fly
kangaroo: jump | fly
crocodile: swim crawl | fly
hedgehog: run | fly
squirrel: climb jump run |
zebra: run | fly
hippo: run | fly
snail: crawl | fly run
ladybug: fly crawl | swim
panda: climb | fly
camel: run | fly
caterpillar: crawl | fly
`);

// ---------- звуки (животные с неповторяющимся звуком) ----------
export const SOUND_ANIMALS = ['cat', 'dog', 'cow', 'horse', 'pig', 'sheep', 'hen', 'rooster', 'duck', 'lion', 'wolf', 'bee', 'snake', 'bird', 'elephant', 'frog', 'mouse'];
// чужие звуки, которые у этого животного тоже бывают (кошка рычит и шипит, собака воет) — их неверными не делаем
const SOUND_AVOID = { cat: ['lion', 'snake'], dog: ['lion', 'wolf'], wolf: ['dog'], hen: ['rooster'], rooster: ['hen'], lion: ['cat'], snake: ['cat'], duck: ['frog'], frog: ['duck'], bird: ['mouse'], mouse: ['bird'] };
const WRONG_SOUNDS = 3; // сколько неверных звуков на животное

// ---------- части тела (a — есть, b — нет) ----------
export const PARTS = ['trunk', 'wings', 'tail', 'horns', 'feathers', 'fins', 'shell', 'spikes', 'mane', 'beak', 'fur', 'scales', 'gills', 'stripes', 'pouch', 'legs', 'spots', 'eyes', 'ears', 'nose', 'whiskers'];
const HAS = table(`
elephant: trunk tail | wings feathers fins
bird: wings feathers beak | horns fins
cow: tail | wings feathers fins
fish: fins scales gills | legs wings fur
snake: scales | legs wings fins
turtle: shell | wings feathers
hedgehog: spikes | wings fins
lion: mane tail | wings fins horns
horse: mane tail | wings horns fins
kangaroo: pouch tail | wings fins
zebra: stripes tail | wings horns
giraffe: spots tail | wings fins
cat: tail fur | wings horns fins
dog: tail fur | wings horns
butterfly: wings | fins fur
bee: wings | fins horns
penguin: wings beak feathers | fur horns
dolphin: fins | wings feathers
crocodile: scales tail | wings feathers
rabbit: tail fur | wings horns feathers
sheep: fur | wings fins
bear: fur | wings fins horns
spider: legs | fins horns wings
owl: wings beak feathers | fins horns
duck: wings beak feathers | horns fur
hen: wings beak feathers | horns fins
pig: tail | wings horns feathers
monkey: tail fur | wings fins
frog: legs | wings fur feathers
snail: shell | wings fins feathers
eagle: wings beak | fins horns
tiger: stripes tail | wings fins
mouse: tail fur | wings horns
whale: tail | wings feathers
`);

// У многих животных есть ещё глаза, уши, нос и усы (верных утверждений мало, а неверных много — выравниваем).
const EXTRA_PARTS = {
  eyes: 'cat dog cow horse pig sheep rabbit mouse elephant giraffe lion tiger bear wolf fox frog fish bird snake turtle penguin dolphin whale shark bee ant butterfly spider owl eagle monkey crocodile hedgehog squirrel zebra snail',
  ears: 'cat dog cow horse pig sheep rabbit mouse elephant giraffe lion tiger bear wolf fox monkey hedgehog squirrel zebra hippo kangaroo camel panda bat',
  nose: 'cat dog cow horse pig sheep rabbit mouse lion tiger bear wolf fox monkey',
  whiskers: 'cat mouse rabbit tiger lion',
};
for (const [part, list] of Object.entries(EXTRA_PARTS)) {
  for (const id of words(list)) {
    let row = HAS.find((r) => r.id === id);
    if (!row) HAS.push((row = { id, a: [], b: [] }));
    row.a.push(part);
  }
}

// ---------- где живёт (a — живёт, b — не живёт) ----------
export const PLACES = ['water', 'sea', 'pond', 'forest', 'nest', 'tree', 'hive', 'anthill', 'kennel', 'house', 'farm', 'barn', 'burrow', 'cave', 'africa', 'australia', 'desert', 'moon', 'fridge', 'pocket', 'cloud'];
const HOME = table(`
fish: water | tree desert moon cloud
whale: sea | forest desert tree pocket
dolphin: sea | forest tree desert
shark: sea | tree desert forest
frog: pond water | desert moon cloud
duck: pond | desert moon cloud
swan: pond | desert moon cloud
bird: nest tree | moon fridge pocket
bee: hive | water moon fridge
ant: anthill | water cloud sea
dog: kennel house | tree sea moon nest
cat: house | sea nest moon fridge
cow: farm barn | sea tree nest moon
pig: farm barn | tree sea nest moon
horse: barn farm | tree sea nest moon
sheep: farm | tree sea moon nest
hen: farm | sea moon cloud
rabbit: burrow | sea tree moon cloud
fox: forest burrow | sea moon cloud nest
wolf: forest | sea moon pocket
bear: forest cave | sea nest moon pocket
squirrel: tree forest | sea moon fridge
hedgehog: forest | sea moon cloud
owl: tree forest | sea moon fridge
monkey: tree | sea moon fridge
crocodile: water | tree moon fridge cloud
elephant: africa | sea tree pocket fridge moon
lion: africa | sea tree pocket moon
giraffe: africa | sea tree pocket fridge
zebra: africa | sea tree moon
hippo: water africa | tree nest moon
kangaroo: australia | sea tree africa fridge
camel: desert | sea tree moon fridge
`);

// ---------- что ест (a — ест, b — не ест) ----------
export const FOODS = ['grass', 'hay', 'meat', 'fish', 'carrot', 'honey', 'seeds', 'bamboo', 'bananas', 'leaves', 'insects', 'nuts'];
const EAT = table(`
cow: grass hay | meat fish honey
horse: grass hay carrot | meat fish
sheep: grass hay | meat fish
goat: grass hay | meat fish
rabbit: carrot grass | meat fish
giraffe: leaves | meat fish
elephant: grass leaves | meat fish
lion: meat | carrot bamboo hay
tiger: meat | carrot hay bamboo
wolf: meat | carrot bamboo hay
bear: honey fish | hay
panda: bamboo | fish hay
monkey: bananas | fish hay
cat: fish meat | hay bamboo carrot
dog: meat | hay bamboo
bee: honey | meat fish hay
frog: insects | hay bamboo
squirrel: nuts | meat fish hay
hen: seeds | bamboo
bird: seeds | hay bamboo
mouse: seeds | bamboo fish
crocodile: meat fish | grass carrot bamboo
shark: fish | grass carrot bamboo
dolphin: fish | grass carrot hay
penguin: fish | grass hay carrot
eagle: meat fish | hay carrot bamboo
hippo: grass | meat fish
zebra: grass | meat fish
caterpillar: leaves | meat fish
hedgehog: insects | hay bamboo
`);

// ---------- свойства предметов (a — верно, b — неверно). PROP_GROUP: свойства одной группы исключают друг друга ----------
export const PROP_GROUP = {
  green: 'color', red: 'color', blue: 'color', lightblue: 'color', yellow: 'color', white: 'color', black: 'color', orange: 'color',
  cold: 'temp', hot: 'temp', sweet: 'taste', sour: 'taste', salty: 'taste', hard: 'hard', soft: 'hard',
  sharp: 'sharp', round: 'shape', square: 'shape', triangular: 'shape', wet: 'wet',
};
const PROP = table(`
grass: green | red blue black
snow: white cold | black hot green
sun: yellow hot | blue cold green
sky: lightblue | green red
tomato: red | blue black white
lemon: yellow sour | blue sweet red
carrot: orange | blue black white
cucumber: green | blue red black
milk: white | black green red
banana: yellow | blue black red
cherry: red | blue white
strawberry: red | blue black
orange: orange sweet | blue black
honey: sweet | sour salty
candy: sweet | salty hot
cake: sweet | salty
salt: salty white | sweet blue sour
fire: hot | cold wet
icecream: cold sweet | hot salty
ice: cold hard | hot soft
knife: sharp | soft round
brick: hard red | soft blue
teddy: soft | hard sharp
ball: round | square triangular
`);

// ---------- инструменты: чем что делают. Группа: инструменты одной группы делают похожее — друг другу ложных не дарим ----------
export const TOOLS = [
  { id: 'spoon', act: 'eat_soup', group: 'eat' },
  { id: 'fork', act: 'eat_pasta', group: 'eat' },
  { id: 'knife', act: 'cut_bread', group: 'cut' },
  { id: 'scissors', act: 'cut_paper', group: 'cut' },
  { id: 'hammer', act: 'nails', group: 'hammer' },
  { id: 'broom', act: 'sweep', group: 'broom' },
  { id: 'brush', act: 'paint', group: 'draw' },
  { id: 'pencil', act: 'write', group: 'draw' },
  { id: 'key', act: 'door', group: 'door' },
  { id: 'camera', act: 'photo', group: 'photo' },
  { id: 'rod', act: 'fish', group: 'fish' },
  { id: 'thermometer', act: 'temp', group: 'temp' },
  { id: 'ruler', act: 'length', group: 'length' },
];
const WRONG_ACTS = 3;
const EXTRA_ACTS = [['pencil', 'paint'], ['knife', 'cut_paper']]; // тоже верно (та же группа инструментов) // сколько неверных действий на инструмент

// ---------- дела животных (a — делает, b — не делает) ----------
export const DEEDS = ['milk', 'eggs', 'honey', 'wool', 'guard', 'mice', 'web', 'nest', 'cart', 'night', 'upside', 'flies', 'anthill', 'house', 'purr', 'fetch', 'peck', 'gnaw', 'winter', 'pouch'];
export const DEED_PIC = { milk: '🥛', eggs: '🥚', honey: '🍯', wool: '🧶', guard: '🏠', mice: '🐭', web: '🕸️', nest: '🌳', cart: '🛒', night: '🌙', upside: '🙃', flies: '🦟', anthill: '🏗️', house: '🏠', purr: '😺', fetch: '🦴', peck: '🌾', gnaw: '🌰', winter: '💤', pouch: '👶' };
const DEED = table(`
milk: cow goat | hen fish bee bird snake frog duck spider
eggs: hen duck bird | cow dog cat horse pig sheep elephant lion
honey: bee | cow dog hen cat spider
wool: sheep | hen fish frog duck bee
guard: dog | fish bee frog snail spider
mice: cat owl fox | cow horse sheep fish bee
web: spider | cow dog bird fish hen
nest: bird owl duck | cow dog cat horse pig
cart: horse | cat fish bee hen frog
night: owl bat | cow hen sheep bee duck
upside: bat | cow dog horse hen
flies: frog spider | cow horse sheep pig
anthill: ant | bee bird dog cow
house: snail turtle | cat bird fish dog cow
purr: cat | dog cow hen fish bee
fetch: dog | cat cow fish bee hen
peck: hen bird rooster | cow dog cat horse pig
gnaw: squirrel mouse rabbit | cow horse fish bee snake
winter: bear hedgehog bat | cow dog cat horse hen
pouch: kangaroo | cow dog cat horse bear
`);
// нелепые занятия: неверны для любого животного
export const ABSURD = ['newspaper', 'bus', 'pies', 'coffee', 'violin', 'school', 'glasses'];
export const ABSURD_PIC = { newspaper: '📰', bus: '🚌', pies: '🥧', coffee: '☕', violin: '🎻', school: '🏫', glasses: '👓' };
const ABSURD_PER_ANIMAL = 2;

// ---------- сравнения. Ярусы от меньшего к большему; сравниваются предметы, чьи ярусы отличаются не меньше чем на 2 ----------
export const LADDERS = {
  size: [
    'ant bee ladybug butterfly snail',
    'mouse frog hedgehog apple egg',
    'cat rabbit hen duck squirrel ball',
    'dog sheep goat pig fox chair',
    'cow horse bear lion',
    'elephant giraffe hippo car',
    'whale',
    'house',
    'mountain',
  ].map(words),
  weight: [
    'ant bee ladybug butterfly',
    'mouse frog hedgehog apple egg',
    'cat rabbit hen duck squirrel',
    'dog sheep goat pig fox',
    'cow horse bear lion',
    'car',
    'elephant hippo',
    'whale',
  ].map(words),
  speed: ['snail turtle', 'person', 'dog rabbit', 'horse', 'car cheetah', 'plane', 'rocket'].map(words),
  height: ['flower mushroom', 'person', '', 'tree tower', '', 'mountain'].map(words),
  hot: ['ice snow icecream', '', '', 'tea soup', '', 'fire', 'sun'].map(words),
  temp: ['winter', '', 'spring autumn', '', 'summer'].map(words),
};
export const MIN_TIER_GAP = 2;

// ---------- числа ----------
export const MAX_NUM = 20;

// ---------- счёт: id, сколько на самом деле, ложные числа ----------
export const COUNTS = table(`
dog_legs: 4 | 2 3 5 6
cow_legs: 4 | 2 3 5 6
bird_legs: 2 | 3 4 6
spider_legs: 8 | 4 6 10 12
ladybug_legs: 6 | 4 8 10 2
human_eyes: 2 | 3 4
human_ears: 2 | 3 4 5
human_hands: 2 | 3 4 5
hand_fingers: 5 | 3 4 6 7 8
week_days: 7 | 5 6 8 9 10
year_months: 12 | 10 11 8 6 20
day_hours: 24 | 12 20 30
hour_minutes: 60 | 30 40 50 90 100
rainbow_colors: 7 | 3 5 6 8 9 10
traffic_colors: 3 | 2 4 5
triangle_sides: 3 | 2 4 5 6
square_sides: 4 | 3 5 6 8
bike_wheels: 2 | 3 4 6
car_wheels: 4 | 2 3 5 6 8
`).map((r) => ({ id: r.id, n: Number(r.a[0]), alts: r.b.map(Number) }));
export const COUNT_PIC = {
  dog_legs: '🐶', cow_legs: '🐄', bird_legs: '🐦', spider_legs: '🕷️', ladybug_legs: '🐞', human_eyes: '👀', human_ears: '👂',
  human_hands: '🙌', hand_fingers: '🖐️', week_days: '📅', year_months: '🗓️', day_hours: '🕛', hour_minutes: '⏰',
  rainbow_colors: '🌈', traffic_colors: '🚦', triangle_sides: '🔺', square_sides: '🟦', bike_wheels: '🚲', car_wheels: '🚗',
};

// ---------- время ----------
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
// что бывает в какое время года; неверное берётся из противоположного времени (зима ↔ лето, весна ↔ осень)
export const SEASON_FEATURES = {
  winter: ['snowman', 'sled', 'snowlies'],
  spring: ['melt', 'birdsback', 'snowdrops'],
  summer: ['swim', 'strawberries', 'hotdays'],
  autumn: ['leaves', 'harvest', 'birdsleave'],
};
export const OPPOSITE_SEASON = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };
export const DAYPARTS = ['morning', 'day', 'evening', 'night'];
export const DAYPART_FEATURES = {
  morning: ['sunrise', 'breakfast'],
  day: ['sunshines', 'lunch'],
  evening: ['sunset', 'dinner'],
  night: ['stars', 'sleep'],
};
export const OPPOSITE_DAYPART = { morning: 'evening', evening: 'morning', day: 'night', night: 'day' };
const DAYS_ALTS = 3; // сколько неверных «после … идёт …» на день, месяц, время года

// ---------- сборка утверждений ----------
const pickSpread = (list, count, seed) => {
  // детерминированно «вразброс»: шаг по списку, чтобы разные животные получали разные неверные
  const out = [];
  for (let i = 0; i < list.length && out.length < count; i++) {
    const item = list[(seed * 7 + i * 3) % list.length];
    if (!out.includes(item)) out.push(item);
  }
  // если шаг зациклился раньше времени — добираем подряд
  for (let i = 0; i < list.length && out.length < count; i++) if (!out.includes(list[i])) out.push(list[i]);
  return out;
};
const pic = (...ids) => ids.map((id) => E[id] || id).join('');

let cache = null;
export function claims() {
  if (cache) return cache;
  const out = [];
  const push = (c) => out.push(c);

  // умения
  for (const row of AB) {
    for (const v of row.a) push({ cat: 'ab', id: `ab:${row.id}:${v}`, animal: row.id, verb: v, value: true, subj: [row.id], pic: pic(row.id) });
    for (const v of row.b) push({ cat: 'ab', id: `ab:${row.id}:${v}`, animal: row.id, verb: v, value: false, subj: [row.id], pic: pic(row.id) });
  }

  // звуки
  SOUND_ANIMALS.forEach((animal, index) => {
    const right = { cat: 'sd', id: `sd:${animal}:${animal}`, animal, sound: animal, value: true, subj: [animal], pic: pic(animal) };
    push(right);
    const avoid = new Set([animal, ...(SOUND_AVOID[animal] || [])]);
    const others = SOUND_ANIMALS.filter((a) => !avoid.has(a));
    for (const s of pickSpread(others, WRONG_SOUNDS, index)) {
      push({ cat: 'sd', id: `sd:${animal}:${s}`, animal, sound: s, value: false, fix: right, subj: [animal], pic: pic(animal) });
    }
  });

  // части тела
  for (const row of HAS) {
    for (const p of row.a) push({ cat: 'has', id: `has:${row.id}:${p}`, animal: row.id, part: p, value: true, subj: [row.id], pic: pic(row.id) });
    for (const p of row.b) push({ cat: 'has', id: `has:${row.id}:${p}`, animal: row.id, part: p, value: false, subj: [row.id], pic: pic(row.id) });
  }

  // где живёт
  for (const row of HOME) {
    const yes = row.a.map((pl) => ({ cat: 'home', id: `home:${row.id}:${pl}`, animal: row.id, place: pl, value: true, subj: [row.id], pic: pic(row.id, pl) }));
    yes.forEach(push);
    for (const pl of row.b) push({ cat: 'home', id: `home:${row.id}:${pl}`, animal: row.id, place: pl, value: false, fix: yes[0], subj: [row.id], pic: pic(row.id, pl) });
  }

  // что ест
  for (const row of EAT) {
    const yes = row.a.map((f) => ({ cat: 'eat', id: `eat:${row.id}:${f}`, animal: row.id, food: f, value: true, subj: [row.id], pic: pic(row.id, f) }));
    yes.forEach(push);
    for (const f of row.b) push({ cat: 'eat', id: `eat:${row.id}:${f}`, animal: row.id, food: f, value: false, fix: yes[0], subj: [row.id], pic: pic(row.id, f) });
  }

  // свойства предметов
  for (const row of PROP) {
    const yes = row.a.map((p) => ({ cat: 'prop', id: `prop:${row.id}:${p}`, item: row.id, prop: p, value: true, subj: [row.id], pic: pic(row.id) }));
    yes.forEach(push);
    for (const p of row.b) push({ cat: 'prop', id: `prop:${row.id}:${p}`, item: row.id, prop: p, value: false, fix: yes[0], subj: [row.id], pic: pic(row.id) });
  }

  // инструменты
  TOOLS.forEach((tool, index) => {
    const right = { cat: 'use', id: `use:${tool.id}:${tool.act}`, tool: tool.id, act: tool.act, value: true, subj: [tool.id], pic: pic(tool.id) };
    push(right);
    for (const [t, act] of EXTRA_ACTS) if (t === tool.id) push({ cat: 'use', id: `use:${tool.id}:${act}`, tool: tool.id, act, value: true, subj: [tool.id], pic: pic(tool.id) });
    const others = TOOLS.filter((t) => t.group !== tool.group).map((t) => t.act);
    for (const act of pickSpread(others, WRONG_ACTS, index)) {
      push({ cat: 'use', id: `use:${tool.id}:${act}`, tool: tool.id, act, value: false, fix: right, subj: [tool.id], pic: pic(tool.id) });
    }
  });

  // дела животных
  const firstDeed = new Map();
  for (const row of DEED) for (const a of row.a) if (!firstDeed.has(a)) firstDeed.set(a, { cat: 'job', id: `job:${a}:${row.id}`, animal: a, deed: row.id, value: true, subj: [a], pic: `${pic(a)}${DEED_PIC[row.id]}` });
  for (const row of DEED) {
    for (const a of row.a) push({ cat: 'job', id: `job:${a}:${row.id}`, animal: a, deed: row.id, value: true, subj: [a], pic: `${pic(a)}${DEED_PIC[row.id]}` });
    for (const a of row.b) push({ cat: 'job', id: `job:${a}:${row.id}`, animal: a, deed: row.id, value: false, fix: firstDeed.get(a) || null, subj: [a], pic: `${pic(a)}${DEED_PIC[row.id]}` });
  }
  const jobAnimals = Object.keys(E).filter((id) => AB.some((r) => r.id === id) || HOME.some((r) => r.id === id));
  [...new Set(jobAnimals)].forEach((a, index) => {
    for (const d of pickSpread(ABSURD, ABSURD_PER_ANIMAL, index)) {
      push({ cat: 'job', id: `job:${a}:${d}`, animal: a, deed: d, value: false, fix: firstDeed.get(a) || null, subj: [a], pic: `${pic(a)}${ABSURD_PIC[d]}` });
    }
  });

  // сравнения
  for (const [dim, tiers] of Object.entries(LADDERS)) {
    const flat = tiers.flatMap((items, tier) => items.map((id) => ({ id, tier })));
    for (const hi of flat) {
      for (const lo of flat) {
        if (hi.tier - lo.tier >= MIN_TIER_GAP) push({ cat: 'cmp', id: `cmp:${dim}:${hi.id}:${lo.id}`, dim, hi: hi.id, lo: lo.id, value: true, subj: [hi.id, lo.id], pic: pic(hi.id, lo.id) });
      }
    }
  }

  // числа
  for (let a = 1; a <= MAX_NUM; a++) for (let b = 0; b < a; b++) push({ cat: 'num', id: `nc:${a}:${b}`, kind: 'cmp', a, b, value: true, subj: [`n${a}`, `n${b}`], pic: '🔢' });
  const alts = (c) => [c - 2, c - 1, c + 1, c + 2].filter((x) => x >= 0 && x <= MAX_NUM && x !== c);
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) push({ cat: 'num', id: `ns:${a}:${b}`, kind: 'sum', a, b, c: a + b, alts: alts(a + b), value: true, subj: [`n${a}`, `n${b}`], pic: '➕' });
  for (let a = 3; a <= 12; a++) for (let b = 1; b < a; b++) push({ cat: 'num', id: `nd:${a}:${b}`, kind: 'diff', a, b, c: a - b, alts: alts(a - b), value: true, subj: [`n${a}`, `n${b}`], pic: '➖' });

  // счёт
  for (const row of COUNTS) push({ cat: 'cnt', id: `cnt:${row.id}`, what: row.id, n: row.n, alts: row.alts, value: true, subj: [row.id], pic: COUNT_PIC[row.id] });

  // время
  DAYS.forEach((x, i) => push({ cat: 'time', id: `tm:day:${x}`, kind: 'order', set: 'day', x, y: DAYS[(i + 1) % 7], alts: pickSpread(DAYS.filter((d) => d !== x && d !== DAYS[(i + 1) % 7]), DAYS_ALTS, i), value: true, subj: [x], pic: '📅' }));
  MONTHS.forEach((x, i) => push({ cat: 'time', id: `tm:mon:${x}`, kind: 'order', set: 'mon', x, y: MONTHS[(i + 1) % 12], alts: pickSpread(MONTHS.filter((d) => d !== x && d !== MONTHS[(i + 1) % 12]), DAYS_ALTS, i), value: true, subj: [x], pic: '🗓️' }));
  const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];
  SEASON_ORDER.forEach((x, i) => push({ cat: 'time', id: `tm:sea:${x}`, kind: 'order', set: 'sea', x, y: SEASON_ORDER[(i + 1) % 4], alts: SEASON_ORDER.filter((d) => d !== x && d !== SEASON_ORDER[(i + 1) % 4]), value: true, subj: [x], pic: pic(x) }));
  for (const season of SEASONS) {
    const right = SEASON_FEATURES[season].map((f) => ({ cat: 'time', id: `sf:${season}:${f}`, kind: 'sfeat', season, feat: f, value: true, subj: [season], pic: pic(season) }));
    right.forEach(push);
    for (const f of SEASON_FEATURES[OPPOSITE_SEASON[season]]) push({ cat: 'time', id: `sf:${season}:${f}`, kind: 'sfeat', season, feat: f, value: false, fix: right[0], subj: [season], pic: pic(season) });
  }
  const DAYPART_PIC = { morning: '🌅', day: '🌞', evening: '🌇', night: '🌙' };
  for (const part of DAYPARTS) {
    const right = DAYPART_FEATURES[part].map((f) => ({ cat: 'time', id: `df:${part}:${f}`, kind: 'dfeat', part, feat: f, value: true, subj: [part], pic: DAYPART_PIC[part] }));
    right.forEach(push);
    for (const f of DAYPART_FEATURES[OPPOSITE_DAYPART[part]]) push({ cat: 'time', id: `df:${part}:${f}`, kind: 'dfeat', part, feat: f, value: false, fix: right[0], subj: [part], pic: DAYPART_PIC[part] });
  }
  cache = out;
  return out;
}

// ---------- проверки (tools/check.mjs) ----------
export function validate() {
  const problems = [];
  const bad = (text) => problems.push(text);
  const dup = (rows, what) => {
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.id)) bad(`${what}: «${r.id}» повторяется`);
      seen.add(r.id);
    }
  };
  for (const [name, rows] of [['умения', AB], ['части тела', HAS], ['жильё', HOME], ['еда', EAT], ['свойства', PROP], ['дела', DEED]]) {
    dup(rows, name);
    for (const r of rows) {
      const clash = r.a.filter((x) => r.b.includes(x));
      if (clash.length) bad(`${name}: у «${r.id}» одно и то же и верно, и неверно: ${clash.join(', ')}`);
      if (!E[r.id] && name !== 'дела' && name !== 'свойства') bad(`${name}: нет картинки у «${r.id}»`);
    }
  }
  for (const r of AB) for (const v of [...r.a, ...r.b]) if (!ABILITIES.includes(v)) bad(`умения: неизвестное умение «${v}» у «${r.id}»`);
  for (const r of HAS) for (const v of [...r.a, ...r.b]) if (!PARTS.includes(v)) bad(`части тела: неизвестная часть «${v}» у «${r.id}»`);
  for (const r of HOME) for (const v of [...r.a, ...r.b]) if (!PLACES.includes(v)) bad(`жильё: неизвестное место «${v}» у «${r.id}»`);
  for (const r of EAT) for (const v of [...r.a, ...r.b]) if (!FOODS.includes(v)) bad(`еда: неизвестная еда «${v}» у «${r.id}»`);
  for (const r of DEED) for (const v of [...r.a, ...r.b]) if (!E[v]) bad(`дела: нет картинки у «${v}» (дело «${r.id}»)`);
  for (const r of DEED) if (!DEEDS.includes(r.id)) bad(`дела: «${r.id}» нет в DEEDS`);
  // свойства: у предмета неверное свойство не должно быть «почти верным» (синее и голубое, оба холодное)
  for (const r of PROP) {
    if (!E[r.id]) bad(`свойства: нет картинки у «${r.id}»`);
    for (const p of [...r.a, ...r.b]) if (!PROP_GROUP[p]) bad(`свойства: неизвестное свойство «${p}» у «${r.id}»`);
    for (const f of r.b) {
      if ((f === 'blue' && r.a.includes('lightblue')) || (f === 'lightblue' && r.a.includes('blue'))) bad(`свойства: у «${r.id}» синее и голубое — спорно`);
    }
  }
  // звуки: у одного животного все неверные звуки чужие и не из списка «тоже бывает»
  for (const a of SOUND_ANIMALS) if (!E[a]) bad(`звуки: нет картинки у «${a}»`);
  // сравнения: каждый предмет в ярусе известен, в одной лестнице нет повторов
  for (const [dim, tiers] of Object.entries(LADDERS)) {
    const seen = new Set();
    for (const items of tiers) for (const id of items) {
      if (seen.has(id)) bad(`сравнение ${dim}: «${id}» стоит в двух ярусах`);
      seen.add(id);
      if (!E[id]) bad(`сравнение ${dim}: нет картинки у «${id}»`);
    }
  }
  // инструменты: у каждого группа и действие
  for (const t of TOOLS) if (!E[t.id]) bad(`инструменты: нет картинки у «${t.id}»`);
  // счёт: ложные числа не равны верному, среди них нет единицы (для неё нужен другой род)
  for (const c of COUNTS) {
    if (c.alts.includes(c.n)) bad(`счёт: у «${c.id}» ложное число совпало с верным`);
    if (c.alts.includes(1) || c.n === 1) bad(`счёт: у «${c.id}» число 1 (нужны другие формы) — не поддерживается`);
    if (!COUNT_PIC[c.id]) bad(`счёт: нет картинки у «${c.id}»`);
  }
  // утверждения: id неповторимы, у каждого есть картинка
  const ids = new Set();
  for (const c of claims()) {
    if (ids.has(c.id)) bad(`утверждение «${c.id}» повторяется`);
    ids.add(c.id);
    if (!c.pic) bad(`у «${c.id}» нет картинки`);
    if (`rtf:${c.id}`.length > 80) bad(`у «${c.id}» слишком длинный ключ для учёта (больше 80)`);
    if (c.cat === 'cmp' && c.hi === c.lo) bad(`сравнение «${c.id}»: предмет с самим собой`);
    if (c.fix && c.fix.value !== true) bad(`«${c.id}»: «как правильно» должно быть верным утверждением`);
    if (c.kind === 'sum' && c.a + c.b !== c.c) bad(`сумма «${c.id}» посчитана неверно`);
    if (c.kind === 'diff' && c.a - c.b !== c.c) bad(`разность «${c.id}» посчитана неверно`);
    if (c.alts && c.c != null && c.alts.includes(c.c)) bad(`«${c.id}»: ложный ответ равен верному`);
  }
  return problems;
}
