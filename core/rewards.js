// Награды: звёзды за серию, магазин наклеек и миры супер-наклеек.

// ---------- Звёзды ----------

// 1–3 звезды по доле верных ответов с первой попытки.
export function starsFor(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

// ---------- Магазин наклеек ----------
// Звёзды тратятся: ребёнок сам выбирает, какую наклейку купить.

const BASE_PRICE = 5; // столько стоили первые 24 наклейки, пока они выдавались автоматически
const TIER_PRICES = [6, 6, 6, 6, 10, 10, 10, 10, 14, 14, 14, 20]; // обычные, редкие, самые редкие

const BASE_STICKERS = [
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐸', '🐵', '🐧', '🦉', '🦋', '🐢', '🐙', '🐬',
  '🦄', '🐝', '🐞', '🐳', '🦖', '🚀', '🌈', '🍓',
];

// Альбомы по 12 наклеек. Все картинки в наборах разные.
const ALBUM_DEFS = [
  { id: 'princess', title: 'Принцессы и феи', icon: '👸', items: ['👸', '🧚‍♀️', '🧜‍♀️', '🦸‍♀️', '👑', '👗', '👠', '💍', '💄', '🎀', '🔮', '🧞‍♀️'] },
  { id: 'unicorn', title: 'Единороги и радуга', icon: '🦄', items: ['🎠', '☁️', '⭐', '🌟', '💫', '✨', '💖', '💜', '💙', '💛', '💚', '🧡'] },
  { id: 'pets', title: 'Питомцы', icon: '🐹', items: ['🐹', '🐭', '🐤', '🐠', '🦜', '🐴', '🐑', '🐷', '🐇', '🐕', '🐈', '🦆'] },
  { id: 'sweets', title: 'Сладости', icon: '🍭', items: ['🍭', '🍬', '🍫', '🍩', '🍪', '🎂', '🧁', '🍦', '🍰', '🍒', '🍯', '🍡'] },
  { id: 'flowers', title: 'Цветы и бабочки', icon: '🌷', items: ['🌷', '🌹', '🌻', '🌼', '🌸', '💐', '🌺', '🍀', '🌿', '🍄', '🐛', '🦗'] },
  { id: 'space', title: 'Космос', icon: '🪐', items: ['🌙', '🪐', '👽', '🛸', '☄️', '🌍', '🌞', '🔭', '👨‍🚀', '🛰️', '🌌', '🌠'] },
  { id: 'transport', title: 'Транспорт', icon: '🚗', items: ['🚗', '🚕', '🚌', '🚒', '🚑', '🚜', '🚂', '✈️', '🚁', '⛵', '🚲', '🚢'] },
  { id: 'party', title: 'Праздник', icon: '🎉', items: ['🎈', '🎁', '🎉', '🎊', '🎭', '🎡', '🎪', '🎨', '🎶', '🎻', '🥁', '🎹'] },
];

// Весь каталог: первый альбом — прежние 24 наклейки (они сохраняются у тех, кто уже их собрал).
export const ALBUMS = [
  {
    id: 'base',
    title: 'Первые наклейки',
    icon: '🐶',
    items: BASE_STICKERS.map((emoji, i) => ({ id: `base-${i}`, emoji, price: BASE_PRICE })),
  },
  ...ALBUM_DEFS.map((a) => ({
    id: a.id,
    title: a.title,
    icon: a.icon,
    items: a.items.map((emoji, i) => ({ id: `${a.id}-${i}`, emoji, price: TIER_PRICES[i] })),
  })),
];

export const CATALOG = ALBUMS.flatMap((a) => a.items);
export const stickerById = new Map(CATALOG.map((s) => [s.id, s]));

// Для переноса старого прогресса: столько наклеек раньше выдавалось за накопленные звёзды.
export function legacyUnlocked(stars) {
  return Math.min(BASE_STICKERS.length, Math.floor(stars / BASE_PRICE));
}

// ---------- Миры супер-наклеек ----------
// Каждый мир — сцена с 12 предметами. Первая супер-наклейка кладётся в первый мир,
// когда он собран, открывается следующий. x, y — центр предмета в % сцены, size — размер в % ширины.

export const WORLDS = [
  {
    id: 'fairy',
    title: { ru: 'Моя сказка', de: 'Mein Märchen' },
    grow: { ru: 'Твоя сказка растёт.', de: 'Dein Märchen wächst.' },
    sky: 'linear-gradient(180deg, #ffd9f1 0%, #e6d4ff 55%, #cfe4ff 100%)',
    ground: 'linear-gradient(180deg, #bff0c8, #8fdca3)',
    items: [
      { emoji: '🦄', ru: 'Единорог', de: 'Einhorn', x: 21, y: 66, size: 12 },
      { emoji: '👸', ru: 'Принцесса', de: 'Prinzessin', x: 38, y: 67, size: 11 },
      { emoji: '🏰', ru: 'Волшебный замок', de: 'Zauberschloss', x: 62, y: 42, size: 20 },
      { emoji: '🛋️', ru: 'Красивый диван', de: 'Schönes Sofa', x: 80, y: 78, size: 11 },
      { emoji: '🌈', ru: 'Радуга', de: 'Regenbogen', x: 40, y: 22, size: 14 },
      { emoji: '🧚', ru: 'Добрая фея', de: 'Gute Fee', x: 11, y: 28, size: 8 },
      { emoji: '👑', ru: 'Корона', de: 'Krone', x: 62, y: 11, size: 7 },
      { emoji: '✨', ru: 'Волшебные искры', de: 'Zauberfunken', x: 89, y: 20, size: 8 },
      { emoji: '🦋', ru: 'Бабочка', de: 'Schmetterling', x: 28, y: 44, size: 6 },
      { emoji: '🌸', ru: 'Цветущий сад', de: 'Blumengarten', x: 52, y: 82, size: 7 },
      { emoji: '🎀', ru: 'Бант', de: 'Schleife', x: 8, y: 74, size: 6 },
      { emoji: '💎', ru: 'Сказочный кристалл', de: 'Märchenkristall', x: 93, y: 50, size: 6 },
    ],
  },
  {
    id: 'sea',
    title: { ru: 'Подводный мир', de: 'Unterwasserwelt' },
    grow: { ru: 'Твой подводный мир растёт.', de: 'Deine Unterwasserwelt wächst.' },
    sky: 'linear-gradient(180deg, #c9f1ff 0%, #7fd0f0 45%, #3c97dc 100%)',
    ground: 'linear-gradient(180deg, #f7e2a9, #e8c878)',
    items: [
      { emoji: '🧜‍♀️', ru: 'Русалка', de: 'Meerjungfrau', x: 30, y: 56, size: 15 },
      { emoji: '🐚', ru: 'Волшебная ракушка', de: 'Zaubermuschel', x: 12, y: 84, size: 7 },
      { emoji: '🐬', ru: 'Дельфин', de: 'Delfin', x: 62, y: 28, size: 12 },
      { emoji: '🐠', ru: 'Тропическая рыбка', de: 'Tropenfisch', x: 84, y: 50, size: 8 },
      { emoji: '🐙', ru: 'Осьминожка', de: 'Krake', x: 52, y: 74, size: 10 },
      { emoji: '🦀', ru: 'Крабик', de: 'Krebs', x: 72, y: 86, size: 7 },
      { emoji: '🐢', ru: 'Черепаха', de: 'Schildkröte', x: 89, y: 76, size: 9 },
      { emoji: '🐳', ru: 'Кит', de: 'Wal', x: 17, y: 22, size: 12 },
      { emoji: '🌟', ru: 'Морская звезда', de: 'Seestern', x: 40, y: 88, size: 6 },
      { emoji: '🧜🏼‍♀️', ru: 'Подружка-русалка', de: 'Meerjungfrauen-Freundin', x: 8, y: 54, size: 9 },
      { emoji: '🚢', ru: 'Корабль', de: 'Schiff', x: 92, y: 18, size: 8 },
      { emoji: '🐡', ru: 'Рыба-шар', de: 'Kugelfisch', x: 40, y: 34, size: 7 },
    ],
  },
  {
    id: 'forest',
    title: { ru: 'Волшебный лес', de: 'Zauberwald' },
    grow: { ru: 'Твой волшебный лес растёт.', de: 'Dein Zauberwald wächst.' },
    sky: 'linear-gradient(180deg, #e4f7d4 0%, #b7e7b0 55%, #8fd6a0 100%)',
    ground: 'linear-gradient(180deg, #6cc183, #4aa768)',
    items: [
      { emoji: '🌳', ru: 'Старый дуб', de: 'Alte Eiche', x: 22, y: 52, size: 16 },
      { emoji: '🏡', ru: 'Домик в лесу', de: 'Waldhaus', x: 60, y: 56, size: 13 },
      { emoji: '🦌', ru: 'Олень', de: 'Hirsch', x: 82, y: 66, size: 11 },
      { emoji: '🦉', ru: 'Мудрая сова', de: 'Weise Eule', x: 22, y: 18, size: 7 },
      { emoji: '🧚‍♀️', ru: 'Лесная фея', de: 'Waldfee', x: 45, y: 24, size: 8 },
      { emoji: '🍄', ru: 'Волшебный гриб', de: 'Zauberpilz', x: 42, y: 80, size: 8 },
      { emoji: '🦊', ru: 'Лисичка', de: 'Füchslein', x: 64, y: 86, size: 8 },
      { emoji: '🐿️', ru: 'Белочка', de: 'Eichhörnchen', x: 7, y: 76, size: 6 },
      { emoji: '🐇', ru: 'Зайчонок', de: 'Häschen', x: 90, y: 88, size: 7 },
      { emoji: '🌷', ru: 'Цветок', de: 'Blume', x: 12, y: 90, size: 5 },
      { emoji: '🌙', ru: 'Луна', de: 'Mond', x: 90, y: 14, size: 8 },
      { emoji: '✨', ru: 'Светлячки', de: 'Glühwürmchen', x: 72, y: 22, size: 8 },
    ],
  },
  {
    id: 'candy',
    title: { ru: 'Сладкая страна', de: 'Süßigkeitenland' },
    grow: { ru: 'Твоя сладкая страна растёт.', de: 'Dein Süßigkeitenland wächst.' },
    sky: 'linear-gradient(180deg, #ffe0f0 0%, #ffd0e8 50%, #ffeaf6 100%)',
    ground: 'linear-gradient(180deg, #ffb6d9, #ff93c4)',
    items: [
      { emoji: '🎂', ru: 'Именинный торт', de: 'Geburtstagstorte', x: 50, y: 52, size: 16 },
      { emoji: '🍭', ru: 'Леденец', de: 'Lutscher', x: 20, y: 40, size: 11 },
      { emoji: '🍦', ru: 'Мороженое', de: 'Eis', x: 80, y: 42, size: 11 },
      { emoji: '🧁', ru: 'Кекс', de: 'Muffin', x: 28, y: 80, size: 8 },
      { emoji: '🍩', ru: 'Пончик', de: 'Donut', x: 72, y: 82, size: 8 },
      { emoji: '🍰', ru: 'Тортик', de: 'Törtchen', x: 11, y: 70, size: 7 },
      { emoji: '🍪', ru: 'Печенье', de: 'Keks', x: 90, y: 72, size: 7 },
      { emoji: '🍫', ru: 'Шоколад', de: 'Schokolade', x: 42, y: 86, size: 7 },
      { emoji: '🍬', ru: 'Конфета', de: 'Bonbon', x: 62, y: 88, size: 6 },
      { emoji: '🍓', ru: 'Клубничка', de: 'Erdbeere', x: 8, y: 18, size: 6 },
      { emoji: '🏠', ru: 'Пряничный домик', de: 'Lebkuchenhaus', x: 92, y: 16, size: 9 },
      { emoji: '🍡', ru: 'Сладкие шарики', de: 'Süße Kugeln', x: 50, y: 16, size: 7 },
    ],
  },
  {
    id: 'zoo',
    title: { ru: 'Зоопарк', de: 'Zoo' },
    grow: { ru: 'Твой зоопарк растёт.', de: 'Dein Zoo wächst.' },
    sky: 'linear-gradient(180deg, #d8f1ff 0%, #fff3c4 100%)',
    ground: 'linear-gradient(180deg, #c8ec9a, #9ad66f)',
    items: [
      { emoji: '🦒', ru: 'Жираф', de: 'Giraffe', x: 20, y: 46, size: 14 },
      { emoji: '🐘', ru: 'Слонёнок', de: 'Elefant', x: 62, y: 58, size: 15 },
      { emoji: '🦁', ru: 'Лев', de: 'Löwe', x: 84, y: 76, size: 11 },
      { emoji: '🦓', ru: 'Зебра', de: 'Zebra', x: 38, y: 74, size: 11 },
      { emoji: '🐧', ru: 'Пингвин', de: 'Pinguin', x: 9, y: 82, size: 7 },
      { emoji: '🦜', ru: 'Попугай', de: 'Papagei', x: 44, y: 22, size: 7 },
      { emoji: '🐒', ru: 'Обезьянка', de: 'Äffchen', x: 82, y: 28, size: 8 },
      { emoji: '🐼', ru: 'Панда', de: 'Panda', x: 56, y: 88, size: 8 },
      { emoji: '🐯', ru: 'Тигр', de: 'Tiger', x: 24, y: 90, size: 8 },
      { emoji: '🦩', ru: 'Фламинго', de: 'Flamingo', x: 92, y: 52, size: 8 },
      { emoji: '🌴', ru: 'Пальма', de: 'Palme', x: 6, y: 46, size: 7 },
      { emoji: '🍌', ru: 'Бананы', de: 'Bananen', x: 70, y: 90, size: 6 },
    ],
  },
  {
    id: 'winter',
    title: { ru: 'Зимняя сказка', de: 'Wintermärchen' },
    grow: { ru: 'Твоя зимняя сказка растёт.', de: 'Dein Wintermärchen wächst.' },
    sky: 'linear-gradient(180deg, #cfe6ff 0%, #e6f1ff 60%, #f6faff 100%)',
    ground: 'linear-gradient(180deg, #ffffff, #dbe8f5)',
    items: [
      { emoji: '🎄', ru: 'Новогодняя ёлка', de: 'Weihnachtsbaum', x: 20, y: 54, size: 16 },
      { emoji: '🎅', ru: 'Дед Мороз', de: 'Weihnachtsmann', x: 42, y: 68, size: 11 },
      { emoji: '⛄', ru: 'Снеговик', de: 'Schneemann', x: 80, y: 78, size: 11 },
      { emoji: '🦌', ru: 'Северный олень', de: 'Rentier', x: 89, y: 58, size: 9 },
      { emoji: '🛷', ru: 'Санки', de: 'Schlitten', x: 60, y: 84, size: 9 },
      { emoji: '🎁', ru: 'Подарок', de: 'Geschenk', x: 30, y: 88, size: 7 },
      { emoji: '🏡', ru: 'Заснеженный домик', de: 'Verschneites Häuschen', x: 64, y: 46, size: 14 },
      { emoji: '⭐', ru: 'Рождественская звезда', de: 'Weihnachtsstern', x: 20, y: 14, size: 7 },
      { emoji: '🔔', ru: 'Колокольчик', de: 'Glöckchen', x: 56, y: 18, size: 6 },
      { emoji: '🧦', ru: 'Носок для подарков', de: 'Nikolausstrumpf', x: 8, y: 76, size: 6 },
      { emoji: '🧤', ru: 'Тёплые варежки', de: 'Warme Handschuhe', x: 48, y: 91, size: 6 },
      { emoji: '❄️', ru: 'Снежинка', de: 'Schneeflocke', x: 82, y: 16, size: 7 },
    ],
  },
  {
    id: 'circus',
    title: { ru: 'Цирк', de: 'Zirkus' },
    grow: { ru: 'Твой цирк растёт.', de: 'Dein Zirkus wächst.' },
    sky: 'linear-gradient(180deg, #e9d8ff 0%, #ffd6ea 100%)',
    ground: 'linear-gradient(180deg, #ffd36e, #f2b13c)',
    items: [
      { emoji: '🎪', ru: 'Цирковой шатёр', de: 'Zirkuszelt', x: 50, y: 44, size: 22 },
      { emoji: '🤡', ru: 'Клоун', de: 'Clown', x: 22, y: 70, size: 10 },
      { emoji: '🤹', ru: 'Жонглёр', de: 'Jongleur', x: 80, y: 72, size: 10 },
      { emoji: '🎈', ru: 'Воздушные шарики', de: 'Luftballons', x: 30, y: 18, size: 8 },
      { emoji: '🎠', ru: 'Карусель', de: 'Karussell', x: 87, y: 46, size: 10 },
      { emoji: '🎡', ru: 'Колесо обозрения', de: 'Riesenrad', x: 14, y: 44, size: 11 },
      { emoji: '🎆', ru: 'Салют', de: 'Feuerwerk', x: 70, y: 14, size: 9 },
      { emoji: '🎭', ru: 'Маски', de: 'Masken', x: 38, y: 92, size: 6 },
      { emoji: '🎩', ru: 'Шляпа фокусника', de: 'Zauberhut', x: 68, y: 90, size: 6 },
      { emoji: '🐴', ru: 'Цирковая лошадка', de: 'Zirkuspferd', x: 58, y: 74, size: 9 },
      { emoji: '🍿', ru: 'Попкорн', de: 'Popcorn', x: 91, y: 88, size: 6 },
      { emoji: '🐻', ru: 'Цирковой медведь', de: 'Zirkusbär', x: 36, y: 72, size: 9 },
    ],
  },
  {
    id: 'space',
    title: { ru: 'Космос', de: 'Weltraum' },
    grow: { ru: 'Твой космос растёт.', de: 'Dein Weltraum wächst.' },
    sky: 'linear-gradient(180deg, #3a3f8f 0%, #6a4aa6 55%, #a77bd0 100%)',
    ground: 'linear-gradient(180deg, #e3e5f0, #b7bcd3)',
    items: [
      { emoji: '🚀', ru: 'Ракета', de: 'Rakete', x: 30, y: 50, size: 15 },
      { emoji: '🪐', ru: 'Планета с кольцами', de: 'Ringplanet', x: 72, y: 24, size: 14 },
      { emoji: '🌕', ru: 'Луна', de: 'Vollmond', x: 90, y: 10, size: 9 },
      { emoji: '👩‍🚀', ru: 'Космонавтка', de: 'Astronautin', x: 58, y: 74, size: 11 },
      { emoji: '👽', ru: 'Инопланетянин', de: 'Außerirdischer', x: 84, y: 80, size: 9 },
      { emoji: '🛸', ru: 'Летающая тарелка', de: 'Ufo', x: 44, y: 20, size: 9 },
      { emoji: '🌠', ru: 'Падающая звезда', de: 'Sternschnuppe', x: 70, y: 52, size: 7 },
      { emoji: '☄️', ru: 'Комета', de: 'Komet', x: 12, y: 14, size: 8 },
      { emoji: '🌍', ru: 'Земля', de: 'Erde', x: 10, y: 40, size: 9 },
      { emoji: '🛰️', ru: 'Спутник', de: 'Satellit', x: 50, y: 44, size: 7 },
      { emoji: '🔭', ru: 'Телескоп', de: 'Teleskop', x: 20, y: 86, size: 8 },
      { emoji: '☀️', ru: 'Солнце', de: 'Sonne', x: 92, y: 36, size: 8 },
    ],
  },
];

export const WORLD_SIZE = 12;
export const TOTAL_SUPERS = WORLDS.length * WORLD_SIZE;

// Сколько предметов получено в мире с номером w, если всего супер-наклеек n.
export function worldProgress(n, w) {
  return Math.max(0, Math.min(WORLD_SIZE, n - w * WORLD_SIZE));
}
