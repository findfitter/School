// Собаки — награда за косточки (🦴). Косточки даются за особое сложное задание (схема появления — позже).
// Здесь: цены, породы, цвета, имена, возраст и рисунок собаки (SVG собирается кодом, внешних картинок нет).
// ПРОТОТИП: цены второй и третьей собаки — временные, как и всё, что помечено «прототип».

export const DOG_PRICES = [3, 5, 8]; // первая собака — 3 косточки; остальные цены пока придуманы
export const MAX_DOGS = DOG_PRICES.length;
export const MAX_AGE = 15;

export const dogPrice = (ownedCount) => (ownedCount < MAX_DOGS ? DOG_PRICES[ownedCount] : null);

export const BREEDS = [
  { id: 'labrador', name: 'Лабрадор' },
  { id: 'shepherd', name: 'Овчарка' },
  { id: 'poodle', name: 'Пудель' },
  { id: 'dachshund', name: 'Такса' },
  { id: 'husky', name: 'Хаски' },
];

export const COLORS = [
  { id: 'ginger', name: 'Рыжий', hex: '#d98324' },
  { id: 'gold', name: 'Золотистый', hex: '#e9c46a' },
  { id: 'cream', name: 'Кремовый', hex: '#f0d9b5' },
  { id: 'brown', name: 'Шоколадный', hex: '#7a4a2a' },
  { id: 'black', name: 'Чёрный', hex: '#34312f' },
  { id: 'grey', name: 'Серый', hex: '#9ba3ab' },
  { id: 'white', name: 'Белый', hex: '#f6f1e7' },
  { id: 'pink', name: 'Розовый', hex: '#f4a6c8' },
  { id: 'blue', name: 'Голубой', hex: '#7db7f0' },
];

export const NAMES = ['Бобик', 'Рекс', 'Лаки', 'Шарик', 'Тоша', 'Белка', 'Мася', 'Луна', 'Рыжик', 'Снежок'];
export const NAME_MAX = 12;

export const breedById = new Map(BREEDS.map((b) => [b.id, b]));
export const colorById = new Map(COLORS.map((c) => [c.id, c]));

// «0 — щенок», «1 год», «2 года», «5 лет».
export function ageLabel(age) {
  if (age <= 0) return 'щенок';
  const last = age % 10;
  const tens = age % 100;
  if (tens >= 11 && tens <= 14) return `${age} лет`;
  if (last === 1) return `${age} год`;
  if (last >= 2 && last <= 4) return `${age} года`;
  return `${age} лет`;
}

// Проверка собаки из сохранения: только известные породы и цвета, имя без лишнего.
export function cleanDog(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!breedById.has(raw.breed) || !colorById.has(raw.color)) return null;
  const name = String(raw.name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!name) return null;
  const age = Math.round(Number(raw.age));
  return {
    id: typeof raw.id === 'string' ? raw.id : `dog-${Math.random().toString(36).slice(2, 8)}`,
    name,
    breed: raw.breed,
    color: raw.color,
    age: Number.isFinite(age) ? Math.min(MAX_AGE, Math.max(0, age)) : 1,
  };
}

// ---------- Рисунок собаки ----------
function mix(hex, other, t) {
  const a = hex.replace('#', '');
  const b = other.replace('#', '');
  const channel = (i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
}

const luminance = (hex) => {
  const v = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5);
};

