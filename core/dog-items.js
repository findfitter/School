// Каталог наряда и обстановки для собаки. Покупается за косточки, надевается и расставляется бесплатно.
// Наряд (outfit) рисуется на самой собаке в drawDog (SVG), обстановка (decor) стоит во дворе.

export const SLOT_GROUPS = {
  outfit: [
    { id: 'hat', icon: '🎩', title: 'Шапки' },
    { id: 'glasses', icon: '🕶️', title: 'Очки' },
    { id: 'collar', icon: '📿', title: 'Ошейник' },
    { id: 'extra', icon: '🎀', title: 'Украшения' },
  ],
  decor: [
    { id: 'house', icon: '🏠', title: 'Дом' },
    { id: 'bed', icon: '🛏️', title: 'Лежанка' },
    { id: 'toy', icon: '🧸', title: 'Игрушки' },
    { id: 'plant', icon: '🌷', title: 'Растения' },
    { id: 'fun', icon: '⛲', title: 'Затеи' },
  ],
};

// Чем дороже, тем смешнее. price — в косточках.
export const ITEMS = [
  // шапки
  { id: 'cap', kind: 'outfit', slot: 'hat', icon: '🧢', title: 'Кепка', price: 1 },
  { id: 'party', kind: 'outfit', slot: 'hat', icon: '🥳', title: 'Праздничный колпак', price: 1 },
  { id: 'tophat', kind: 'outfit', slot: 'hat', icon: '🎩', title: 'Цилиндр', price: 2 },
  { id: 'crown', kind: 'outfit', slot: 'hat', icon: '👑', title: 'Корона', price: 4 },
  // очки
  { id: 'round', kind: 'outfit', slot: 'glasses', icon: '👓', title: 'Круглые очки', price: 1 },
  { id: 'sun', kind: 'outfit', slot: 'glasses', icon: '🕶️', title: 'Тёмные очки', price: 2 },
  { id: 'heart', kind: 'outfit', slot: 'glasses', icon: '😍', title: 'Очки-сердечки', price: 2 },
  // ошейники (красный у собаки с самого начала)
  { id: 'collar-blue', kind: 'outfit', slot: 'collar', icon: '🔵', title: 'Синий ошейник', price: 1, colors: ['#5B97F5', '#2F6AD0'] },
  { id: 'collar-green', kind: 'outfit', slot: 'collar', icon: '🟢', title: 'Зелёный ошейник', price: 1, colors: ['#5CC584', '#2E8E54'] },
  { id: 'collar-pink', kind: 'outfit', slot: 'collar', icon: '🩷', title: 'Розовый ошейник', price: 1, colors: ['#F78DC3', '#D9559A'] },
  { id: 'collar-gold', kind: 'outfit', slot: 'collar', icon: '🟡', title: 'Золотой ошейник', price: 3, colors: ['#F7D35A', '#D4A20E'] },
  // украшения
  { id: 'bow', kind: 'outfit', slot: 'extra', icon: '🎀', title: 'Бантик', price: 1 },
  { id: 'scarf', kind: 'outfit', slot: 'extra', icon: '🧣', title: 'Шарф', price: 2 },
  { id: 'flower', kind: 'outfit', slot: 'extra', icon: '🌸', title: 'Цветок у уха', price: 1 },
  { id: 'medal', kind: 'outfit', slot: 'extra', icon: '🏅', title: 'Медаль', price: 3 },
  // дом
  { id: 'doghouse', kind: 'decor', slot: 'house', icon: '🏠', title: 'Будка', price: 3 },
  { id: 'tent', kind: 'decor', slot: 'house', icon: '⛺', title: 'Палатка', price: 2 },
  { id: 'castle', kind: 'decor', slot: 'house', icon: '🏰', title: 'Замок', price: 6 },
  // лежанка
  { id: 'cushion', kind: 'decor', slot: 'bed', icon: '🛏️', title: 'Лежанка', price: 2 },
  { id: 'sofa', kind: 'decor', slot: 'bed', icon: '🛋️', title: 'Диван', price: 3 },
  // игрушки
  { id: 'teddy', kind: 'decor', slot: 'toy', icon: '🧸', title: 'Мишка', price: 1 },
  { id: 'balloon', kind: 'decor', slot: 'toy', icon: '🎈', title: 'Шарик', price: 1 },
  { id: 'bone-toy', kind: 'decor', slot: 'toy', icon: '🦴', title: 'Большая кость', price: 2 },
  // растения
  { id: 'tulips', kind: 'decor', slot: 'plant', icon: '🌷', title: 'Тюльпаны', price: 1 },
  { id: 'pot', kind: 'decor', slot: 'plant', icon: '🪴', title: 'Цветок в горшке', price: 1 },
  { id: 'sunflower', kind: 'decor', slot: 'plant', icon: '🌻', title: 'Подсолнух', price: 2 },
  { id: 'tree', kind: 'decor', slot: 'plant', icon: '🌳', title: 'Дерево', price: 3 },
  // затеи
  { id: 'kite', kind: 'decor', slot: 'fun', icon: '🪁', title: 'Воздушный змей', price: 2 },
  { id: 'fountain', kind: 'decor', slot: 'fun', icon: '⛲', title: 'Фонтан', price: 4 },
  { id: 'circus', kind: 'decor', slot: 'fun', icon: '🎪', title: 'Цирк', price: 5 },
];
export const itemById = new Map(ITEMS.map((i) => [i.id, i]));

