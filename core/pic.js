// Картинки вместо эмодзи (ветка art, design/ai-art.md). Таблица images/index.json: { раздел: { эмодзи: путь } },
// раздел «sticker» — наклейки с каймой и тенью, «super» — супер-наклейки с золотым ободком (ключ «мир:эмодзи»: одно
// эмодзи в разных мирах нарисовано по-разному, ✨ в «Моей сказке» — искры, в «Волшебном лесу» — светлячки). Картинки нет — остаётся
// эмодзи, поэтому новое слово или наклейка из main просто показываются как раньше.
//
//   await loadPics();                       // один раз при старте (core/main.js)
//   picUrl('🐹', 'sticker')                 // 'images/stickers/1f439.webp' или null
//   picUrl('🦄', ['super:fairy', 'sticker']) // первый раздел, где картинка есть; «super:fairy» — ключ «fairy:🦄»
//   picOrEmoji('🐹', 'sticker', 'класс')    // <img class="pic класс"> или <span class="класс">🐹</span>

import { h } from './dom.js';

const INDEX = 'images/index.json';
let table = {};

const bare = (emoji) => String(emoji).replace(/\uFE0F/g, '');

export async function loadPics() {
  try {
    const res = await fetch(INDEX);
    if (res.ok) table = await res.json();
  } catch {
    table = {}; // нет таблицы (или офлайн без кэша) — везде эмодзи
  }
}

export function picUrl(emoji, kind = 'sticker') {
  if (!emoji) return null;
  for (const k of [kind].flat()) {
    const [name, prefix] = k.split(':');
    const section = table[name];
    const key = prefix ? `${prefix}:` : '';
    const path = section && (section[key + emoji] ?? section[key + bare(emoji)]);
    if (path) return `images/${path}`;
  }
  return null;
}

// Все пути картинок — чтобы service worker положил их в офлайн-кэш (core/main.js → warmCache).
export function allPicUrls() {
  return Object.values(table).flatMap((section) => Object.values(section).map((p) => `images/${p}`));
}

export function picOrEmoji(emoji, kind, className = '', extra = {}) {
  const url = picUrl(emoji, kind);
  if (!url) return h('span', { class: className, text: emoji, ...extra });
  return h('img', { class: `pic ${className}`.trim(), src: url, alt: emoji, decoding: 'async', ...extra });
}
