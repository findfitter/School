// Звёзды за серию и стикеры за накопленные звёзды.

export const STARS_PER_STICKER = 5;

export const STICKERS = [
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐸', '🐵', '🐧', '🦉', '🦋', '🐢', '🐙', '🐬',
  '🦄', '🐝', '🐞', '🐳', '🦖', '🚀', '🌈', '🍓',
];

// 1–3 звезды по доле верных ответов с первой попытки.
export function starsFor(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

// Супер-наклейки — сказка, которую девочка собирает для себя. Каждая получает своё место на сцене
// (x, y — центр в % от сцены, size — размер в % ширины сцены) и название на двух языках.
export const SUPER_STICKERS = [
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
];

export function unlockedCount(stars) {
  return Math.min(STICKERS.length, Math.floor(stars / STARS_PER_STICKER));
}

// Сколько звёзд осталось до следующей наклейки (0, если всё собрано).
export function starsToNext(stars) {
  if (unlockedCount(stars) >= STICKERS.length) return 0;
  return STARS_PER_STICKER - (stars % STARS_PER_STICKER);
}