export const OUTFIT_SLOTS = SLOT_GROUPS.outfit.map((s) => s.id);
export const DECOR_SLOTS = SLOT_GROUPS.decor.map((s) => s.id);

// Только известные предметы своего места: { hat, glasses, collar, extra } -> { hat: 'cap', … } ('' — ничего).
export function cleanOutfit(raw = {}) {
  const out = {};
  for (const slot of OUTFIT_SLOTS) {
    const item = itemById.get(raw?.[slot]);
    out[slot] = item && item.kind === 'outfit' && item.slot === slot ? item.id : '';
  }
  return out;
}

export function cleanDecor(raw = {}) {
  const out = {};
  for (const slot of DECOR_SLOTS) {
    const item = itemById.get(raw?.[slot]);
    out[slot] = item && item.kind === 'decor' && item.slot === slot ? item.id : '';
  }
  return out;
}

// ---------- Рисунок наряда на собаке (design/sketch/Pup.dc.html) ----------
// Координаты — системы эскиза 300×340, в которой нарисована собака (core/dogs.js, drawDog).

// Цвета ошейника по умолчанию (красно-розовый) — пока ничего не надето в слоте collar.
const COLLAR_DEFAULT = ['#E46A7E', '#B33E56'];

// Сдвиг шапок по породе: у пуделя кудрявая макушка выше, у уиппета голова ниже.
const HAT_SHIFT = { poodle: -24, whippet: 6 };