// Рисунок: собака сидит лицом к ребёнку. Возраст: щенок (до года) — меньше и с большой головой,
// взрослая — обычная, пожилая (10+) — с седой мордочкой.
export function drawDog({ breed = 'labrador', color = 'ginger', age = 3 } = {}) {
  const base = (colorById.get(color) || COLORS[0]).hex;
  const pale = luminance(base) > 0.78;
  const dark = pale ? mix(base, '#000000', 0.14) : mix(base, '#000000', 0.26);
  const light = pale ? '#fffaf0' : mix(base, '#ffffff', 0.55);
  const muzzle = pale ? '#efe5d3' : mix(base, '#ffffff', 0.62);
  const ink = '#2b1b17';
  const edge = pale ? ' stroke="#d9cdb8" stroke-width="3"' : ''; // контур светлой собаки, чтобы не сливалась с фоном
  const puppy = age <= 1;
  const senior = age >= 10;
  const husky = breed === 'husky';
  const dachshund = breed === 'dachshund';
  const poodle = breed === 'poodle';
  const eye = husky ? '#4aa3e0' : ink;
  const eyeR = puppy ? 9 : 7;
  const bodyScale = puppy ? 0.8 : 1;
  const headScale = puppy ? 1.12 : 1;

  const tails = {
    labrador: `<path d="M166 232 Q206 220 200 176" stroke="${base}" stroke-width="20" stroke-linecap="round" fill="none"/>`,
    shepherd: `<path d="M166 232 Q214 224 204 172" stroke="${base}" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M204 190 Q210 176 204 172" stroke="${dark}" stroke-width="12" stroke-linecap="round" fill="none"/>`,
    poodle: `<path d="M166 232 Q196 218 192 190" stroke="${base}" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="192" cy="180" r="17" fill="${base}"/>`,
    dachshund: `<path d="M164 236 Q200 232 198 196" stroke="${base}" stroke-width="9" stroke-linecap="round" fill="none"/>`,
    husky: `<path d="M166 232 Q208 232 200 188 Q196 172 184 176" stroke="${base}" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M200 190 Q196 176 184 176" stroke="${light}" stroke-width="10" stroke-linecap="round" fill="none"/>`,
  }[breed];

  const bodyRy = dachshund ? 40 : poodle ? 44 : 48;
  const legTop = dachshund ? 226 : 212;
  const fluff = poodle
    ? [[84, 214, 17], [156, 214, 17], [120, 238, 17], [92, 238, 15], [148, 238, 15]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${base}"/>`).join('')
    : '';

  const ears = {
    labrador: `<ellipse cx="72" cy="120" rx="17" ry="37" transform="rotate(16 72 120)" fill="${dark}"/><ellipse cx="168" cy="120" rx="17" ry="37" transform="rotate(-16 168 120)" fill="${dark}"/>`,
    shepherd: `<polygon points="78,80 72,16 116,64" fill="${dark}"/><polygon points="162,80 168,16 124,64" fill="${dark}"/><polygon points="84,70 82,36 106,62" fill="${light}"/><polygon points="156,70 158,36 134,62" fill="${light}"/>`,
    poodle: `<circle cx="66" cy="126" r="27" fill="${base}"/><circle cx="174" cy="126" r="27" fill="${base}"/><circle cx="50" cy="140" r="14" fill="${base}"/><circle cx="190" cy="140" r="14" fill="${base}"/>`,
    dachshund: `<ellipse cx="70" cy="136" rx="18" ry="50" transform="rotate(8 70 136)" fill="${dark}"/><ellipse cx="170" cy="136" rx="18" ry="50" transform="rotate(-8 170 136)" fill="${dark}"/>`,
    husky: `<polygon points="80,78 80,24 118,62" fill="${dark}"/><polygon points="160,78 160,24 122,62" fill="${dark}"/><polygon points="86,68 88,40 106,62" fill="${light}"/><polygon points="154,68 152,40 134,62" fill="${light}"/>`,
  }[breed];

  const topKnot = poodle
    ? `<circle cx="120" cy="64" r="26" fill="${base}"/><circle cx="96" cy="74" r="16" fill="${base}"/><circle cx="144" cy="74" r="16" fill="${base}"/>`
    : '';

  const headShape = dachshund
    ? `<ellipse cx="120" cy="112" rx="44" ry="50" fill="${base}"${edge}/>`
    : `<circle cx="120" cy="112" r="${poodle ? 46 : 52}" fill="${base}"${edge}/>`;

  const mask = husky
    ? `<ellipse cx="120" cy="132" rx="42" ry="36" fill="#ffffff"/><path d="M120 62 L108 100 L132 100 Z" fill="#ffffff"/>`
    : '';

  const snout = dachshund
    ? { cy: 138, rx: 22, ry: 25 }
    : breed === 'shepherd'
      ? { cy: 136, rx: 24, ry: 24 }
      : poodle
        ? { cy: 132, rx: 22, ry: 18 }
        : { cy: 132, rx: 26, ry: 20 };

  const grey = senior
    ? `<circle cx="104" cy="138" r="6" fill="#e6e6e6" opacity="0.9"/><circle cx="136" cy="138" r="6" fill="#e6e6e6" opacity="0.9"/><circle cx="120" cy="146" r="5" fill="#e6e6e6" opacity="0.9"/><ellipse cx="98" cy="86" rx="9" ry="4" fill="#f4f4f4"/><ellipse cx="142" cy="86" rx="9" ry="4" fill="#f4f4f4"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 270" role="img" aria-hidden="true">
  <ellipse cx="120" cy="258" rx="70" ry="9" fill="rgba(0,0,0,0.12)"/>
  <g transform="translate(120 256) scale(${bodyScale}) translate(-120 -256)">
    ${tails}
    <ellipse cx="120" cy="204" rx="54" ry="${bodyRy}" fill="${base}"${edge}/>
    ${fluff}
    <ellipse cx="120" cy="212" rx="28" ry="${bodyRy - 12}" fill="${husky ? '#ffffff' : light}"/>
    <rect x="86" y="${legTop}" width="24" height="${256 - legTop}" rx="12" fill="${base}"${edge}/>
    <rect x="130" y="${legTop}" width="24" height="${256 - legTop}" rx="12" fill="${base}"${edge}/>
    <ellipse cx="98" cy="254" rx="16" ry="8" fill="${light}"/>
    <ellipse cx="142" cy="254" rx="16" ry="8" fill="${light}"/>
    <g transform="translate(120 112) scale(${headScale}) translate(-120 -112)">
      ${ears}
      ${headShape}
      ${topKnot}
      ${mask}
      <ellipse cx="120" cy="${snout.cy}" rx="${snout.rx}" ry="${snout.ry}" fill="${muzzle}"/>
      ${grey}
      <ellipse cx="120" cy="${snout.cy - 10}" rx="10" ry="7" fill="${ink}"/>
      <path d="M120 ${snout.cy - 4} L120 ${snout.cy + 6} M120 ${snout.cy + 6} Q108 ${snout.cy + 16} 98 ${snout.cy + 8} M120 ${snout.cy + 6} Q132 ${snout.cy + 16} 142 ${snout.cy + 8}" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <ellipse cx="120" cy="${snout.cy + 16}" rx="8" ry="10" fill="#ff8fa3"/>
      <circle cx="96" cy="102" r="${eyeR}" fill="${eye}"/>
      <circle cx="144" cy="102" r="${eyeR}" fill="${eye}"/>
      <circle cx="98.5" cy="99" r="2.6" fill="#ffffff"/>
      <circle cx="146.5" cy="99" r="2.6" fill="#ffffff"/>
      <ellipse cx="80" cy="126" rx="8" ry="5" fill="#ff8fa3" opacity="0.35"/>
      <ellipse cx="160" cy="126" rx="8" ry="5" fill="#ff8fa3" opacity="0.35"/>
    </g>
    <path d="M84 166 Q120 182 156 166 L158 178 Q120 196 82 178 Z" fill="#e5484d"/>
    <circle cx="120" cy="190" r="9" fill="#ffd23f" stroke="#e0a800" stroke-width="2"/>
  </g>
</svg>`;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = document.importNode(doc.documentElement, true);
  el.setAttribute('class', 'dog-art');
  return el;
}
