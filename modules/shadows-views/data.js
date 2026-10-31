// Данные модуля «Тени и вид сверху».
// SHADOW_GROUPS — картинки для теней (тень рисуется чёрным силуэтом эмодзи). Группы нужны, чтобы сложные уровни брали
// похожие картинки (все животные), а лёгкие — совсем разные (животное, машина, фрукт).
// SOLIDS — предметы с рисунком спереди (front) и сверху (top), оба в рамке 100×100. У каждого вида сверху свой topKey,
// чтобы два варианта на одном экране никогда не выглядели одинаково.

export const SHADOW_GROUPS = {
  animals: ['🐘', '🐢', '🐟', '🦆', '🐌', '🐇', '🦒', '🦋', '🐙', '🐻', '🦀', '🐊', '🦉', '🐧', '🐍', '🦈'],
  vehicles: ['🚗', '✈️', '🚲', '⛵', '🚀', '🚜', '🚌', '🚁'],
  fruits: ['🍎', '🍌', '🍍', '🍉', '🍒', '🍄', '🥕', '🍋'],
  things: ['🔑', '☂️', '👓', '🎸', '⌚', '🎈', '🔨', '✂️'],
};

export const SOLIDS = [
  {
    id: 'ball',
    topKey: 'circle',
    front: '<circle cx="50" cy="52" r="36" fill="#ef4444"/><ellipse cx="38" cy="38" rx="11" ry="7" fill="#fff" opacity="0.4" transform="rotate(-30 38 38)"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#ef4444"/><ellipse cx="38" cy="36" rx="12" ry="8" fill="#fff" opacity="0.35" transform="rotate(-30 38 36)"/>',
  },
  {
    id: 'cube',
    topKey: 'square',
    front: '<polygon points="50,16 82,32 50,48 18,32" fill="#93c5fd"/><polygon points="18,32 50,48 50,84 18,68" fill="#3b82f6"/><polygon points="50,48 82,32 82,68 50,84" fill="#1d4ed8"/>',
    top: '<rect x="20" y="20" width="60" height="60" rx="4" fill="#93c5fd" stroke="#1d4ed8" stroke-width="3"/>',
  },
  {
    id: 'can',
    topKey: 'ring',
    front: '<rect x="24" y="30" width="52" height="46" fill="#a3a3a3"/><ellipse cx="50" cy="76" rx="26" ry="9" fill="#a3a3a3"/><ellipse cx="50" cy="30" rx="26" ry="9" fill="#d4d4d4" stroke="#737373" stroke-width="2"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#d4d4d4" stroke="#737373" stroke-width="3"/><circle cx="50" cy="50" r="29" fill="none" stroke="#a3a3a3" stroke-width="3"/>',
  },
  {
    id: 'cone',
    topKey: 'dot',
    front: '<path d="M50 14 L78 74 A28 9 0 0 1 22 74 Z" fill="#fb923c"/><ellipse cx="50" cy="74" rx="28" ry="9" fill="#ea580c" opacity="0.5"/>',
    top: '<circle cx="50" cy="50" r="38" fill="#fb923c"/><circle cx="50" cy="50" r="22" fill="none" stroke="#ea580c" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="#7c2d12"/>',
  },
  {
    id: 'pyramid',
    topKey: 'cross',
    front: '<polygon points="50,14 20,66 50,84" fill="#fcd34d"/><polygon points="50,14 50,84 82,62" fill="#f59e0b"/>',
    top: '<rect x="16" y="16" width="68" height="68" fill="#fcd34d" stroke="#b45309" stroke-width="3"/><line x1="16" y1="16" x2="84" y2="84" stroke="#b45309" stroke-width="3"/><line x1="84" y1="16" x2="16" y2="84" stroke="#b45309" stroke-width="3"/>',
  },
  {
    id: 'mug',
    topKey: 'mug',
    front: '<rect x="26" y="30" width="44" height="48" rx="6" fill="#f87171"/><ellipse cx="48" cy="30" rx="22" ry="7" fill="#7f1d1d"/><path d="M70 42 h6 a10 10 0 0 1 0 20 h-6" fill="none" stroke="#f87171" stroke-width="7"/>',
    top: '<circle cx="44" cy="50" r="30" fill="#f87171"/><circle cx="44" cy="50" r="22" fill="#7f1d1d"/><circle cx="82" cy="50" r="9" fill="none" stroke="#f87171" stroke-width="7"/>',
  },
  {
    id: 'house',
    topKey: 'roof',
    front: '<rect x="22" y="48" width="56" height="36" fill="#fde68a"/><polygon points="14,48 50,18 86,48" fill="#dc2626"/><rect x="44" y="62" width="12" height="22" fill="#92400e"/>',
    top: '<rect x="10" y="24" width="80" height="26" fill="#dc2626"/><rect x="10" y="50" width="80" height="26" fill="#ef4444"/><line x1="10" y1="50" x2="90" y2="50" stroke="#7f1d1d" stroke-width="3"/>',
  },
];

// Видов предметов, которые не спутать между собой (лёгкий уровень вида сверху).
export const EASY_TOPS = ['ball', 'cube', 'house', 'pyramid'];
