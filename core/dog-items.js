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
  { id: 'collar-blue', kind: 'outfit', slot: 'collar', icon: '🔵', title: 'Синий ошейник', price: 1, fill: '#3b82f6' },
  { id: 'collar-green', kind: 'outfit', slot: 'collar', icon: '🟢', title: 'Зелёный ошейник', price: 1, fill: '#3fb06a' },
  { id: 'collar-pink', kind: 'outfit', slot: 'collar', icon: '🩷', title: 'Розовый ошейник', price: 1, fill: '#f472b6' },
  { id: 'collar-gold', kind: 'outfit', slot: 'collar', icon: '🟡', title: 'Золотой ошейник', price: 3, fill: '#f2c230' },
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

// ---------- Рисунок наряда на собаке (части SVG; координаты головы собаки в drawDog) ----------
const INK = '#2b1b17';

export function outfitSvg(outfit = {}) {
  const hat = {
    cap: `<path d="M84 74 Q120 26 156 74 Z" fill="#4f8cff"/><rect x="82" y="70" width="76" height="9" rx="4" fill="#2f6be0"/><path d="M148 74 Q180 70 184 82 L148 82 Z" fill="#2f6be0"/><circle cx="120" cy="34" r="5" fill="#ffd23f"/>`,
    party: `<polygon points="120,8 90,74 150,74" fill="#ff6fb1"/><circle cx="108" cy="52" r="5" fill="#ffd23f"/><circle cx="128" cy="40" r="4" fill="#4f8cff"/><circle cx="124" cy="62" r="5" fill="#fff"/><circle cx="120" cy="8" r="7" fill="#ffd23f"/>`,
    tophat: `<rect x="92" y="30" width="56" height="44" rx="4" fill="#2b2d42"/><rect x="80" y="70" width="80" height="10" rx="5" fill="#2b2d42"/><rect x="92" y="58" width="56" height="9" fill="#e5484d"/>`,
    crown: `<path d="M86 74 L90 36 L106 54 L120 28 L134 54 L150 36 L154 74 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/><circle cx="120" cy="52" r="5" fill="#e5484d"/><circle cx="100" cy="62" r="4" fill="#4f8cff"/><circle cx="140" cy="62" r="4" fill="#3fb06a"/>`,
  }[outfit.hat] || '';

  const glasses = {
    round: `<circle cx="96" cy="102" r="16" fill="rgba(255,255,255,0.35)" stroke="${INK}" stroke-width="4"/><circle cx="144" cy="102" r="16" fill="rgba(255,255,255,0.35)" stroke="${INK}" stroke-width="4"/><path d="M112 102 L128 102" stroke="${INK}" stroke-width="4"/>`,
    sun: `<rect x="78" y="90" width="36" height="24" rx="10" fill="#1f2230"/><rect x="126" y="90" width="36" height="24" rx="10" fill="#1f2230"/><path d="M114 98 L126 98" stroke="#1f2230" stroke-width="4"/><path d="M84 96 L96 94" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,
    heart: `<path d="M96 116 C76 104 76 88 88 88 C93 88 96 92 96 95 C96 92 99 88 104 88 C116 88 116 104 96 116 Z" fill="#f43f7e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M144 116 C124 104 124 88 136 88 C141 88 144 92 144 95 C144 92 147 88 152 88 C164 88 164 104 144 116 Z" fill="#f43f7e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M110 98 L130 98" stroke="${INK}" stroke-width="3"/>`,
  }[outfit.glasses] || '';

  // Украшения: бантик, шарф, медаль у шеи (вне головы), цветок у уха (на голове).
  const headExtra = outfit.extra === 'flower'
    ? `<g transform="translate(76 84)"><circle cx="0" cy="-9" r="7" fill="#f9a8d4"/><circle cx="9" cy="0" r="7" fill="#f9a8d4"/><circle cx="0" cy="9" r="7" fill="#f9a8d4"/><circle cx="-9" cy="0" r="7" fill="#f9a8d4"/><circle cx="0" cy="0" r="5" fill="#ffd23f"/></g>`
    : '';
  const neckExtra = {
    bow: `<polygon points="120,180 92,168 92,192" fill="#e5484d"/><polygon points="120,180 148,168 148,192" fill="#e5484d"/><circle cx="120" cy="180" r="7" fill="#b91c1c"/>`,
    scarf: `<path d="M80 168 Q120 192 160 168 L160 182 Q120 206 80 182 Z" fill="#3b82f6"/><path d="M80 172 Q120 196 160 172" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="8 8"/><rect x="138" y="184" width="16" height="34" rx="6" fill="#3b82f6"/>`,
    medal: `<path d="M104 176 L120 204 L136 176" stroke="#ef4444" stroke-width="7" fill="none"/><circle cx="120" cy="208" r="12" fill="#ffd23f" stroke="#e0a800" stroke-width="3"/><text x="120" y="213" text-anchor="middle" font-size="14" font-weight="700" fill="#b45309">1</text>`,
  }[outfit.extra] || '';

  const collarItem = itemById.get(outfit.collar);
  return { hat, glasses, headExtra, neckExtra, collar: collarItem?.fill || '#e5484d' };
}