// Части наряда для drawDog. u — префикс id градиентов собаки (нужен медали: золото жетона); breed — порода.
//   collar — цвета ошейника; tag — рисовать ли жетон (шарф и медаль прячут его);
//   neck — шарф или медаль (рисуются под подбородком, до головы);
//   glasses, hat — на голове (шапка сдвигается по породе); top — бантик или цветок у уха, поверх шапки.
export function outfitSvg(outfit = {}, { breed = 'labrador', u = '' } = {}) {
  const collarItem = itemById.get(outfit.collar);
  const collar = collarItem?.colors || COLLAR_DEFAULT;

  const glasses = {
    round: `<circle cx="127" cy="104" r="18" fill="#DDF0FF" fill-opacity="0.22" stroke="#3B2F2F" stroke-width="3.5"/><circle cx="173" cy="104" r="18" fill="#DDF0FF" fill-opacity="0.22" stroke="#3B2F2F" stroke-width="3.5"/><path d="M145 101 Q150 95 155 101 M109 100 L94 94 M191 100 L206 94" stroke="#3B2F2F" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    sun: `<rect x="105" y="91" width="42" height="27" rx="11" fill="#2B2633"/><rect x="153" y="91" width="42" height="27" rx="11" fill="#2B2633"/><path d="M147 100 h6 M105 98 L92 92 M195 98 L208 92" stroke="#2B2633" stroke-width="4" stroke-linecap="round"/><path d="M112 98 h11 M160 98 h11" stroke="#FFFFFF" stroke-width="2.5" opacity="0.45" stroke-linecap="round"/>`,
    heart: `<path transform="translate(127 93)" d="M0 7 C0 -6 -19 -8 -19 5 C-19 15 -6 21 0 27 C6 21 19 15 19 5 C19 -8 0 -6 0 7 Z" fill="#E5577A" fill-opacity="0.88" stroke="#B8304F" stroke-width="2"/><path transform="translate(173 93)" d="M0 7 C0 -6 -19 -8 -19 5 C-19 15 -6 21 0 27 C6 21 19 15 19 5 C19 -8 0 -6 0 7 Z" fill="#E5577A" fill-opacity="0.88" stroke="#B8304F" stroke-width="2"/><path d="M145 101 Q150 96 155 101" stroke="#B8304F" stroke-width="3" fill="none"/><path d="M118 98 q4 -4 8 -2 M164 98 q4 -4 8 -2" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>`,
  }[outfit.glasses] || '';

  const hatArt = {
    cap: `<path d="M102 64 C100 24 200 24 198 64 Z" fill="#4372B8"/><path d="M150 28 V62" stroke="#2F5A9A" stroke-width="2" opacity="0.6"/><circle cx="150" cy="28" r="5" fill="#2F5A9A"/><path d="M96 62 Q150 82 204 62 L208 72 Q150 98 92 72 Z" fill="#2F5A9A"/>`,
    party: `<g transform="rotate(12 150 56)"><path d="M118 56 L150 -14 L182 56 Z" fill="#F4C34E"/><g fill="#E0604E"><circle cx="141" cy="40" r="4.5"/><circle cx="161" cy="30" r="4.5"/><circle cx="150" cy="10" r="4"/><circle cx="163" cy="48" r="4.5"/><circle cx="134" cy="52" r="3.5"/></g><circle cx="150" cy="-16" r="10" fill="#E58AA0"/><ellipse cx="150" cy="56" rx="34" ry="6" fill="#E0A800"/></g>`,
    tophat: `<rect x="116" y="-6" width="68" height="58" rx="6" fill="#2E2A3A"/><rect x="116" y="34" width="68" height="10" fill="#B8485F"/><path d="M126 2 v26" stroke="#FFFFFF" stroke-width="3" opacity="0.22" stroke-linecap="round"/><ellipse cx="150" cy="54" rx="58" ry="10" fill="#211E2A"/>`,
    crown: `<path d="M110 60 L108 22 L128 40 L140 10 L150 34 L160 10 L172 40 L192 22 L190 60 Z" fill="#F2C230" stroke="#C99400" stroke-width="2" stroke-linejoin="round"/><rect x="110" y="50" width="80" height="10" fill="#E0A800"/><circle cx="150" cy="44" r="5.5" fill="#E0604E"/><circle cx="128" cy="47" r="4" fill="#7FB3D5"/><circle cx="172" cy="47" r="4" fill="#8CCB98"/><g fill="#FFF6D6"><circle cx="140" cy="10" r="3.5"/><circle cx="160" cy="10" r="3.5"/><circle cx="108" cy="22" r="3"/><circle cx="192" cy="22" r="3"/></g>`,
  }[outfit.hat] || '';
  const hat = hatArt ? `<g transform="translate(0 ${HAT_SHIFT[breed] || 0})">${hatArt}</g>` : '';

  // Бантик и цветок — поверх шапки.
  const top = {
    bow: `<path d="M198 58 L174 42 L176 72 Z" fill="#E58AA0"/><path d="M198 58 L222 42 L220 72 Z" fill="#E58AA0"/><circle cx="198" cy="58" r="8" fill="#C9506E"/>`,
    flower: `<g transform="translate(98 70)"><g fill="#F2B5C3"><circle cx="0" cy="-10" r="8"/><circle cx="10" cy="-3" r="8"/><circle cx="6" cy="9" r="8"/><circle cx="-6" cy="9" r="8"/><circle cx="-10" cy="-3" r="8"/></g><circle cx="0" cy="0" r="6" fill="#F4C34E"/><ellipse cx="14" cy="14" rx="8" ry="3.5" transform="rotate(35 14 14)" fill="#6BAE5E"/></g>`,
  }[outfit.extra] || '';

  const neck = {
    scarf: `<path d="M100 164 C126 194 174 194 200 164 L206 186 C174 216 126 216 94 186 Z" fill="#E0604E"/><path d="M110 178 L118 198 M130 186 L136 206 M150 188 L152 208 M170 186 L166 206 M190 178 L182 198" stroke="#FFFDF6" stroke-width="4.5" opacity="0.75"/><path d="M164 194 L184 256 L162 262 L152 198 Z" fill="#E86A55"/><path d="M168 256 l2 11 M174 254 l3 11 M180 252 l3 10" stroke="#C94A3A" stroke-width="2.5" stroke-linecap="round"/>`,
    medal: `<path d="M138 192 L150 224 L162 192" stroke="#4372B8" stroke-width="9" stroke-linejoin="round" fill="none"/><circle cx="150" cy="236" r="15" fill="url(#${u}g)" stroke="#C99400" stroke-width="2.5"/><path transform="translate(150 236)" d="M0 -8 l2.4 5 5.6 .7 -4 3.8 1.1 5.5 -5.1 -2.8 -5.1 2.8 1.1 -5.5 -4 -3.8 5.6 -.7 z" fill="#FFF6D6"/>`,
  }[outfit.extra] || '';

  return { collar, tag: outfit.extra !== 'medal' && outfit.extra !== 'scarf', neck, glasses, hat, top };
}
